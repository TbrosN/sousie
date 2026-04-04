from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic import ValidationError

from app.constants import MAX_CHAT_HISTORY
from app.gemini_client import GeminiClient
from app.models import (
    AddIngredientAction,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    Recipe,
    RemoveIngredientAction,
    ReplaceInstructionsAction,
    SetServingsAction,
    StringReplaceAction,
    SubstituteIngredientAction,
)
from app.tools import build_tools

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self, gemini_client: GeminiClient) -> None:
        self._gemini_client = gemini_client
        self._tools = build_tools()

    async def handle_chat(self, request: ChatRequest) -> ChatResponse:
        recipe = request.recipe
        recent_messages = request.messages[-MAX_CHAT_HISTORY:]

        action_payload, assistant_message = await self._select_action(
            recipe=recipe,
            recent_messages=recent_messages,
            user_message=request.user_message,
        )
        updated_recipe = self._apply_action(recipe=recipe, action_payload=action_payload)

        return ChatResponse(
            assistant_message=assistant_message,
            recipe=updated_recipe,
            action=action_payload,
        )

    async def _select_action(
        self,
        recipe: Recipe,
        recent_messages: list[ChatMessage],
        user_message: str,
    ) -> tuple[dict[str, Any] | None, str]:
        deterministic = self._deterministic_action(user_message)
        if deterministic is not None:
            return deterministic, "Updated the recipe."

        if self._gemini_client.is_enabled:
            gemini_output = await self._gemini_client.suggest_action(
                recipe=recipe,
                recent_messages=recent_messages,
                user_message=user_message,
            )
            return gemini_output.action, gemini_output.assistant_message

        return None, "I can help once Gemini is configured on the backend."

    def _deterministic_action(self, user_message: str) -> dict[str, Any] | None:
        lower_message = user_message.lower()

        servings_match = re.search(r"(\d+)\s*(servings?|people|portion)", lower_message)
        if "serving" in lower_message and servings_match is not None:
            return {"type": "set_servings", "servings": int(servings_match.group(1))}

        remove_match = re.search(r"(remove|without|don't have|dont have)\s+([a-zA-Z ]+)", lower_message)
        if remove_match is not None:
            return {"type": "remove_ingredient", "name": remove_match.group(2).strip()}

        substitute_match = re.search(
            r"(replace|substitute)\s+([a-zA-Z ]+)\s+(with|for)\s+([a-zA-Z ]+)",
            lower_message,
        )
        if substitute_match is not None:
            return {
                "type": "substitute_ingredient",
                "old_name": substitute_match.group(2).strip(),
                "new_name": substitute_match.group(4).strip(),
            }
        return None

    def _apply_action(self, recipe: Recipe, action_payload: dict[str, Any] | None) -> Recipe:
        if action_payload is None:
            return recipe

        action_type = action_payload.get("type")
        if action_type == "none":
            return recipe
        try:
            if action_type == "set_servings":
                action = SetServingsAction.model_validate(action_payload)
                return self._tools["set_servings"].func(recipe, action.servings)
            if action_type == "add_ingredient":
                action = AddIngredientAction.model_validate(action_payload)
                return self._tools["add_ingredient"].func(
                    recipe,
                    action.step_index,
                    action.name,
                    action.quantity_per_serving,
                    action.unit,
                )
            if action_type == "remove_ingredient":
                action = RemoveIngredientAction.model_validate(action_payload)
                return self._tools["remove_ingredient"].func(recipe, action.name)
            if action_type == "substitute_ingredient":
                action = SubstituteIngredientAction.model_validate(action_payload)
                return self._tools["substitute_ingredient"].func(
                    recipe,
                    action.old_name,
                    action.new_name,
                )
            if action_type == "replace_instructions":
                action = ReplaceInstructionsAction.model_validate(action_payload)
                return self._tools["replace_instructions"].func(
                    recipe,
                    action.step_index,
                    action.instructions,
                )
            if action_type == "string_replace":
                action = StringReplaceAction.model_validate(action_payload)
                serialized = recipe.model_dump_json()
                replaced = self._tools["string_replace"].func(
                    serialized,
                    action.target,
                    action.replacement,
                )
                return Recipe.model_validate(json.loads(replaced))
            return recipe
        except (ValidationError, ValueError, IndexError, KeyError) as exc:
            raise ValueError(f"Failed to apply action {action_payload}") from exc
