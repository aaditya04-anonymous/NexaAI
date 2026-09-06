"""Memory extraction, storage, and retrieval service."""
import logging
from datetime import UTC, datetime
from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class MemoryService:
    """Service for managing user memories."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.memory_collection = db["memories"]
    
    async def extract_and_store_memory(self, user_id: str, interaction: str, memory_type: str, key: str, value: str, importance: str = "medium", confidence: float = 0.8) -> dict:
        """Extract and store a structured memory from interaction."""
        now = datetime.now(UTC)
        memory_doc = {
            "user_id": user_id,
            "type": memory_type,
            "key": key,
            "value": value,
            "importance": importance,
            "confidence": confidence,
            "source": "interaction",
            "source_interaction": interaction[:500],  # Store first 500 chars
            "created_at": now,
            "updated_at": now,
            "last_used_at": now
        }
        
        # Check if similar memory exists and update it
        existing = await self.memory_collection.find_one({
            "user_id": user_id,
            "type": memory_type,
            "key": key
        })
        
        if existing:
            result = await self.memory_collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "value": value,
                        "confidence": max(existing.get("confidence", 0), confidence),
                        "updated_at": now,
                        "last_used_at": now
                    }
                }
            )
            memory_doc["id"] = str(existing["_id"])
            return memory_doc
        
        result = await self.memory_collection.insert_one(memory_doc)
        memory_doc["id"] = str(result.inserted_id)
        return memory_doc
    
    async def get_memories(self, user_id: str, memory_type: str | None = None, limit: int = 50) -> list[dict]:
        """Retrieve user memories."""
        query = {"user_id": user_id}
        if memory_type:
            query["type"] = memory_type
        
        cursor = self.memory_collection.find(query).sort("importance", -1).limit(limit)
        memories = []
        
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            memories.append(doc)
        
        return memories
    
    async def get_relevant_memories(self, user_id: str, context: str, max_memories: int = 5) -> list[dict]:
        """Get memories relevant to current context."""
        # Simple relevance matching - can be enhanced with embeddings
        cursor = self.memory_collection.find({"user_id": user_id}).sort("last_used_at", -1).limit(max_memories * 2)
        
        relevant = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            if self._is_relevant(doc, context):
                relevant.append(doc)
                if len(relevant) >= max_memories:
                    break
        
        return relevant
    
    async def update_memory(self, user_id: str, memory_id: str, updates: dict) -> dict | None:
        """Update an existing memory."""
        if not ObjectId.is_valid(memory_id):
            return None
        
        updates["updated_at"] = datetime.now(UTC)
        
        result = await self.memory_collection.find_one_and_update(
            {"_id": ObjectId(memory_id), "user_id": user_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result["id"] = str(result.pop("_id"))
        
        return result
    
    async def delete_memory(self, user_id: str, memory_id: str) -> bool:
        """Delete a memory."""
        if not ObjectId.is_valid(memory_id):
            return False
        
        result = await self.memory_collection.delete_one({
            "_id": ObjectId(memory_id),
            "user_id": user_id
        })
        
        return result.deleted_count == 1
    
    async def record_memory_usage(self, user_id: str, memory_id: str) -> None:
        """Update last_used_at timestamp for a memory."""
        if not ObjectId.is_valid(memory_id):
            return
        
        await self.memory_collection.update_one(
            {"_id": ObjectId(memory_id), "user_id": user_id},
            {"$set": {"last_used_at": datetime.now(UTC)}}
        )
    
    def _is_relevant(self, memory: dict, context: str) -> bool:
        """Check if memory is relevant to context."""
        memory_value = memory.get("value", "").lower()
        memory_key = memory.get("key", "").lower()
        context_lower = context.lower()
        
        # Simple keyword matching
        return any(word in context_lower for word in memory_value.split()[:5]) or \
               any(word in context_lower for word in memory_key.split())
    
    async def summarize_memories(self, user_id: str) -> dict:
        """Summarize all user memories by type."""
        cursor = self.memory_collection.find({"user_id": user_id})
        
        summary = {}
        async for doc in cursor:
            mem_type = doc.get("type", "unknown")
            if mem_type not in summary:
                summary[mem_type] = []
            summary[mem_type].append({
                "key": doc.get("key"),
                "value": doc.get("value"),
                "importance": doc.get("importance")
            })
        
        return summary


async def get_memory_service(db: AsyncIOMotorDatabase) -> MemoryService:
    """Get memory service instance."""
    return MemoryService(db)
