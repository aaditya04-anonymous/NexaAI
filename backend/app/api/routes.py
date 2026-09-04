from datetime import UTC, datetime
import logging
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from ..ai.graph import build_graph
from ..db.database import get_db
from ..repositories.base import UserOwnedRepository, serialize
from ..rag.service import ingest, search
from ..schemas.auth import ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest, TokenResponse
from ..schemas.common import ProfileUpdate, ResourceCreate, ResourceUpdate
from ..services.auth import AuthService
from .deps import current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/health")
async def health() -> dict: return {"status": "ok", "service": "nexa-api"}


@router.post("/auth/register", response_model=TokenResponse, status_code=201)
async def register(payload: RegisterRequest): return {"access_token": await AuthService(get_db()).register(payload.email, payload.password)}

@router.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest): return {"access_token": await AuthService(get_db()).login(payload.email, payload.password)}

@router.post("/auth/forgot-password", status_code=202)
async def forgot(payload: ForgotPasswordRequest) -> dict:
    await AuthService(get_db()).request_reset(payload.email)
    return {"message": "If the account exists, a reset email will be sent."}

@router.post("/auth/reset-password", status_code=204)
async def reset(payload: ResetPasswordRequest): await AuthService(get_db()).reset_password(payload.token, payload.password)

@router.post("/auth/change-password", status_code=204)
async def change(payload: ChangePasswordRequest, user: dict = Depends(current_user)):
    await AuthService(get_db()).change_password(user, payload.current_password, payload.new_password)

@router.get("/profile")
async def profile(user: dict = Depends(current_user)) -> dict:
    value = serialize(await get_db().profiles.find_one({"user_id": user["id"]}))
    return value or {}

@router.put("/profile")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(current_user)) -> dict:
    values = payload.model_dump(exclude_none=True)
    values["updated_at"] = datetime.now(UTC)
    await get_db().profiles.update_one({"user_id": user["id"]}, {"$set": values}, upsert=True)
    return await profile(user)


def resource_router(path: str, collection: str) -> APIRouter:
    resource = APIRouter(prefix=f"/{path}", tags=[path])
    @resource.get("")
    async def list_items(user: dict = Depends(current_user)): return await UserOwnedRepository(get_db(), collection).list(user["id"])
    @resource.post("", status_code=201)
    async def create_item(payload: ResourceCreate, user: dict = Depends(current_user)): return await UserOwnedRepository(get_db(), collection).create(user["id"], payload.model_dump())
    @resource.get("/{item_id}")
    async def get_item(item_id: str, user: dict = Depends(current_user)):
        value = await UserOwnedRepository(get_db(), collection).get(user["id"], item_id)
        if not value: raise HTTPException(404, "Resource not found")
        return value
    @resource.put("/{item_id}")
    async def update_item(item_id: str, payload: ResourceUpdate, user: dict = Depends(current_user)):
        value = await UserOwnedRepository(get_db(), collection).update(user["id"], item_id, payload.model_dump())
        if not value: raise HTTPException(404, "Resource not found")
        return value
    @resource.delete("/{item_id}", status_code=204)
    async def delete_item(item_id: str, user: dict = Depends(current_user)):
        if not await UserOwnedRepository(get_db(), collection).delete(user["id"], item_id): raise HTTPException(404, "Resource not found")
    return resource


for _path, _collection in (("goals", "goals"), ("tasks", "tasks"), ("memories", "memories"), ("recommendations", "recommendations"), ("automations", "automations")):
    router.include_router(resource_router(_path, _collection))


@router.get("/progress/summary")
async def progress_summary(user: dict = Depends(current_user)) -> dict:
    db = get_db(); uid = user["id"]; now = datetime.now(UTC)
    completed_tasks = await db.tasks.count_documents({"user_id": uid, "status": "completed"})
    active_goals = await db.goals.count_documents({"user_id": uid, "status": "active"})
    overdue = await db.tasks.count_documents({"user_id": uid, "target_date": {"$lt": now}, "status": {"$ne": "completed"}})
    return {"completed_tasks": completed_tasks, "active_goals": active_goals, "overdue_tasks": overdue, "generated_at": now}


@router.post("/chat")
async def chat(payload: dict, user: dict = Depends(current_user)) -> dict:
    message = str(payload.get("message", "")).strip()
    if not message or len(message) > 12000: raise HTTPException(422, "A message between 1 and 12000 characters is required")
    db = get_db(); profile_data = serialize(await db.profiles.find_one({"user_id": user["id"]})) or {}
    graph = build_graph()
    result = await graph.ainvoke({"user_id": user["id"], "message": message, "context": {"profile": profile_data}})
    conversation_id = payload.get("conversation_id")
    if not conversation_id or not ObjectId.is_valid(conversation_id):
        created = await UserOwnedRepository(db, "conversations").create(user["id"], {"title": message[:80]})
        conversation_id = created["id"]
    elif not await UserOwnedRepository(db, "conversations").get(user["id"], conversation_id):
        raise HTTPException(404, "Conversation not found")
    messages = UserOwnedRepository(db, "messages")
    await messages.create(user["id"], {"conversation_id": conversation_id, "role": "user", "content": message})
    await messages.create(user["id"], {"conversation_id": conversation_id, "role": "assistant", "content": result["response"], "sources": result.get("sources", [])})
    return {"conversation_id": conversation_id, "message": result["response"], "sources": result.get("sources", [])}


router.include_router(resource_router("conversations", "conversations"))

@router.get("/documents")
async def list_documents(user: dict = Depends(current_user)):
    return await UserOwnedRepository(get_db(), "documents").list(user["id"])

@router.post("/documents", status_code=201)
async def upload_document(file: UploadFile, user: dict = Depends(current_user)):
    return await ingest(get_db(), user["id"], file)

@router.get("/documents/search")
async def search_documents(query: str, document_id: str | None = None, user: dict = Depends(current_user)):
    return await search(get_db(), user["id"], query, document_id)

@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(document_id: str, user: dict = Depends(current_user)):
    document = await UserOwnedRepository(get_db(), "documents").get(user["id"], document_id)
    if not document: raise HTTPException(404, "Document not found")
    await UserOwnedRepository(get_db(), "documents").delete(user["id"], document_id)
    await get_db().document_chunks.delete_many({"user_id": user["id"], "document_id": document_id})
