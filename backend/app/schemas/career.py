from datetime import date, time, datetime
from typing import Literal

from pydantic import BaseModel, Field


class CareerProfileUpdate(BaseModel):
    name: str | None = Field(None, max_length=120)
    profession: str | None = Field(None, max_length=160)
    current_role: str | None = Field(None, max_length=160)
    experience_level: str | None = Field(None, max_length=80)
    education: str | None = Field(None, max_length=500)
    current_skills: list[str] | None = None
    target_skills: list[str] | None = None
    interests: list[str] | None = None
    preferred_learning_style: str | None = Field(None, max_length=100)
    preferred_learning_duration_minutes: int | None = Field(None, ge=15, le=720)
    preferred_daily_learning_time: time | None = None
    article_delivery_times: list[time] | None = Field(None, max_length=2)
    preferred_learning_days: list[int] | None = Field(None, max_length=7)
    career_objectives: str | None = Field(None, max_length=2000)
    timezone: str | None = Field(None, max_length=64)
    memory_enabled: bool | None = None


class UserPreferenceUpdate(BaseModel):
    preferred_learning_time: time | None = None
    news_time_1: time | None = None
    news_time_2: time | None = None
    preferred_days: list[int] = Field(default_factory=list)
    daily_learning_minutes: int | None = Field(None, ge=15, le=720)
    preferred_content_type: str | None = Field(None, max_length=100)
    difficulty_preference: Literal["easy", "medium", "hard"] = "medium"
    notification_enabled: bool = True
    email_enabled: bool = True
    timezone: str = "UTC"


class SkillGap(BaseModel):
    skill_name: str
    current_level: Literal["none", "beginner", "intermediate", "advanced", "expert"] = "none"
    required_level: Literal["beginner", "intermediate", "advanced", "expert"]
    gap: Literal["none", "small", "medium", "large", "critical"]
    priority: Literal["low", "medium", "high", "critical"]
    recommendation: str


class GoalCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(None, max_length=5000)
    target_role: str | None = Field(None, max_length=160)
    deadline: date | None = None
    daily_minutes: int | None = Field(None, ge=15, le=720)
    preferred_technologies: list[str] = Field(default_factory=list)


class GoalUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = Field(None, max_length=5000)
    target_role: str | None = Field(None, max_length=160)
    deadline: date | None = None
    status: Literal["discovery", "discussion", "draft", "active", "paused", "completed"] | None = None


class GoalDiscussionRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class RoadmapPhaseInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(None, max_length=2000)
    skills: list[str] = Field(default_factory=list)
    estimated_minutes: int = Field(default=300, ge=15)
    priority: Literal["low", "medium", "high"] = "medium"


class RoadmapUpdate(BaseModel):
    phases: list[RoadmapPhaseInput] = Field(min_length=1, max_length=30)
    status: Literal["draft", "review", "finalized"] | None = None


class TaskCompletion(BaseModel):
    completion_percentage: int = Field(default=100, ge=0, le=100)
    reflection: str | None = Field(None, max_length=2000)


class LearningContent(BaseModel):
    title: str
    topic: str
    difficulty: Literal["beginner", "intermediate", "advanced"]
    sections: list[dict] = Field(default_factory=list)
    diagrams: list[dict] = Field(default_factory=list)
    code_examples: list[str] = Field(default_factory=list)
    exercises: list[dict] = Field(default_factory=list)
    youtube_resources: list[dict] = Field(default_factory=list)
    estimated_minutes: int


class AssessmentQuestion(BaseModel):
    type: Literal["mcq", "true_false", "multiple_select", "short_answer", "coding", "scenario", "explanation"]
    question: str
    options: list[str] | None = Field(None, max_length=5)
    correct_answer: str | None = None
    explanation: str | None = None


class AssessmentCreate(BaseModel):
    topic: str
    difficulty: Literal["beginner", "intermediate", "advanced"]
    passing_score: int = Field(default=70, ge=0, le=100)
    questions: list[AssessmentQuestion] = Field(min_length=1, max_length=20)


class AssessmentSubmission(BaseModel):
    answers: dict[str, str] = Field(min_length=1)


class AssessmentFeedback(BaseModel):
    score: int
    passed: bool
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    detailed_feedback: str


class NewsArticle(BaseModel):
    title: str
    summary: str
    news_items: list[dict] = Field(default_factory=list)
    career_impact: str
    recommended_actions: list[str] = Field(default_factory=list)
    publication_date: datetime


class Recommendation(BaseModel):
    type: Literal["learn", "revise", "practice", "project", "video", "article", "interview", "portfolio", "network"]
    title: str
    description: str
    reason: str
    action: str
    expected_benefit: str
    priority: Literal["low", "medium", "high", "critical"]
    relevance_score: float


class Memory(BaseModel):
    type: Literal["preference", "career", "skill", "goal", "learning", "strength", "weakness", "behavior", "project", "decision", "recommendation"]
    key: str
    value: str
    importance: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0, le=1)


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    context_type: Literal["general", "goal", "task", "learning", "news", "project"] = "general"
    context_id: str | None = None


class AssessmentSubmission(BaseModel):
    answers: dict[str, str] = Field(min_length=1)


class ContextChatRequest(AgentChatRequest):
    conversation_id: str | None = None


class MemoryUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    category: str = Field(min_length=2, max_length=80)


class ProjectCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    objective: str = Field(min_length=3, max_length=2000)
    required_skills: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    difficulty: Literal["foundation", "intermediate", "advanced"] = "foundation"
    estimated_minutes: int = Field(default=600, ge=30)
    goal_id: str | None = None


class NotificationPreferenceUpdate(BaseModel):
    enabled: bool = True
    task_reminders: bool = True
    learning_reminders: bool = True
    article_reminders: bool = True
    timezone: str = Field(default="UTC", max_length=64)
    learning_time: time | None = None
    article_times: list[time] = Field(default_factory=list, max_length=2)
