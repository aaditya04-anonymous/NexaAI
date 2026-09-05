import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .api.routes import router
from .core.config import get_settings
from .db.database import database
from .workers.scheduler import scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

@asynccontextmanager
async def lifespan(_: FastAPI):
    await database.connect()
    scheduler.start(database.db)
    yield
    scheduler.stop()
    await database.close()

settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception):
    logging.getLogger(__name__).exception("Unhandled request error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})
