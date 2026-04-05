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
    INGREDIENT_REMOVE_ENDPOINT,
    INGREDIENT_SUBSTITUTIONS_ENDPOINT,
    INGREDIENT_SUBSTITUTE_ENDPOINT,
)
from app.gemini_client import GeminiClient
from app.logging_config import configure_logging
from app.models import (
    ChatRequest,
    ChatResponse,
    IngredientEditResponse,
    IngredientRemovalRequest,
    IngredientSubstitutionRequest,
    IngredientSubstitutionsRequest,
    IngredientSubstitutionsResponse,
)

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


@app.post(
    INGREDIENT_SUBSTITUTIONS_ENDPOINT,
    response_model=IngredientSubstitutionsResponse,
)
async def ingredient_substitutions(
    request: IngredientSubstitutionsRequest,
) -> IngredientSubstitutionsResponse:
    try:
        return await chat_service.suggest_ingredient_substitutions(
            recipe=request.recipe,
            ingredient_name=request.ingredient_name,
            diet_profile=request.diet_profile,
        )
    except ValueError as exc:
        logger.warning("Non-fatal substitutions warning: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=ERROR_MESSAGE_GENERIC) from exc
    except RuntimeError as exc:
        logger.error("Fatal runtime error during substitutions: %s", exc, exc_info=True)
        raise HTTPException(status_code=503, detail=ERROR_MESSAGE_AI_UNAVAILABLE) from exc
    except Exception as exc:
        logger.error("Fatal unknown error during substitutions: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=ERROR_MESSAGE_GENERIC) from exc


@app.post(INGREDIENT_REMOVE_ENDPOINT, response_model=IngredientEditResponse)
async def ingredient_remove(request: IngredientRemovalRequest) -> IngredientEditResponse:
    try:
        return await chat_service.handle_ingredient_removal(
            recipe=request.recipe,
            ingredient_name=request.ingredient_name,
            diet_profile=request.diet_profile,
        )
    except ValueError as exc:
        logger.warning("Non-fatal ingredient removal warning: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=ERROR_MESSAGE_GENERIC) from exc
    except RuntimeError as exc:
        logger.error("Fatal runtime error during ingredient removal: %s", exc, exc_info=True)
        raise HTTPException(status_code=503, detail=ERROR_MESSAGE_AI_UNAVAILABLE) from exc
    except Exception as exc:
        logger.error("Fatal unknown error during ingredient removal: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=ERROR_MESSAGE_GENERIC) from exc


@app.post(INGREDIENT_SUBSTITUTE_ENDPOINT, response_model=IngredientEditResponse)
async def ingredient_substitute(
    request: IngredientSubstitutionRequest,
) -> IngredientEditResponse:
    try:
        return await chat_service.handle_ingredient_substitution(
            recipe=request.recipe,
            old_ingredient_name=request.old_ingredient_name,
            new_ingredient_name=request.new_ingredient_name,
            diet_profile=request.diet_profile,
        )
    except ValueError as exc:
        logger.warning("Non-fatal ingredient substitution warning: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=ERROR_MESSAGE_GENERIC) from exc
    except RuntimeError as exc:
        logger.error("Fatal runtime error during ingredient substitution: %s", exc, exc_info=True)
        raise HTTPException(status_code=503, detail=ERROR_MESSAGE_AI_UNAVAILABLE) from exc
    except Exception as exc:
        logger.error("Fatal unknown error during ingredient substitution: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=ERROR_MESSAGE_GENERIC) from exc

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
