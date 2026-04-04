from __future__ import annotations

import json
import os
from typing import Any

import httpx

from app.constants import DEFAULT_GEMINI_MODEL, GEMINI_API_URL_TEMPLATE, SYSTEM_PROMPT
from app.models import ChatMessage, GeminiActionEnvelope, Recipe
from app.tools import build_tool_prompt_contract


class GeminiClient:
    def __init__(self) -> None:
        self._api_key = os.getenv("GEMINI_API_KEY")
        self._model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

    @property
    def is_enabled(self) -> bool:
        return bool(self._api_key)

    async def suggest_action(
        self,
        recipe: Recipe,
        recent_messages: list[ChatMessage],
        user_message: str,
    ) -> GeminiActionEnvelope:
        if not self._api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        url = GEMINI_API_URL_TEMPLATE.format(model=self._model, api_key=self._api_key)
        prompt_payload = self._build_prompt(recipe, recent_messages, user_message)

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt_payload}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "responseMimeType": "application/json",
                    },
                },
            )
            response.raise_for_status()

        response_json = response.json()
        content_text = self._extract_text(response_json)
        parsed = json.loads(content_text)
        normalized = self._normalize_envelope(parsed)
        return GeminiActionEnvelope.model_validate(normalized)

    def _build_prompt(
        self,
        recipe: Recipe,
        recent_messages: list[ChatMessage],
        user_message: str,
    ) -> str:
        recipe_likely_needs_initial_draft = (
            len(recipe.steps) == 0
            or recipe.title.strip().lower() in {"new recipe", "untitled", "recipe"}
        )
        messages_payload = [
            {"role": message.role.value, "content": message.content}
            for message in recent_messages
        ]
        instruction = {
            "system_prompt": SYSTEM_PROMPT,
            "flow_context": {
                "recipe_likely_needs_initial_draft": recipe_likely_needs_initial_draft,
                "phase_guidance": (
                    "If true, generate full recipe via replace_recipe. "
                    "If false, apply targeted revision actions to current recipe."
                ),
            },
            "recipe": recipe.model_dump(),
            "messages": messages_payload,
            "latest_user_message": user_message,
            "tools": build_tool_prompt_contract(),
            "output_rules": [
                "Return plain JSON only.",
                "You can respond with messages, tool calls, or both in one turn.",
                "For multiple operations, use actions as an ordered list of tool payloads.",
                "Each action.type must match a tool name exactly.",
                "Do not return a tool definition object, only payload values.",
                "If no recipe update is needed, set action to null and actions to [].",
            ],
            "response_schema": {
                "assistant_message": "string (optional if you provide messages[])",
                "messages": ["string", "... optional additional text chunks ..."],
                "action": {"type": "object | null", "required_when_not_null": ["type"]},
                "actions": [
                    {"type": "object", "required": ["type"], "description": "ordered tool payload"}
                ],
            },
        }
        return json.dumps(instruction)

    def _extract_text(self, payload: dict) -> str:
        candidates = payload.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini returned no candidates")

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        if not parts:
            raise RuntimeError("Gemini response had no text parts")

        text = parts[0].get("text", "").strip()
        if not text:
            raise RuntimeError("Gemini response text is empty")
        return text

    def _normalize_envelope(self, payload: Any) -> dict[str, Any]:
        if isinstance(payload, dict):
            actions = self._extract_actions(payload)
            assistant_message = self._extract_assistant_message(payload)
            if not assistant_message:
                assistant_message = (
                    "Updated the recipe."
                    if actions
                    else "Happy to help. Tell me what you'd like to change."
                )
            return {
                "assistant_message": assistant_message,
                "action": None,
                "actions": actions,
            }
        return {
            "assistant_message": "Happy to help. Tell me what you'd like to change.",
            "action": None,
            "actions": [],
        }

    def _extract_assistant_message(self, payload: dict[str, Any]) -> str:
        message_chunks = payload.get("messages")
        if isinstance(message_chunks, list):
            normalized_chunks = [
                chunk.strip()
                for chunk in message_chunks
                if isinstance(chunk, str) and chunk.strip()
            ]
            if normalized_chunks:
                return "\n\n".join(normalized_chunks)

        for key in ("assistant_message", "message", "response", "text"):
            value = payload.get(key)
            if isinstance(value, str):
                cleaned = value.strip()
                if cleaned:
                    return cleaned
        return ""

    def _extract_actions(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        actions: list[dict[str, Any]] = []
        seen: set[str] = set()

        def append_unique(action_payload: dict[str, Any] | None) -> None:
            if action_payload is None:
                return
            key = json.dumps(action_payload, sort_keys=True)
            if key in seen:
                return
            seen.add(key)
            actions.append(action_payload)

        raw_actions = payload.get("actions")
        if isinstance(raw_actions, list):
            for item in raw_actions:
                normalized = self._normalize_action_shape(item)
                append_unique(normalized)

        single_action = self._extract_single_action(payload)
        append_unique(single_action)

        return actions

    def _extract_single_action(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        action = payload.get("action")
        if isinstance(action, dict):
            return self._normalize_action_shape(action)
        if isinstance(action, str):
            if action.strip().lower() == "none":
                return {"type": "none"}
            return None

        # Some model outputs place action payload at top-level.
        action_type = payload.get("type")
        if isinstance(action_type, str):
            return self._normalize_action_shape(payload)

        return None

    def _normalize_action_shape(self, action: Any) -> dict[str, Any] | None:
        if not isinstance(action, dict):
            return None

        if (
            isinstance(action.get("type"), str)
            and isinstance(action.get("input"), dict)
            and action.get("type")
        ):
            return {"type": action["type"], **action["input"]}

        if isinstance(action.get("tool"), str):
            tool_input = action.get("input")
            if isinstance(tool_input, dict):
                return {"type": action["tool"], **tool_input}
            return {"type": action["tool"]}

        if isinstance(action.get("type"), str):
            return dict(action)
        return None
