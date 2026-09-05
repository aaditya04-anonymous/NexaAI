import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from ..core.config import get_settings

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    async def connect(self) -> None:
        settings = get_settings()
        self.client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
        await self.client.admin.command("ping")
        self.db = self.client[settings.mongodb_database]
        await self.create_indexes()
        logger.info("MongoDB connected")

    async def create_indexes(self) -> None:
        assert self.db is not None
        await self.db.users.create_index("email", unique=True)
        for collection in ("profiles", "conversations", "messages", "memories", "goals", "tasks", "documents", "document_chunks", "recommendations", "progress_events", "automations", "roadmaps", "roadmap_phases", "goal_discussions", "goal_history", "roadmap_history", "task_history", "learning_content", "learning_history", "assessments", "assessment_attempts", "assessment_history", "news_articles", "notifications", "projects", "user_preferences", "activity_logs", "recommendation_history"):
            await self.db[collection].create_index([("user_id", 1), ("created_at", -1)])
        await self.db.roadmaps.create_index([("user_id", 1), ("goal_id", 1)], unique=True)
        await self.db.roadmap_phases.create_index([("user_id", 1), ("roadmap_id", 1), ("order", 1)])
        await self.db.tasks.create_index([("user_id", 1), ("due_date", 1)])
        await self.db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
        await self.db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

    async def close(self) -> None:
        if self.client:
            self.client.close()


database = Database()


def get_db() -> AsyncIOMotorDatabase:
    if database.db is None:
        raise RuntimeError("Database is unavailable")
    return database.db
