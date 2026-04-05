from __future__ import annotations

import logging
from typing import Any

from app.constants import MAX_CHAT_HISTORY
from app.gemini_client import GeminiClient
from app.models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    DietProfile,
    IngredientEditResponse,
    IngredientSubstitutionsResponse,
    Recipe,
)
from app.tools import build_tools, execute_agent_actions

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self, gemini_client: GeminiClient) -> None:
        self._gemini_client = gemini_client
        self._tools = build_tools()

    async def handle_chat(self, request: ChatRequest) -> ChatResponse:
        recipe = request.recipe
        recent_messages = request.messages[-MAX_CHAT_HISTORY:]

        action_payloads, assistant_message = await self._select_actions(
            recipe=recipe,
            recent_messages=recent_messages,
            user_message=request.user_message,
            diet_profile=request.diet_profile,
        )
        updated_recipe = execute_agent_actions(
            recipe=recipe,
            action_payloads=action_payloads,
            tools=self._tools,
        )
        assistant_message = self._ensure_concise_summary(assistant_message, action_payloads)

        return ChatResponse(
            assistant_message=assistant_message,
            recipe=updated_recipe,
            action=action_payloads[-1] if action_payloads else None,
        )

    async def suggest_ingredient_substitutions(
        self,
        recipe: Recipe,
        ingredient_name: str,
        diet_profile: DietProfile | None = None,
    ) -> IngredientSubstitutionsResponse:
        substitutions = await self._gemini_client.suggest_ingredient_substitutions(
            recipe=recipe,
            ingredient_name=ingredient_name,
            diet_profile=diet_profile,
        )
        return IngredientSubstitutionsResponse(substitutions=substitutions)

    async def handle_ingredient_removal(
        self,
        recipe: Recipe,
        ingredient_name: str,
        diet_profile: DietProfile | None = None,
    ) -> IngredientEditResponse:
        deterministically_updated_recipe = execute_agent_actions(
            recipe=recipe,
            action_payloads=[{"type": "remove_ingredient", "name": ingredient_name}],
            tools=self._tools,
        )
        return await self._apply_post_ingredient_edit_cleanup(
            recipe=deterministically_updated_recipe,
            cleanup_prompt=(
                f"The ingredient {ingredient_name} has already been removed deterministically from all "
                "structured ingredient lists in the recipe. Starting from the current recipe only, make any "
                "follow-up instruction, quantity, or technique adjustments needed to keep the recipe coherent. "
                f"Do not re-add or reintroduce {ingredient_name}."
            ),
            fallback_message=(
                f"Removed {ingredient_name} from the ingredient lists and updated the recipe where needed."
            ),
            diet_profile=diet_profile,
        )

    async def handle_ingredient_substitution(
        self,
        recipe: Recipe,
        old_ingredient_name: str,
        new_ingredient_name: str,
        diet_profile: DietProfile | None = None,
    ) -> IngredientEditResponse:
        deterministically_updated_recipe = execute_agent_actions(
            recipe=recipe,
            action_payloads=[
                {
                    "type": "substitute_ingredient",
                    "old_name": old_ingredient_name,
                    "new_name": new_ingredient_name,
                }
            ],
            tools=self._tools,
        )
        return await self._apply_post_ingredient_edit_cleanup(
            recipe=deterministically_updated_recipe,
            cleanup_prompt=(
                f"The ingredient {old_ingredient_name} has already been deterministically replaced with "
                f"{new_ingredient_name} in all structured ingredient lists in the recipe. Starting from the "
                "current recipe only, make any follow-up instruction, quantity, or technique adjustments needed "
                "to keep the recipe coherent. Do not reintroduce the old ingredient unless the recipe truly "
                "needs both ingredients."
            ),
            fallback_message=(
                f"Swapped {old_ingredient_name} for {new_ingredient_name} and updated the recipe where needed."
            ),
            diet_profile=diet_profile,
        )

    async def _select_actions(
        self,
        recipe: Recipe,
        recent_messages: list[ChatMessage],
        user_message: str,
        diet_profile: DietProfile | None = None,
    ) -> tuple[list[dict[str, Any]], str]:
        if self._gemini_client.is_enabled:
            gemini_output = await self._gemini_client.suggest_action(
                recipe=recipe,
                recent_messages=recent_messages,
                user_message=user_message,
                diet_profile=diet_profile,
            )
            selected_actions = list(gemini_output.actions)
            if gemini_output.action is not None:
                selected_actions.append(gemini_output.action)
            return selected_actions, gemini_output.assistant_message

        return [], "I can help once Gemini is configured on the backend."

    async def _apply_post_ingredient_edit_cleanup(
        self,
        recipe: Recipe,
        cleanup_prompt: str,
        fallback_message: str,
        diet_profile: DietProfile | None = None,
    ) -> IngredientEditResponse:
        action_payloads, assistant_message = await self._select_actions(
            recipe=recipe,
            recent_messages=[],
            user_message=cleanup_prompt,
            diet_profile=diet_profile,
        )
        updated_recipe = execute_agent_actions(
            recipe=recipe,
            action_payloads=action_payloads,
            tools=self._tools,
        )
        cleaned_message = self._ensure_concise_summary(assistant_message, action_payloads).strip()
        if not cleaned_message or cleaned_message.lower() == "happy to help. what would you like to change?":
            cleaned_message = fallback_message
        return IngredientEditResponse(
            assistant_message=cleaned_message,
            recipe=updated_recipe,
        )

    def _ensure_concise_summary(
        self,
        assistant_message: str,
        action_payloads: list[dict[str, Any]],
    ) -> str:
        cleaned_message = assistant_message.strip()
        if cleaned_message and cleaned_message.lower() != "updated the recipe.":
            return cleaned_message

        if not action_payloads:
            return cleaned_message or "Happy to help. What would you like to change?"

        summary_parts: list[str] = []
        for action in action_payloads:
            action_type = action.get("type")
            if action_type == "set_servings":
                servings = action.get("servings")
                summary_parts.append(f"set servings to {servings}")
            elif action_type == "remove_ingredient":
                name = action.get("name")
                if isinstance(name, str) and name.strip():
                    summary_parts.append(f"removed {name.strip()}")
            elif action_type == "substitute_ingredient":
                old_name = action.get("old_name")
                new_name = action.get("new_name")
                if isinstance(old_name, str) and isinstance(new_name, str):
                    summary_parts.append(f"swapped {old_name.strip()} for {new_name.strip()}")
            elif action_type == "replace_recipe":
                summary_parts.append("generated or replaced the full recipe draft")
            elif action_type == "add_ingredient":
                name = action.get("name")
                if isinstance(name, str) and name.strip():
                    summary_parts.append(f"added {name.strip()}")
            elif action_type == "replace_instructions":
                step_index = action.get("step_index")
                summary_parts.append(f"updated instructions for step {step_index}")
            elif action_type == "string_replace":
                summary_parts.append("applied text updates across the recipe")

        if not summary_parts:
            return "I updated the recipe based on your request."

        return "I " + "; ".join(summary_parts) + "."
