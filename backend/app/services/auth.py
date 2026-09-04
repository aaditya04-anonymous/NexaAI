from datetime import UTC, datetime, timedelta
import hashlib
import secrets
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..core.config import get_settings
from ..core.security import create_access_token, hash_password, verify_password
from ..repositories.base import serialize


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase): self.db = db

    async def register(self, email: str, password: str) -> str:
        if await self.db.users.find_one({"email": email.lower()}):
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        now = datetime.now(UTC)
        result = await self.db.users.insert_one({"email": email.lower(), "password_hash": hash_password(password), "created_at": now, "updated_at": now, "active": True})
        await self.db.profiles.insert_one({"user_id": str(result.inserted_id), "timezone": "UTC", "skills": [], "interests": [], "created_at": now, "updated_at": now})
        return create_access_token(str(result.inserted_id))

    async def login(self, email: str, password: str) -> str:
        user = await self.db.users.find_one({"email": email.lower()})
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        return create_access_token(str(user["_id"]))

    async def request_reset(self, email: str) -> None:
        user = await self.db.users.find_one({"email": email.lower()})
        if not user: return
        raw = secrets.token_urlsafe(32)
        hashed = hashlib.sha256(raw.encode()).hexdigest()
        expires = datetime.now(UTC) + timedelta(minutes=get_settings().reset_token_expire_minutes)
        await self.db.password_reset_tokens.insert_one({"user_id": str(user["_id"]), "token_hash": hashed, "expires_at": expires, "used": False})
        # SMTP delivery is deliberately delegated to deployment mail infrastructure; never log the raw token.

    async def reset_password(self, token: str, password: str) -> None:
        digest = hashlib.sha256(token.encode()).hexdigest()
        reset = await self.db.password_reset_tokens.find_one({"token_hash": digest, "used": False, "expires_at": {"$gt": datetime.now(UTC)}})
        if not reset: raise HTTPException(status_code=400, detail="Reset token is invalid or expired")
        await self.db.users.update_one({"_id": ObjectId(reset["user_id"])}, {"$set": {"password_hash": hash_password(password), "updated_at": datetime.now(UTC)}})
        await self.db.password_reset_tokens.update_one({"_id": reset["_id"]}, {"$set": {"used": True}})

    async def change_password(self, user: dict, current: str, new: str) -> None:
        stored = await self.db.users.find_one({"_id": ObjectId(user["id"])})
        if not stored or not verify_password(current, stored["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        await self.db.users.update_one({"_id": stored["_id"]}, {"$set": {"password_hash": hash_password(new), "updated_at": datetime.now(UTC)}})
