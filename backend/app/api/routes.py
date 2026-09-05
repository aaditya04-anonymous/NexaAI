from datetime import UTC, datetime
import logging
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile
import httpx
from ..ai.graph import build_graph
from ..db.database import get_db
from ..repositories.base import UserOwnedRepository, serialize
from ..rag.service import ingest, search
from ..schemas.auth import ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest, TokenResponse
from ..schemas.common import ProfileUpdate, ResourceCreate, ResourceUpdate
from ..schemas.career import AssessmentSubmission, CareerProfileUpdate, ContextChatRequest, GoalCreate, GoalDiscussionRequest, GoalUpdate, MemoryUpdate, NotificationPreferenceUpdate, ProjectCreate, RoadmapUpdate, TaskCompletion
from ..services.career import build_roadmap, calculate_progress, discussion_reply, insight, plan_daily_tasks
from ..services.loop import build_assessment, build_learning, evaluate_assessment, extract_memories, recommendation, safe_news_query, weekly_report
from ..core.config import get_settings
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

@router.get("/users/me")
async def me(user: dict = Depends(current_user)) -> dict:
    return {"id": user["id"], "email": user["email"], "profile": await profile(user)}

@router.put("/users/me")
async def update_career_profile(payload: CareerProfileUpdate, user: dict = Depends(current_user)) -> dict:
    values = payload.model_dump(exclude_none=True, mode="json")
    values["updated_at"] = datetime.now(UTC)
    await get_db().profiles.update_one({"user_id": user["id"]}, {"$set": values}, upsert=True)
    return await me(user)


async def owned_goal(goal_id: str, user_id: str) -> dict:
    goal = await UserOwnedRepository(get_db(), "goals").get(user_id, goal_id)
    if not goal:
        raise HTTPException(404, "Goal not found")
    return goal


@router.post("/goals", status_code=201, tags=["goals"])
async def create_goal(payload: GoalCreate, user: dict = Depends(current_user)) -> dict:
    goal = await UserOwnedRepository(get_db(), "goals").create(user["id"], {**payload.model_dump(mode="json"), "status": "discovery", "roadmap_status": "not_started", "progress": 0})
    await UserOwnedRepository(get_db(), "goal_history").create(user["id"], {"goal_id": goal["id"], "event": "goal_created", "detail": "Goal created; discovery is required before roadmap finalization."})
    return goal


@router.get("/goals", tags=["goals"])
async def list_goals(user: dict = Depends(current_user)) -> list[dict]:
    return await UserOwnedRepository(get_db(), "goals").list(user["id"])


@router.get("/goals/{goal_id}", tags=["goals"])
async def get_goal(goal_id: str, user: dict = Depends(current_user)) -> dict:
    goal = await owned_goal(goal_id, user["id"])
    roadmap = await get_db().roadmaps.find_one({"user_id": user["id"], "goal_id": goal_id})
    if roadmap:
        goal["roadmap"] = serialize(roadmap)
        goal["roadmap"]["phases"] = [serialize(value) async for value in get_db().roadmap_phases.find({"user_id": user["id"], "roadmap_id": goal["roadmap"]["id"]}).sort("order", 1)]
    return goal


@router.put("/goals/{goal_id}", tags=["goals"])
async def update_goal(goal_id: str, payload: GoalUpdate, user: dict = Depends(current_user)) -> dict:
    goal = await UserOwnedRepository(get_db(), "goals").update(user["id"], goal_id, payload.model_dump(exclude_none=True, mode="json"))
    if not goal:
        raise HTTPException(404, "Goal not found")
    await UserOwnedRepository(get_db(), "goal_history").create(user["id"], {"goal_id": goal_id, "event": "goal_updated"})
    return goal


@router.post("/goals/{goal_id}/discuss", tags=["goals"])
async def discuss_goal(goal_id: str, payload: GoalDiscussionRequest, user: dict = Depends(current_user)) -> dict:
    await owned_goal(goal_id, user["id"])
    discussions = UserOwnedRepository(get_db(), "goal_discussions")
    prior = await discussions.list(user["id"])
    answers = [item for item in prior if item.get("goal_id") == goal_id]
    record = await discussions.create(user["id"], {"goal_id": goal_id, "role": "user", "message": payload.message})
    reply = discussion_reply(len(answers))
    await discussions.create(user["id"], {"goal_id": goal_id, "role": "assistant", "message": reply})
    return {"discussion": record, "reply": reply, "ready_for_draft": len(answers) + 1 >= 4}


@router.post("/goals/{goal_id}/roadmap/generate", status_code=201, tags=["roadmaps"])
async def generate_roadmap(goal_id: str, user: dict = Depends(current_user)) -> dict:
    goal = await owned_goal(goal_id, user["id"])
    profile_data = serialize(await get_db().profiles.find_one({"user_id": user["id"]})) or {}
    phases = build_roadmap(goal, profile_data)
    existing = await get_db().roadmaps.find_one({"user_id": user["id"], "goal_id": goal_id})
    if existing:
        await get_db().roadmap_phases.delete_many({"user_id": user["id"], "roadmap_id": str(existing["_id"])})
        await get_db().roadmaps.update_one({"_id": existing["_id"]}, {"$set": {"status": "draft", "updated_at": datetime.now(UTC)}})
        roadmap_id = str(existing["_id"])
    else:
        roadmap = await UserOwnedRepository(get_db(), "roadmaps").create(user["id"], {"goal_id": goal_id, "status": "draft", "version": 1})
        roadmap_id = roadmap["id"]
    repository = UserOwnedRepository(get_db(), "roadmap_phases")
    created = [await repository.create(user["id"], {**phase, "roadmap_id": roadmap_id, "goal_id": goal_id}) for phase in phases]
    await UserOwnedRepository(get_db(), "goals").update(user["id"], goal_id, {"status": "draft", "roadmap_status": "draft"})
    await UserOwnedRepository(get_db(), "roadmap_history").create(user["id"], {"goal_id": goal_id, "roadmap_id": roadmap_id, "event": "draft_generated"})
    return {"id": roadmap_id, "goal_id": goal_id, "status": "draft", "phases": created}


@router.put("/roadmaps/{roadmap_id}", tags=["roadmaps"])
async def edit_roadmap(roadmap_id: str, payload: RoadmapUpdate, user: dict = Depends(current_user)) -> dict:
    roadmap = await UserOwnedRepository(get_db(), "roadmaps").get(user["id"], roadmap_id)
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    await get_db().roadmap_phases.delete_many({"user_id": user["id"], "roadmap_id": roadmap_id})
    phases = [await UserOwnedRepository(get_db(), "roadmap_phases").create(user["id"], {**phase.model_dump(), "order": index, "status": "not_started", "roadmap_id": roadmap_id, "goal_id": roadmap["goal_id"]}) for index, phase in enumerate(payload.phases, 1)]
    await UserOwnedRepository(get_db(), "roadmap_history").create(user["id"], {"goal_id": roadmap["goal_id"], "roadmap_id": roadmap_id, "event": "roadmap_edited"})
    return {**roadmap, "phases": phases}


@router.post("/roadmaps/{roadmap_id}/finalize", tags=["roadmaps"])
async def finalize_roadmap(roadmap_id: str, user: dict = Depends(current_user)) -> dict:
    roadmap = await UserOwnedRepository(get_db(), "roadmaps").get(user["id"], roadmap_id)
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    updated = await UserOwnedRepository(get_db(), "roadmaps").update(user["id"], roadmap_id, {"status": "finalized", "finalized_at": datetime.now(UTC)})
    await UserOwnedRepository(get_db(), "goals").update(user["id"], roadmap["goal_id"], {"status": "active", "roadmap_status": "finalized"})
    return updated


@router.post("/tasks/generate-daily", status_code=201, tags=["tasks"])
async def generate_daily_tasks(user: dict = Depends(current_user)) -> list[dict]:
    db, uid = get_db(), user["id"]
    goal = await db.goals.find_one({"user_id": uid, "status": "active", "roadmap_status": "finalized"})
    if not goal:
        raise HTTPException(409, "Finalize a roadmap before generating daily tasks")
    roadmap = await db.roadmaps.find_one({"user_id": uid, "goal_id": str(goal["_id"]), "status": "finalized"})
    phase = await db.roadmap_phases.find_one({"user_id": uid, "roadmap_id": str(roadmap["_id"]), "status": {"$ne": "completed"}}, sort=[("order", 1)])
    if not phase:
        raise HTTPException(409, "No remaining roadmap phase")
    profile_data = serialize(await db.profiles.find_one({"user_id": uid})) or {}
    planned = plan_daily_tasks(serialize(phase), profile_data.get("preferred_learning_duration_minutes", 60), datetime.now(UTC).date())
    repository = UserOwnedRepository(db, "tasks")
    return [await repository.create(uid, {**task, "goal_id": str(goal["_id"]), "roadmap_phase_id": str(phase["_id"])}) for task in planned]


@router.get("/tasks/today", tags=["tasks"])
async def todays_tasks(user: dict = Depends(current_user)) -> list[dict]:
    today = datetime.now(UTC).date().isoformat()
    return [serialize(value) async for value in get_db().tasks.find({"user_id": user["id"], "due_date": today}).sort("created_at", 1)]


@router.post("/tasks/{task_id}/complete", tags=["tasks"])
async def complete_task(task_id: str, payload: TaskCompletion, user: dict = Depends(current_user)) -> dict:
    task = await UserOwnedRepository(get_db(), "tasks").get(user["id"], task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    status = "completed" if payload.completion_percentage == 100 else "in_progress"
    updated = await UserOwnedRepository(get_db(), "tasks").update(user["id"], task_id, {"status": status, "completion_percentage": payload.completion_percentage, "completed_at": datetime.now(UTC) if status == "completed" else None, "reflection": payload.reflection})
    await UserOwnedRepository(get_db(), "task_history").create(user["id"], {"task_id": task_id, "goal_id": task.get("goal_id"), "event": status, "completion_percentage": payload.completion_percentage})
    return updated


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


for _path, _collection in (("tasks", "tasks"), ("automations", "automations")):
    router.include_router(resource_router(_path, _collection))


@router.get("/progress/summary")
async def progress_summary(user: dict = Depends(current_user)) -> dict:
    db = get_db(); uid = user["id"]; now = datetime.now(UTC)
    tasks = [serialize(value) async for value in db.tasks.find({"user_id": uid})]
    phases = [serialize(value) async for value in db.roadmap_phases.find({"user_id": uid})]
    data = calculate_progress(tasks, phases)
    completed_tasks = sum(task.get("status") == "completed" for task in tasks)
    active_goals = await db.goals.count_documents({"user_id": uid, "status": "active"})
    overdue = sum(task.get("status") != "completed" and task.get("due_date", "") < now.date().isoformat() for task in tasks)
    return {**data, "completed_tasks": completed_tasks, "active_goals": active_goals, "overdue_tasks": overdue, "generated_at": now}


@router.get("/progress")
async def progress(user: dict = Depends(current_user)) -> dict:
    """Compatibility-friendly aggregate progress endpoint."""
    return await progress_summary(user)


@router.get("/dashboard")
async def dashboard(user: dict = Depends(current_user)) -> dict:
    db, uid = get_db(), user["id"]
    profile_data = serialize(await db.profiles.find_one({"user_id": uid})) or {}
    goal = serialize(await db.goals.find_one({"user_id": uid, "status": {"$in": ["active", "draft", "discovery"]}}, sort=[("updated_at", -1)]))
    tasks = await todays_tasks(user)
    phases = []
    current_phase = None
    if goal:
        roadmap = serialize(await db.roadmaps.find_one({"user_id": uid, "goal_id": goal["id"]}, sort=[("updated_at", -1)]))
        if roadmap:
            phases = [serialize(value) async for value in db.roadmap_phases.find({"user_id": uid, "roadmap_id": roadmap["id"]}).sort("order", 1)]
            current_phase = next((phase for phase in phases if phase.get("status") != "completed"), None)
    all_tasks = [serialize(value) async for value in db.tasks.find({"user_id": uid})]
    metrics = calculate_progress(all_tasks, phases)
    recommendation = serialize(await db.recommendations.find_one({"user_id": uid}, sort=[("created_at", -1)]))
    return {"career_snapshot": {"profession": profile_data.get("profession") or profile_data.get("career_field"), "target_profession": goal.get("target_role") if goal else profile_data.get("target_career"), "goal": goal, "current_phase": current_phase, "progress": metrics["goal_progress"]}, "today": {"tasks": tasks, "recommended_action": recommendation}, "ai_insight": insight(metrics, current_phase), "progress": metrics}


@router.post("/learning/generate/{task_id}", status_code=201, tags=["learning"])
async def generate_learning(task_id: str, user: dict = Depends(current_user)) -> dict:
    task = await UserOwnedRepository(get_db(), "tasks").get(user["id"], task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    existing = serialize(await get_db().learning_content.find_one({"user_id": user["id"], "task_id": task_id}))
    if existing:
        return existing
    lesson = build_learning(task)
    created = await UserOwnedRepository(get_db(), "learning_content").create(user["id"], lesson)
    await UserOwnedRepository(get_db(), "learning_history").create(user["id"], {"learning_id": created["id"], "task_id": task_id, "event": "generated"})
    return created


@router.get("/learning/today", tags=["learning"])
async def todays_learning(user: dict = Depends(current_user)) -> list[dict]:
    tasks = await todays_tasks(user)
    task_ids = [task["id"] for task in tasks]
    return [serialize(value) async for value in get_db().learning_content.find({"user_id": user["id"], "task_id": {"$in": task_ids}})]


@router.get("/learning/{learning_id}", tags=["learning"])
async def get_learning(learning_id: str, user: dict = Depends(current_user)) -> dict:
    lesson = await UserOwnedRepository(get_db(), "learning_content").get(user["id"], learning_id)
    if not lesson:
        raise HTTPException(404, "Learning content not found")
    return lesson


@router.post("/learning/{learning_id}/assessment", status_code=201, tags=["assessments"])
async def generate_assessment(learning_id: str, user: dict = Depends(current_user)) -> dict:
    lesson = await get_learning(learning_id, user)
    existing = serialize(await get_db().assessments.find_one({"user_id": user["id"], "learning_id": learning_id, "status": "available"}))
    if existing:
        return existing
    assessment = build_assessment(lesson)
    return await UserOwnedRepository(get_db(), "assessments").create(user["id"], assessment)


@router.post("/assessments/{assessment_id}/submit", tags=["assessments"])
async def submit_assessment(assessment_id: str, payload: AssessmentSubmission, user: dict = Depends(current_user)) -> dict:
    assessment = await UserOwnedRepository(get_db(), "assessments").get(user["id"], assessment_id)
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    evaluation = evaluate_assessment(assessment, payload.answers)
    attempt = await UserOwnedRepository(get_db(), "assessment_attempts").create(user["id"], {"assessment_id": assessment_id, "learning_id": assessment["learning_id"], "answers": payload.answers, **evaluation})
    await UserOwnedRepository(get_db(), "assessment_history").create(user["id"], {"assessment_id": assessment_id, **evaluation})
    if evaluation["outcome"] == "revise":
        await UserOwnedRepository(get_db(), "recommendations").create(user["id"], {"title": f"Revise {assessment['title']}", "description": evaluation["next_action"], "kind": "revision", "source": "assessment"})
    return attempt


@router.post("/learning/{learning_id}/chat", tags=["learning"])
async def learning_chat(learning_id: str, payload: ContextChatRequest, user: dict = Depends(current_user)) -> dict:
    lesson = await get_learning(learning_id, user)
    result = await chat({"message": payload.message, "conversation_id": payload.conversation_id, "context_type": "learning", "context_id": learning_id, "learning_topic": lesson["topic"]}, user)
    return result


@router.get("/recommendations", tags=["recommendations"])
async def list_recommendations(user: dict = Depends(current_user)) -> list[dict]:
    return await UserOwnedRepository(get_db(), "recommendations").list(user["id"])


@router.post("/recommendations/generate", status_code=201, tags=["recommendations"])
async def generate_recommendation(user: dict = Depends(current_user)) -> dict:
    db, uid = get_db(), user["id"]
    profile_data = serialize(await db.profiles.find_one({"user_id": uid})) or {}
    goal = serialize(await db.goals.find_one({"user_id": uid, "status": "active"}, sort=[("updated_at", -1)]))
    tasks = [serialize(value) async for value in db.tasks.find({"user_id": uid})]
    phases = [serialize(value) async for value in db.roadmap_phases.find({"user_id": uid})]
    metrics = calculate_progress(tasks, phases)
    weakness = serialize(await db.memories.find_one({"user_id": uid, "category": "weakness"}, sort=[("updated_at", -1)]))
    result = recommendation(profile_data, goal, metrics, weakness.get("content") if weakness else None)
    return await UserOwnedRepository(db, "recommendations").create(uid, {**result, "goal_id": goal["id"] if goal else None, "metrics": metrics})


@router.post("/memories/extract", status_code=201, tags=["memories"])
async def create_memories_from_text(payload: MemoryUpdate, user: dict = Depends(current_user)) -> list[dict]:
    profile_data = serialize(await get_db().profiles.find_one({"user_id": user["id"]})) or {}
    if profile_data.get("memory_enabled") is False:
        raise HTTPException(409, "Memory is disabled in profile settings")
    candidates = extract_memories(payload.content) or [{"category": payload.category, "content": payload.content, "source": "user", "confidence": "explicit"}]
    repo = UserOwnedRepository(get_db(), "memories")
    return [await repo.create(user["id"], item) for item in candidates]


@router.get("/memories", tags=["memories"])
async def list_memories(user: dict = Depends(current_user)) -> list[dict]:
    return await UserOwnedRepository(get_db(), "memories").list(user["id"])


@router.put("/memories/{memory_id}", tags=["memories"])
async def update_memory(memory_id: str, payload: MemoryUpdate, user: dict = Depends(current_user)) -> dict:
    value = await UserOwnedRepository(get_db(), "memories").update(user["id"], memory_id, payload.model_dump())
    if not value:
        raise HTTPException(404, "Memory not found")
    return value


@router.delete("/memories/{memory_id}", status_code=204, tags=["memories"])
async def delete_memory(memory_id: str, user: dict = Depends(current_user)) -> None:
    if not await UserOwnedRepository(get_db(), "memories").delete(user["id"], memory_id):
        raise HTTPException(404, "Memory not found")


@router.post("/projects", status_code=201, tags=["projects"])
async def create_project(payload: ProjectCreate, user: dict = Depends(current_user)) -> dict:
    values = payload.model_dump()
    values["status"] = "planned"
    values["milestones"] = [{"title": "Define outcome", "status": "not_started"}, {"title": "Build a working version", "status": "not_started"}, {"title": "Document and publish", "status": "not_started"}]
    return await UserOwnedRepository(get_db(), "projects").create(user["id"], values)


@router.get("/projects", tags=["projects"])
async def list_projects(user: dict = Depends(current_user)) -> list[dict]:
    return await UserOwnedRepository(get_db(), "projects").list(user["id"])


@router.put("/notifications/preferences", tags=["notifications"])
async def notification_preferences(payload: NotificationPreferenceUpdate, user: dict = Depends(current_user)) -> dict:
    values = {**payload.model_dump(mode="json"), "updated_at": datetime.now(UTC)}
    await get_db().user_preferences.update_one({"user_id": user["id"]}, {"$set": values, "$setOnInsert": {"created_at": datetime.now(UTC)}}, upsert=True)
    return serialize(await get_db().user_preferences.find_one({"user_id": user["id"]}))  # type: ignore[return-value]


@router.get("/notifications", tags=["notifications"])
async def list_notifications(user: dict = Depends(current_user)) -> list[dict]:
    return await UserOwnedRepository(get_db(), "notifications").list(user["id"])


@router.post("/news/generate", status_code=201, tags=["news"])
async def generate_news(user: dict = Depends(current_user)) -> dict:
    """Use a configured search provider; return verified prior information on failure, never invented news."""
    db, uid, settings = get_db(), user["id"], get_settings()
    profile_data = serialize(await db.profiles.find_one({"user_id": uid})) or {}
    goal = serialize(await db.goals.find_one({"user_id": uid, "status": "active"}, sort=[("updated_at", -1)]))
    query = safe_news_query(profile_data.get("profession"), goal.get("target_role") if goal else None)
    if not settings.tavily_api_key:
        prior = serialize(await db.news_articles.find_one({"user_id": uid, "status": "verified"}, sort=[("created_at", -1)]))
        return prior or {"status": "unavailable", "reason": "Current career research is not configured; no unverified news is shown.", "query": query, "items": []}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post("https://api.tavily.com/search", json={"api_key": settings.tavily_api_key, "query": query, "max_results": 10, "search_depth": "advanced"})
            response.raise_for_status()
            results = response.json().get("results", [])
    except httpx.HTTPError:
        prior = serialize(await db.news_articles.find_one({"user_id": uid, "status": "verified"}, sort=[("created_at", -1)]))
        return prior or {"status": "unavailable", "reason": "Career research is temporarily unavailable; no unverified news is shown.", "query": query, "items": []}
    seen, items = set(), []
    for result in results:
        url, title = result.get("url", ""), result.get("title", "").strip()
        if not url or not title or url in seen:
            continue
        seen.add(url)
        items.append({"title": title, "summary": result.get("content", "")[:1200], "what_happened": result.get("content", "")[:1200], "why_it_matters": "Review this verified source against your roadmap before changing priorities.", "recommended_action": "Read the source and decide whether it creates a relevant skill gap.", "source_url": url, "source_date": result.get("published_date")})
    article = await UserOwnedRepository(db, "news_articles").create(uid, {"title": f"Career intelligence — {datetime.now(UTC).date().isoformat()}", "query": query, "items": items, "status": "verified", "goal_id": goal["id"] if goal else None})
    return article


@router.get("/news/today", tags=["news"])
async def todays_news(user: dict = Depends(current_user)) -> dict:
    article = serialize(await get_db().news_articles.find_one({"user_id": user["id"]}, sort=[("created_at", -1)]))
    return article or {"status": "unavailable", "items": []}


@router.get("/news/{article_id}", tags=["news"])
async def get_news(article_id: str, user: dict = Depends(current_user)) -> dict:
    article = await UserOwnedRepository(get_db(), "news_articles").get(user["id"], article_id)
    if not article:
        raise HTTPException(404, "News article not found")
    return article


@router.post("/news/{article_id}/chat", tags=["news"])
async def news_chat(article_id: str, payload: ContextChatRequest, user: dict = Depends(current_user)) -> dict:
    await get_news(article_id, user)
    return await chat({"message": payload.message, "conversation_id": payload.conversation_id, "context_type": "news", "context_id": article_id}, user)


@router.get("/history", tags=["history"])
async def history(user: dict = Depends(current_user)) -> dict:
    db, uid = get_db(), user["id"]
    collections = ("goal_history", "roadmap_history", "task_history", "learning_history", "assessment_history", "recommendation_history")
    return {name: [serialize(value) async for value in db[name].find({"user_id": uid}).sort("created_at", -1).limit(100)] for name in collections}


@router.get("/reports/weekly", tags=["analytics"])
async def report(user: dict = Depends(current_user)) -> dict:
    db, uid = get_db(), user["id"]
    tasks = [serialize(value) async for value in db.tasks.find({"user_id": uid})]
    phases = [serialize(value) async for value in db.roadmap_phases.find({"user_id": uid})]
    metrics = calculate_progress(tasks, phases)
    metrics["completed_tasks"] = sum(task.get("status") == "completed" for task in tasks)
    attempts = [serialize(value) async for value in db.assessment_attempts.find({"user_id": uid})]
    return weekly_report(metrics, attempts)


@router.post("/chat")
async def chat(payload: dict, user: dict = Depends(current_user)) -> dict:
    message = str(payload.get("message", "")).strip()
    if not message or len(message) > 12000: raise HTTPException(422, "A message between 1 and 12000 characters is required")
    db = get_db(); profile_data = serialize(await db.profiles.find_one({"user_id": user["id"]})) or {}
    context_type, context_id = payload.get("context_type", "general"), payload.get("context_id")
    context_record = None
    collections = {"goal": "goals", "task": "tasks", "learning": "learning_content", "news": "news_articles", "project": "projects"}
    if context_id and context_type in collections:
        context_record = await UserOwnedRepository(db, collections[context_type]).get(user["id"], str(context_id))
        if not context_record:
            raise HTTPException(404, "Requested chat context was not found")
    memories = [serialize(value) async for value in db.memories.find({"user_id": user["id"]}).sort("updated_at", -1).limit(8)]
    graph = build_graph()
    result = await graph.ainvoke({"user_id": user["id"], "message": message, "context": {"profile": profile_data, "context_type": context_type, "context_record": context_record, "memories": memories}})
    conversation_id = payload.get("conversation_id")
    if not conversation_id or not ObjectId.is_valid(conversation_id):
        created = await UserOwnedRepository(db, "conversations").create(user["id"], {"title": message[:80]})
        conversation_id = created["id"]
    elif not await UserOwnedRepository(db, "conversations").get(user["id"], conversation_id):
        raise HTTPException(404, "Conversation not found")
    messages = UserOwnedRepository(db, "messages")
    metadata = {"context_type": context_type, "context_id": context_id}
    await messages.create(user["id"], {"conversation_id": conversation_id, "role": "user", "content": message, **metadata})
    await messages.create(user["id"], {"conversation_id": conversation_id, "role": "assistant", "content": result["response"], "sources": result.get("sources", []), **metadata})
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
