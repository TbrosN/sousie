from __future__ import annotations

import json
import os

import httpx

from app.constants import DEFAULT_GEMINI_MODEL, GEMINI_API_URL_TEMPLATE, SYSTEM_PROMPT
from app.models import ChatMessage, GeminiActionEnvelope, Recipe


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
        return GeminiActionEnvelope.model_validate(parsed)

    def _build_prompt(
        self,
        recipe: Recipe,
        recent_messages: list[ChatMessage],
        user_message: str,
    ) -> str:
        messages_payload = [
            {"role": message.role.value, "content": message.content}
            for message in recent_messages
        ]
        instruction = {
            "system_prompt": SYSTEM_PROMPT,
            "recipe": recipe.model_dump(),
            "messages": messages_payload,
            "latest_user_message": user_message,
            "allowed_actions": [
                {
                    "type": "set_servings",
                    "schema": {"servings": "integer >= 1"},
                },
                {
                    "type": "add_ingredient",
                    "schema": {
                        "step_index": "integer >= 0",
                        "name": "string",
                        "quantity_per_serving": "number >= 0",
                        "unit": "string",
                    },
                },
                {"type": "remove_ingredient", "schema": {"name": "string"}},
                {
                    "type": "substitute_ingredient",
                    "schema": {"old_name": "string", "new_name": "string"},
                },
                {
                    "type": "replace_instructions",
                    "schema": {"step_index": "integer >= 0", "instructions": "string"},
                },
                {
                    "type": "string_replace",
                    "schema": {"target": "string", "replacement": "string"},
                },
                {"type": "none", "schema": {}},
            ],
            "response_schema": {
                "assistant_message": "string",
                "action": {
                    "type": "object | null",
                    "required_when_not_null": ["type"],
                },
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
