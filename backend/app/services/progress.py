"""Progress tracking and analytics service."""
import logging
from datetime import UTC, datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class ProgressService:
    """Service for tracking user progress at multiple levels."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.progress_collection = db["progress"]
        self.activity_collection = db["activity_history"]
    
    async def calculate_progress(self, user_id: str) -> dict:
        """Calculate comprehensive progress metrics."""
        
        # Get goal progress
        goal_progress = await self._calculate_goal_progress(user_id)
        
        # Get skill progress
        skill_progress = await self._calculate_skill_progress(user_id)
        
        # Get task progress
        task_progress = await self._calculate_task_progress(user_id)
        
        # Get learning progress
        learning_progress = await self._calculate_learning_progress(user_id)
        
        # Get assessment performance
        assessment_performance = await self._calculate_assessment_performance(user_id)
        
        # Calculate career readiness score
        career_readiness = self._calculate_career_readiness(goal_progress, skill_progress, task_progress, assessment_performance)
        
        now = datetime.now(UTC)
        progress_doc = {
            "user_id": user_id,
            "timestamp": now,
            "goal_progress": goal_progress,
            "skill_progress": skill_progress,
            "task_progress": task_progress,
            "learning_progress": learning_progress,
            "assessment_performance": assessment_performance,
            "career_readiness": career_readiness
        }
        
        # Store progress snapshot
        await self.progress_collection.insert_one(progress_doc)
        
        return progress_doc
    
    async def _calculate_goal_progress(self, user_id: str) -> dict:
        """Calculate goal-level progress."""
        goals = await self.db["goals"].find({"user_id": user_id}).to_list(None)
        
        if not goals:
            return {"overall": 0, "active_goals": 0, "completed_goals": 0}
        
        completed = sum(1 for g in goals if g.get("status") == "completed")
        active = sum(1 for g in goals if g.get("status") == "active")
        
        progress_values = []
        for goal in goals:
            if goal.get("status") == "active":
                # Calculate progress from tasks and learning
                phase_progress = await self._get_phase_progress(goal.get("_id"))
                progress_values.append(phase_progress)
        
        overall = sum(progress_values) // len(progress_values) if progress_values else 0
        
        return {
            "overall": overall,
            "active_goals": active,
            "completed_goals": completed,
            "total_goals": len(goals)
        }
    
    async def _calculate_skill_progress(self, user_id: str) -> dict:
        """Calculate skill-level progress."""
        user_skills = await self.db["user_skills"].find({"user_id": user_id}).to_list(None)
        
        skill_progress = {}
        for skill in user_skills:
            skill_name = skill.get("skill_name", "Unknown")
            skill_progress[skill_name] = skill.get("proficiency_level", 0)
        
        return skill_progress
    
    async def _calculate_task_progress(self, user_id: str) -> dict:
        """Calculate task completion progress."""
        tasks = await self.db["tasks"].find({"user_id": user_id}).to_list(None)
        
        if not tasks:
            return {"completed": 0, "in_progress": 0, "pending": 0, "completion_rate": 0}
        
        completed = sum(1 for t in tasks if t.get("status") == "completed")
        in_progress = sum(1 for t in tasks if t.get("status") == "in_progress")
        pending = sum(1 for t in tasks if t.get("status") == "pending")
        
        completion_rate = int((completed / len(tasks)) * 100) if tasks else 0
        
        return {
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending,
            "total": len(tasks),
            "completion_rate": completion_rate
        }
    
    async def _calculate_learning_progress(self, user_id: str) -> dict:
        """Calculate learning progress."""
        learning_docs = await self.db["learning_content"].find({"user_id": user_id}).to_list(None)
        
        if not learning_docs:
            return {"completed": 0, "in_progress": 0, "total": 0}
        
        completed = sum(1 for l in learning_docs if l.get("status") == "completed")
        in_progress = sum(1 for l in learning_docs if l.get("status") == "in_progress")
        
        return {
            "completed": completed,
            "in_progress": in_progress,
            "total": len(learning_docs)
        }
    
    async def _calculate_assessment_performance(self, user_id: str) -> dict:
        """Calculate assessment performance metrics."""
        attempts = await self.db["assessment_attempts"].find({"user_id": user_id}).to_list(None)
        
        if not attempts:
            return {"average_score": 0, "total_attempts": 0, "passed": 0, "failed": 0}
        
        scores = [a.get("score", 0) for a in attempts]
        average_score = sum(scores) // len(scores) if scores else 0
        passed = sum(1 for a in attempts if a.get("passed", False))
        failed = len(attempts) - passed
        
        return {
            "average_score": average_score,
            "total_attempts": len(attempts),
            "passed": passed,
            "failed": failed,
            "pass_rate": int((passed / len(attempts)) * 100) if attempts else 0
        }
    
    async def _get_phase_progress(self, goal_id) -> int:
        """Get progress for a specific roadmap phase."""
        # Simplified - can be enhanced
        return 30
    
    def _calculate_career_readiness(self, goal_progress: dict, skill_progress: dict, task_progress: dict, assessment_performance: dict) -> int:
        """Calculate overall career readiness score."""
        weights = {
            "goal": 0.25,
            "skills": 0.25,
            "tasks": 0.25,
            "assessment": 0.25
        }
        
        goal_score = goal_progress.get("overall", 0)
        skill_score = sum(skill_progress.values()) // len(skill_progress) if skill_progress else 0
        task_score = task_progress.get("completion_rate", 0)
        assessment_score = assessment_performance.get("average_score", 0)
        
        readiness = int(
            (goal_score * weights["goal"]) +
            (skill_score * weights["skills"]) +
            (task_score * weights["tasks"]) +
            (assessment_score * weights["assessment"])
        )
        
        return min(readiness, 100)
    
    async def log_activity(self, user_id: str, entity_type: str, entity_id: str, action: str, details: dict | None = None) -> dict:
        """Log user activity for history tracking."""
        now = datetime.now(UTC)
        
        activity_doc = {
            "user_id": user_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "details": details or {},
            "created_at": now
        }
        
        result = await self.activity_collection.insert_one(activity_doc)
        activity_doc["id"] = str(result.inserted_id)
        return activity_doc
    
    async def get_activity_history(self, user_id: str, limit: int = 50) -> list[dict]:
        """Get user activity history."""
        cursor = self.activity_collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        
        history = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            history.append(doc)
        
        return history
    
    async def get_weekly_report(self, user_id: str) -> dict:
        """Generate weekly progress report."""
        progress = await self.calculate_progress(user_id)
        
        return {
            "period": "This week",
            "goals_progress": progress.get("goal_progress"),
            "tasks_completed": progress.get("task_progress", {}).get("completed", 0),
            "learning_sessions": progress.get("learning_progress", {}).get("completed", 0),
            "average_assessment_score": progress.get("assessment_performance", {}).get("average_score", 0),
            "career_readiness": progress.get("career_readiness", 0),
            "strengths": self._identify_strengths(progress),
            "areas_for_improvement": self._identify_weaknesses(progress),
            "recommendation": self._generate_recommendation(progress)
        }
    
    def _identify_strengths(self, progress: dict) -> list[str]:
        """Identify user strengths from progress."""
        strengths = []
        
        if progress.get("task_progress", {}).get("completion_rate", 0) > 70:
            strengths.append("Good task completion rate")
        
        if progress.get("assessment_performance", {}).get("pass_rate", 0) > 80:
            strengths.append("Strong assessment performance")
        
        skill_progress = progress.get("skill_progress", {})
        high_skills = [s for s, p in skill_progress.items() if p > 80]
        if high_skills:
            strengths.append(f"Strong in {', '.join(high_skills[:2])}")
        
        return strengths or ["You're making progress"]
    
    def _identify_weaknesses(self, progress: dict) -> list[str]:
        """Identify areas for improvement."""
        weaknesses = []
        
        if progress.get("task_progress", {}).get("completion_rate", 0) < 50:
            weaknesses.append("Inconsistent task completion")
        
        if progress.get("assessment_performance", {}).get("average_score", 0) < 60:
            weaknesses.append("Need more practice on assessments")
        
        skill_progress = progress.get("skill_progress", {})
        low_skills = [s for s, p in skill_progress.items() if p < 30]
        if low_skills:
            weaknesses.append(f"Need focus on {', '.join(low_skills[:2])}")
        
        return weaknesses
    
    def _generate_recommendation(self, progress: dict) -> str:
        """Generate recommendation based on progress."""
        readiness = progress.get("career_readiness", 0)
        
        if readiness < 30:
            return "Focus on completing foundational learning modules."
        elif readiness < 60:
            return "Start building practical projects to reinforce your learning."
        elif readiness < 80:
            return "Build portfolio projects and practice interview questions."
        else:
            return "Ready to apply for roles! Update your resume and start interviews."


async def get_progress_service(db: AsyncIOMotorDatabase) -> ProgressService:
    """Get progress service instance."""
    return ProgressService(db)
