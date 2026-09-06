"""Personalized recommendation engine."""
import logging
from datetime import UTC, datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class RecommendationService:
    """Service for generating personalized recommendations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.recommendation_collection = db["recommendations"]
    
    async def generate_recommendations(self, user_id: str, user_state: dict, market_data: dict) -> list[dict]:
        """Generate personalized recommendations based on user state."""
        recommendations = []
        
        goal = user_state.get("goal", {})
        current_progress = user_state.get("progress", {}).get("overall", 0)
        skill_gaps = user_state.get("skill_gaps", [])
        recent_assessments = user_state.get("recent_assessments", [])
        
        # Recommend learning for critical skill gaps
        for gap in skill_gaps:
            if gap.get("priority") == "critical" or gap.get("priority") == "high":
                rec = await self._create_recommendation(
                    user_id=user_id,
                    rec_type="learn",
                    title=f"Learn {gap.get('skill_name', 'critical skill')}",
                    description=f"You have a significant gap in {gap.get('skill_name')} which is crucial for your target role.",
                    reason=f"Your current level is {gap.get('current_level', 'beginner')} but the market requires {gap.get('required_level', 'advanced')}.",
                    action=f"Start with the {gap.get('skill_name')} learning module in your roadmap",
                    expected_benefit="Close critical skill gap and improve career readiness",
                    priority="critical" if gap.get("priority") == "critical" else "high",
                    relevance_score=0.95
                )
                if rec:
                    recommendations.append(rec)
        
        # Recommend projects if foundational learning is done
        if current_progress > 25:
            rec = await self._create_recommendation(
                user_id=user_id,
                rec_type="project",
                title="Build a practical AI project",
                description="You've covered the fundamentals. Now it's time to apply your knowledge.",
                reason="Hands-on projects are critical for portfolio building and interview preparation.",
                action="Start with a guided project from your roadmap or build your own",
                expected_benefit="Build portfolio, reinforce learning, gain practical experience",
                priority="high",
                relevance_score=0.85
            )
            if rec:
                recommendations.append(rec)
        
        # Recommend revision based on assessment performance
        if recent_assessments:
            low_scores = [a for a in recent_assessments if a.get("score", 0) < 70]
            if low_scores:
                rec = await self._create_recommendation(
                    user_id=user_id,
                    rec_type="revise",
                    title="Review weak concepts",
                    description=f"You scored below 70% on recent assessments in certain areas.",
                    reason="Mastery is important before moving to advanced topics.",
                    action="Review the learning material for weak areas and practice more exercises",
                    expected_benefit="Strengthen foundation and improve assessment scores",
                    priority="medium",
                    relevance_score=0.80
                )
                if rec:
                    recommendations.append(rec)
        
        # Recommend portfolio updates
        if current_progress > 50:
            rec = await self._create_recommendation(
                user_id=user_id,
                rec_type="portfolio",
                title="Update your GitHub profile and portfolio",
                description="Your projects and GitHub presence are critical for job applications.",
                reason="Recruiters and hiring managers evaluate your portfolio and GitHub first.",
                action="Add your projects to GitHub, write clear READMEs, and update your portfolio site",
                expected_benefit="Improve visibility to potential employers and demonstrate your skills",
                priority="high",
                relevance_score=0.75
            )
            if rec:
                recommendations.append(rec)
        
        # Recommend interview preparation
        if current_progress > 70:
            rec = await self._create_recommendation(
                user_id=user_id,
                rec_type="interview",
                title="Prepare for technical interviews",
                description="You're ready to start interview preparation.",
                reason="Technical interviews are a critical part of the job application process.",
                action="Practice common AI/ML interview questions and coding problems",
                expected_benefit="Be ready for technical interviews and land your target role",
                priority="high",
                relevance_score=0.80
            )
            if rec:
                recommendations.append(rec)
        
        # Sort by priority and relevance
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        recommendations.sort(key=lambda r: (priority_order.get(r.get("priority", "low"), 99), -r.get("relevance_score", 0)))
        
        return recommendations
    
    async def _create_recommendation(self, user_id: str, rec_type: str, title: str, description: str, reason: str, action: str, expected_benefit: str, priority: str, relevance_score: float) -> dict | None:
        """Create and store a recommendation."""
        now = datetime.now(UTC)
        
        rec_doc = {
            "user_id": user_id,
            "type": rec_type,
            "title": title,
            "description": description,
            "reason": reason,
            "action": action,
            "expected_benefit": expected_benefit,
            "priority": priority,
            "relevance_score": relevance_score,
            "status": "suggested",
            "created_at": now,
            "updated_at": now
        }
        
        result = await self.recommendation_collection.insert_one(rec_doc)
        rec_doc["id"] = str(result.inserted_id)
        return rec_doc
    
    async def get_recommendations(self, user_id: str, status: str | None = None, limit: int = 10) -> list[dict]:
        """Retrieve recommendations for a user."""
        query = {"user_id": user_id}
        if status:
            query["status"] = status
        
        cursor = self.recommendation_collection.find(query).sort("priority", -1).limit(limit)
        recommendations = []
        
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            recommendations.append(doc)
        
        return recommendations
    
    async def update_recommendation_status(self, user_id: str, recommendation_id: str, status: str) -> dict | None:
        """Update recommendation status (suggested, accepted, rejected, completed)."""
        if not ObjectId.is_valid(recommendation_id):
            return None
        
        result = await self.recommendation_collection.find_one_and_update(
            {"_id": ObjectId(recommendation_id), "user_id": user_id},
            {"$set": {"status": status, "updated_at": datetime.now(UTC)}},
            return_document=True
        )
        
        if result:
            result["id"] = str(result.pop("_id"))
        
        return result
    
    async def get_top_recommendations(self, user_id: str, count: int = 3) -> list[dict]:
        """Get top personalized recommendations."""
        return await self.get_recommendations(user_id, status="suggested", limit=count)


async def get_recommendation_service(db: AsyncIOMotorDatabase) -> RecommendationService:
    """Get recommendation service instance."""
    return RecommendationService(db)
