"""Additional API routes for learning, assessment, memory, recommendations, and progress."""
from datetime import UTC, datetime
import logging
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from ..db.database import get_db
from ..repositories.base import UserOwnedRepository, serialize
from ..schemas.career import (
    AssessmentSubmission, LearningContent, AssessmentCreate,
    MemoryUpdate, Recommendation
)
from ..services.learning import LearningService
from ..services.memory import MemoryService
from ..services.news import RecommendationService
from ..services.progress import ProgressService
from .deps import current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ============== LEARNING ROUTES ==============

@router.get("/learning/today", tags=["learning"])
async def get_today_learning(user: dict = Depends(current_user)) -> list[dict]:
    """Get today's learning content based on current tasks."""
    service = LearningService(get_db())
    return await service.get_today_learning(user["id"])


@router.get("/learning/{learning_id}", tags=["learning"])
async def get_learning_content(learning_id: str, user: dict = Depends(current_user)) -> dict:
    """Retrieve specific learning content."""
    service = LearningService(get_db())
    content = await service.get_learning_content(user["id"], learning_id)
    if not content:
        raise HTTPException(404, "Learning content not found")
    return content


@router.post("/learning/{learning_id}/chat", tags=["learning"])
async def ask_learning_question(learning_id: str, message: str, user: dict = Depends(current_user)) -> dict:
    """Ask a question about learning content (contextual chat)."""
    service = LearningService(get_db())
    content = await service.get_learning_content(user["id"], learning_id)
    if not content:
        raise HTTPException(404, "Learning content not found")
    
    # TODO: Integrate with AI agent for contextual Q&A
    return {
        "question": message,
        "answer": f"Based on {content.get('topic')}, here's an explanation...",
        "context": content.get("topic"),
        "helpful_resources": content.get("youtube_resources", [])
    }


@router.post("/learning/{learning_id}/complete", tags=["learning"])
async def complete_learning(learning_id: str, user: dict = Depends(current_user)) -> dict:
    """Mark learning content as complete."""
    if not ObjectId.is_valid(learning_id):
        raise HTTPException(400, "Invalid learning ID")
    
    result = await get_db()["learning_content"].update_one(
        {"_id": ObjectId(learning_id), "user_id": user["id"]},
        {"$set": {"status": "completed", "completed_at": datetime.now(UTC)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Learning content not found")
    
    return {"success": True, "message": "Learning marked as complete"}


# ============== ASSESSMENT ROUTES ==============

@router.get("/assessments/{assessment_id}", tags=["assessments"])
async def get_assessment(assessment_id: str, user: dict = Depends(current_user)) -> dict:
    """Retrieve assessment questions."""
    if not ObjectId.is_valid(assessment_id):
        raise HTTPException(400, "Invalid assessment ID")
    
    assessment = await get_db()["assessments"].find_one({
        "_id": ObjectId(assessment_id),
        "user_id": user["id"]
    })
    
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    
    # Don't expose correct answers to student
    for q in assessment.get("questions", []):
        q.pop("correct_answer", None)
        q.pop("explanation", None)
    
    assessment["id"] = str(assessment.pop("_id"))
    return assessment


@router.post("/assessments/{assessment_id}/submit", tags=["assessments"])
async def submit_assessment(assessment_id: str, payload: AssessmentSubmission, user: dict = Depends(current_user)) -> dict:
    """Submit assessment answers for evaluation."""
    service = LearningService(get_db())
    result = await service.submit_assessment(user["id"], assessment_id, payload.answers)
    
    if "error" in result:
        raise HTTPException(404, result["error"])
    
    return result


@router.get("/assessments/{assessment_id}/results", tags=["assessments"])
async def get_assessment_results(assessment_id: str, user: dict = Depends(current_user)) -> dict:
    """Get assessment results and feedback."""
    if not ObjectId.is_valid(assessment_id):
        raise HTTPException(400, "Invalid assessment ID")
    
    attempt = await get_db()["assessment_attempts"].find({
        "assessment_id": assessment_id,
        "user_id": user["id"]
    }).sort("completed_at", -1).limit(1).to_list(1)

    if not attempt:
        raise HTTPException(404, "No assessment results found")

    result = attempt[0]
    result["id"] = str(result.pop("_id"))
    return result


# ============== MEMORY ROUTES ==============

@router.get("/memories", tags=["memory"])
async def get_memories(memory_type: str | None = None, user: dict = Depends(current_user)) -> dict:
    """Retrieve user memories."""
    service = MemoryService(get_db())
    memories = await service.get_memories(user["id"], memory_type)
    summary = await service.summarize_memories(user["id"])
    
    return {
        "memories": memories,
        "summary": summary,
        "total_count": len(memories)
    }


@router.put("/memories/{memory_id}", tags=["memory"])
async def update_memory(memory_id: str, payload: MemoryUpdate, user: dict = Depends(current_user)) -> dict:
    """Update an existing memory."""
    service = MemoryService(get_db())
    memory = await service.update_memory(user["id"], memory_id, payload.model_dump())
    
    if not memory:
        raise HTTPException(404, "Memory not found")
    
    return memory


@router.delete("/memories/{memory_id}", tags=["memory"])
async def delete_memory(memory_id: str, user: dict = Depends(current_user)) -> dict:
    """Delete a memory."""
    service = MemoryService(get_db())
    success = await service.delete_memory(user["id"], memory_id)
    
    if not success:
        raise HTTPException(404, "Memory not found")
    
    return {"success": True, "message": "Memory deleted"}


# ============== RECOMMENDATION ROUTES ==============

@router.get("/recommendations", tags=["recommendations"])
async def get_recommendations(status: str | None = None, user: dict = Depends(current_user)) -> list[dict]:
    """Get personalized recommendations."""
    service = RecommendationService(get_db())
    return await service.get_recommendations(user["id"], status)


@router.post("/recommendations/{recommendation_id}/accept", tags=["recommendations"])
async def accept_recommendation(recommendation_id: str, user: dict = Depends(current_user)) -> dict:
    """Accept a recommendation."""
    service = RecommendationService(get_db())
    rec = await service.update_recommendation_status(user["id"], recommendation_id, "accepted")
    
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    
    return rec


@router.post("/recommendations/{recommendation_id}/reject", tags=["recommendations"])
async def reject_recommendation(recommendation_id: str, user: dict = Depends(current_user)) -> dict:
    """Reject a recommendation."""
    service = RecommendationService(get_db())
    rec = await service.update_recommendation_status(user["id"], recommendation_id, "rejected")
    
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    
    return rec


@router.post("/recommendations/{recommendation_id}/complete", tags=["recommendations"])
async def complete_recommendation(recommendation_id: str, user: dict = Depends(current_user)) -> dict:
    """Mark recommendation as completed."""
    service = RecommendationService(get_db())
    rec = await service.update_recommendation_status(user["id"], recommendation_id, "completed")
    
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    
    return rec


# ============== PROGRESS ROUTES ==============

@router.get("/progress", tags=["progress"])
async def get_progress(user: dict = Depends(current_user)) -> dict:
    """Get comprehensive progress metrics."""
    service = ProgressService(get_db())
    return await service.calculate_progress(user["id"])


@router.get("/progress/goal/{goal_id}", tags=["progress"])
async def get_goal_progress(goal_id: str, user: dict = Depends(current_user)) -> dict:
    """Get progress for specific goal."""
    if not ObjectId.is_valid(goal_id):
        raise HTTPException(400, "Invalid goal ID")
    
    goal = await get_db()["goals"].find_one({
        "_id": ObjectId(goal_id),
        "user_id": user["id"]
    })
    
    if not goal:
        raise HTTPException(404, "Goal not found")
    
    # Calculate phase progress
    phases = await get_db()["roadmap_phases"].find({
        "roadmap_id": goal.get("roadmap_id")
    }).to_list(None)
    
    phase_progress = []
    for phase in phases:
        tasks = await get_db()["tasks"].find({
            "phase_id": str(phase.get("_id")),
            "user_id": user["id"]
        }).to_list(None)
        
        completed = sum(1 for t in tasks if t.get("status") == "completed")
        completion = int((completed / len(tasks)) * 100) if tasks else 0
        
        phase_progress.append({
            "phase": phase.get("title"),
            "progress": completion,
            "tasks": len(tasks),
            "completed": completed
        })
    
    goal["id"] = str(goal.pop("_id"))
    return {
        "goal": goal,
        "phases": phase_progress,
        "overall_progress": goal.get("progress", 0)
    }


@router.get("/progress/skills", tags=["progress"])
async def get_skills_progress(user: dict = Depends(current_user)) -> dict:
    """Get skill-by-skill progress breakdown."""
    service = ProgressService(get_db())
    progress = await service.calculate_progress(user["id"])
    return progress.get("skill_progress", {})


@router.get("/progress/weekly", tags=["progress"])
async def get_weekly_report(user: dict = Depends(current_user)) -> dict:
    """Get weekly progress report."""
    service = ProgressService(get_db())
    return await service.get_weekly_report(user["id"])


@router.get("/history", tags=["history"])
async def get_activity_history(user: dict = Depends(current_user)) -> list[dict]:
    """Get activity history."""
    service = ProgressService(get_db())
    return await service.get_activity_history(user["id"])


# ============== NEWS/CAREER UPDATES ROUTES ==============

@router.get("/career/news/today", tags=["news"])
async def get_today_news(user: dict = Depends(current_user)) -> dict:
    """Get personalized career updates for today."""
    news = await get_db()["news_articles"].find_one({
        "user_id": user["id"],
        "date": {"$gte": datetime.now(UTC).replace(hour=0, minute=0, second=0)}
    }).sort("created_at", -1)
    
    if not news:
        news = {
            "title": "Career Updates",
            "summary": "No updates available yet",
            "news_items": [],
            "publication_date": datetime.now(UTC)
        }
    
    news["id"] = str(news.pop("_id", ""))
    return news


@router.get("/career/news/{article_id}", tags=["news"])
async def get_news_article(article_id: str, user: dict = Depends(current_user)) -> dict:
    """Get specific news article."""
    if not ObjectId.is_valid(article_id):
        raise HTTPException(400, "Invalid article ID")
    
    article = await get_db()["news_articles"].find_one({
        "_id": ObjectId(article_id),
        "user_id": user["id"]
    })
    
    if not article:
        raise HTTPException(404, "Article not found")
    
    article["id"] = str(article.pop("_id"))
    return article


@router.post("/career/news/{article_id}/chat", tags=["news"])
async def ask_news_question(article_id: str, message: str, user: dict = Depends(current_user)) -> dict:
    """Ask a question about news article (contextual chat)."""
    article = await get_db()["news_articles"].find_one({
        "_id": ObjectId(article_id),
        "user_id": user["id"]
    })
    
    if not article:
        raise HTTPException(404, "Article not found")
    
    # TODO: Integrate with AI agent for contextual career Q&A
    return {
        "question": message,
        "answer": f"Based on the article about {article.get('title')}, here's the answer...",
        "source": article.get("title"),
        "relevance_to_goal": "This is relevant to your AI Engineer goal"
    }


@router.post("/career/news/{article_id}/add-to-roadmap", tags=["news"])
async def add_news_to_roadmap(article_id: str, user: dict = Depends(current_user)) -> dict:
    """Add a news topic to the roadmap."""
    article = await get_db()["news_articles"].find_one({
        "_id": ObjectId(article_id),
        "user_id": user["id"]
    })
    
    if not article:
        raise HTTPException(404, "Article not found")
    
    # TODO: Extract topics and add to roadmap
    return {
        "success": True,
        "message": f"Added topics from '{article.get('title')}' to your roadmap",
        "topics_added": 3
    }
