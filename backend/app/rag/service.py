import re
from pathlib import Path
from fastapi import HTTPException, UploadFile
from ..core.config import get_settings
from ..repositories.base import UserOwnedRepository

ALLOWED_TYPES = {"text/plain", "text/markdown", "text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

def chunks(text: str, size: int = 900, overlap: int = 150) -> list[str]:
    clean = re.sub(r"\s+", " ", text).strip()
    return [clean[index:index + size] for index in range(0, len(clean), size - overlap) if clean[index:index + size]]

async def extract(upload: UploadFile) -> str:
    content = await upload.read()
    if len(content) > get_settings().max_upload_bytes: raise HTTPException(413, "File exceeds the configured upload limit")
    if upload.content_type not in ALLOWED_TYPES: raise HTTPException(415, "Unsupported document type")
    if upload.content_type in {"text/plain", "text/markdown", "text/csv"}: return content.decode("utf-8", errors="replace")
    if upload.content_type == "application/pdf":
        from pypdf import PdfReader
        from io import BytesIO
        return "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages)
    from docx import Document
    from io import BytesIO
    return "\n".join(paragraph.text for paragraph in Document(BytesIO(content)).paragraphs)

async def ingest(db, user_id: str, upload: UploadFile) -> dict:
    if not upload.filename or Path(upload.filename).name != upload.filename: raise HTTPException(422, "Invalid filename")
    text = await extract(upload)
    if not text.strip(): raise HTTPException(422, "The document contains no extractable text")
    document = await UserOwnedRepository(db, "documents").create(user_id, {"title": upload.filename, "content_type": upload.content_type, "text_length": len(text)})
    repository = UserOwnedRepository(db, "document_chunks")
    for position, content in enumerate(chunks(text)):
        await repository.create(user_id, {"document_id": document["id"], "position": position, "content": content})
    return document

async def search(db, user_id: str, query: str, document_id: str | None = None) -> list[dict]:
    terms = set(re.findall(r"[a-z0-9]{3,}", query.lower()))
    filter_ = {"user_id": user_id}
    if document_id: filter_["document_id"] = document_id
    found = await db.document_chunks.find(filter_).to_list(300)
    scored = sorted(found, key=lambda item: len(terms & set(re.findall(r"[a-z0-9]{3,}", item["content"].lower()))), reverse=True)
    return [{"document_id": item["document_id"], "position": item["position"], "content": item["content"]} for item in scored[:5] if terms & set(re.findall(r"[a-z0-9]{3,}", item["content"].lower()))]
