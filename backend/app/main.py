from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.chat_service import ChatService
from app.constants import (
    APP_NAME,
    APP_VERSION,
    CHAT_ENDPOINT,
    ERROR_MESSAGE_AI_UNAVAILABLE,
    ERROR_MESSAGE_GENERIC,
    HEALTH_ENDPOINT,
)
from app.gemini_client import GeminiClient
from app.logging_config import configure_logging
from app.models import ChatRequest, ChatResponse

load_dotenv()
configure_logging()
logger = logging.getLogger(__name__)

gemini_client = GeminiClient()
chat_service = ChatService(gemini_client=gemini_client)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Starting Sousie backend")
    try:
        yield
    finally:
        logger.info("Stopping Sousie backend")


app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(HEALTH_ENDPOINT)
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post(CHAT_ENDPOINT, response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        return await chat_service.handle_chat(request)
    except ValueError as exc:
        logger.warning("Non-fatal chat warning: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=ERROR_MESSAGE_GENERIC) from exc
    except RuntimeError as exc:
        logger.error("Fatal runtime error during chat: %s", exc, exc_info=True)
        raise HTTPException(status_code=503, detail=ERROR_MESSAGE_AI_UNAVAILABLE) from exc
    except Exception as exc:
        logger.error("Fatal unknown error during chat: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=ERROR_MESSAGE_GENERIC) from exc

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
