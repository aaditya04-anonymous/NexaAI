"""Learning content generation and management service."""
import logging
from datetime import UTC, datetime
from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class LearningService:
    """Service for generating and managing learning content."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.learning_collection = db["learning_content"]
        self.assessment_collection = db["assessments"]
    
    async def create_learning_content(self, user_id: str, task_id: str, topic: str, difficulty: str, content: dict) -> dict:
        """Create interactive learning content for a task."""
        now = datetime.now(UTC)
        learning_doc = {
            "user_id": user_id,
            "task_id": task_id,
            "title": content.get("title", topic),
            "topic": topic,
            "difficulty": difficulty,
            "sections": content.get("sections", []),
            "diagrams": content.get("diagrams", []),
            "code_examples": content.get("code_examples", []),
            "exercises": content.get("exercises", []),
            "youtube_resources": content.get("youtube_resources", []),
            "estimated_minutes": content.get("estimated_minutes", 45),
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
        
        result = await self.learning_collection.insert_one(learning_doc)
        learning_doc["id"] = str(result.inserted_id)
        return learning_doc
    
    async def get_learning_content(self, user_id: str, learning_id: str) -> dict | None:
        """Retrieve learning content."""
        if not ObjectId.is_valid(learning_id):
            return None
        
        doc = await self.learning_collection.find_one({
            "_id": ObjectId(learning_id),
            "user_id": user_id
        })
        
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc
    
    async def get_today_learning(self, user_id: str) -> list[dict]:
        """Get today's learning content based on tasks."""
        cursor = self.learning_collection.find({
            "user_id": user_id,
            "status": "active"
        }).limit(5)
        
        content = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            content.append(doc)
        
        return content
    
    async def create_assessment(self, user_id: str, learning_id: str, topic: str, questions: list[dict]) -> dict:
        """Create assessment for learning content."""
        now = datetime.now(UTC)
        assessment_doc = {
            "user_id": user_id,
            "learning_id": learning_id,
            "topic": topic,
            "difficulty": "intermediate",
            "passing_score": 70,
            "questions": questions,
            "created_at": now,
            "updated_at": now
        }
        
        result = await self.assessment_collection.insert_one(assessment_doc)
        assessment_doc["id"] = str(result.inserted_id)
        return assessment_doc
    
    async def submit_assessment(self, user_id: str, assessment_id: str, answers: dict) -> dict:
        """Submit and evaluate assessment."""
        if not ObjectId.is_valid(assessment_id):
            return {"error": "Invalid assessment ID"}
        
        assessment = await self.assessment_collection.find_one({
            "_id": ObjectId(assessment_id),
            "user_id": user_id
        })
        
        if not assessment:
            return {"error": "Assessment not found"}
        
        # Calculate score
        score = self._calculate_score(answers, assessment["questions"])
        passed = score >= assessment["passing_score"]
        
        # Store attempt
        attempt_doc = {
            "user_id": user_id,
            "assessment_id": assessment_id,
            "answers": answers,
            "score": score,
            "passed": passed,
            "completed_at": datetime.now(UTC)
        }
        
        await self.db["assessment_attempts"].insert_one(attempt_doc)
        
        return {
            "id": str(assessment_id),
            "score": score,
            "passed": passed,
            "feedback": self._generate_feedback(score, passed),
            "strengths": self._identify_strengths(answers, assessment["questions"]),
            "weaknesses": self._identify_weaknesses(answers, assessment["questions"])
        }
    
    def _calculate_score(self, answers: dict, questions: list[dict]) -> int:
        """Calculate assessment score."""
        if not questions:
            return 0
        
        correct = sum(1 for q in questions if answers.get(q.get("id")) == q.get("correct_answer"))
        return int((correct / len(questions)) * 100)
    
    def _generate_feedback(self, score: int, passed: bool) -> str:
        """Generate feedback based on score."""
        if score >= 90:
            return "Excellent! You have mastered this concept. Ready to move to the next topic."
        elif score >= 70:
            return "Good job! You understand the key concepts. Practice a bit more for mastery."
        else:
            return "You need more practice on this topic. Review the material and try again."
    
    def _identify_strengths(self, answers: dict, questions: list[dict]) -> list[str]:
        """Identify strong areas based on answers."""
        correct_answers = [q.get("topic", "Concept") for q in questions if answers.get(q.get("id")) == q.get("correct_answer")]
        return list(set(correct_answers))[:3]
    
    def _identify_weaknesses(self, answers: dict, questions: list[dict]) -> list[str]:
        """Identify weak areas based on answers."""
        incorrect_answers = [q.get("topic", "Concept") for q in questions if answers.get(q.get("id")) != q.get("correct_answer")]
        return list(set(incorrect_answers))[:3]


async def get_learning_service(db: AsyncIOMotorDatabase) -> LearningService:
    """Get learning service instance."""
    return LearningService(db)
