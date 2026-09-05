"""Non-blocking user-timezone automation scheduler.

Delivery is represented as user-owned notification records. A deployment can attach
email, push, or websocket delivery without changing planning endpoints.
"""
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from ..repositories.base import UserOwnedRepository


class NexaScheduler:
    def __init__(self) -> None:
        self.scheduler = AsyncIOScheduler(timezone="UTC")

    async def create_due_notifications(self, db) -> None:
        now = datetime.now(UTC)
        async for preference in db.user_preferences.find({"enabled": True}):
            try:
                local = now.astimezone(ZoneInfo(preference.get("timezone", "UTC")))
            except Exception:
                continue
            reminder_times = [(value, "learning") for value in [preference.get("learning_time")] if value]
            reminder_times += [(value, "career_update") for value in preference.get("article_times", [])]
            for value, kind in reminder_times:
                if value[:5] != local.strftime("%H:%M"):
                    continue
                stamp = f"{local.date().isoformat()}:{kind}:{value}"
                exists = await db.notifications.find_one({"user_id": preference["user_id"], "schedule_stamp": stamp})
                if not exists:
                    await UserOwnedRepository(db, "notifications").create(preference["user_id"], {"type": kind, "title": "Your NexaAI planned activity is ready", "schedule_stamp": stamp, "read": False})

    def start(self, db) -> None:
        if not self.scheduler.running:
            self.scheduler.add_job(self.create_due_notifications, "interval", minutes=1, args=[db], id="nexa-due-notifications", replace_existing=True, max_instances=1)
            self.scheduler.start()

    def stop(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)


scheduler = NexaScheduler()
