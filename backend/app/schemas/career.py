from datetime import date, time
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
    status: Literal["discovery", "draft", "active", "paused", "completed"] | None = None


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


class TaskCompletion(BaseModel):
    completion_percentage: int = Field(default=100, ge=0, le=100)
    reflection: str | None = Field(None, max_length=2000)


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
