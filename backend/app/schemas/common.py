from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class MongoModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProfileUpdate(BaseModel):
    name: str | None = Field(None, max_length=120)
    professional_status: str | None = None
    career_field: str | None = None
    target_career: str | None = None
    experience_level: str | None = None
    skills: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    learning_style: str | None = None
    communication_style: str | None = None
    productivity_preferences: str | None = None
    long_term_ambitions: str | None = None
    improvement_areas: list[str] = Field(default_factory=list)
    timezone: str = "UTC"


class ResourceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(None, max_length=5000)
    category: str = "custom"
    priority: str = "medium"
    target_date: datetime | None = None
    status: str = "active"
    progress: int = Field(default=0, ge=0, le=100)
    notes: str | None = Field(None, max_length=5000)
    extra: dict[str, Any] = Field(default_factory=dict)


class ResourceUpdate(ResourceCreate):
    pass
