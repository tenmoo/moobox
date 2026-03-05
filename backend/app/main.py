from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models_registry import load_registry
from app.routers import chat, models

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    models_path = Path(__file__).resolve().parent.parent / settings.models_file
    app.state.registry = load_registry(models_path)
    yield


app = FastAPI(title="MooBox", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
