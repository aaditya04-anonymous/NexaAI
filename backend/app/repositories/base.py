from datetime import UTC, datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


def serialize(document: dict | None) -> dict | None:
    if document is None:
        return None
    document = dict(document)
    document["id"] = str(document.pop("_id"))
    return document


class UserOwnedRepository:
    def __init__(self, db: AsyncIOMotorDatabase, collection: str):
        self.collection = db[collection]

    async def create(self, user_id: str, values: dict) -> dict:
        now = datetime.now(UTC)
        record = {**values, "user_id": user_id, "created_at": now, "updated_at": now}
        result = await self.collection.insert_one(record)
        return serialize(await self.collection.find_one({"_id": result.inserted_id}))  # type: ignore[return-value]

    async def list(self, user_id: str, limit: int = 100) -> list[dict]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        return [serialize(value) async for value in cursor]  # type: ignore[misc]

    async def get(self, user_id: str, item_id: str) -> dict | None:
        if not ObjectId.is_valid(item_id):
            return None
        return serialize(await self.collection.find_one({"_id": ObjectId(item_id), "user_id": user_id}))

    async def update(self, user_id: str, item_id: str, values: dict) -> dict | None:
        if not ObjectId.is_valid(item_id):
            return None
        await self.collection.update_one({"_id": ObjectId(item_id), "user_id": user_id}, {"$set": {**values, "updated_at": datetime.now(UTC)}})
        return await self.get(user_id, item_id)

    async def delete(self, user_id: str, item_id: str) -> bool:
        if not ObjectId.is_valid(item_id):
            return False
        return (await self.collection.delete_one({"_id": ObjectId(item_id), "user_id": user_id})).deleted_count == 1
