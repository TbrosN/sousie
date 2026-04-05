from __future__ import annotations

import json
import os
import asyncio
from typing import Any

import httpx

from app.constants import DEFAULT_GEMINI_MODEL, GEMINI_API_URL_TEMPLATE, SYSTEM_PROMPT
from app.models import ChatMessage, DietProfile, GeminiActionEnvelope, Recipe
from app.tools import build_tool_prompt_contract


class GeminiClient:
    def __init__(self) -> None:
        self._api_key = os.getenv("GEMINI_API_KEY")
        self._model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
        self._known_tool_names = {
            entry["name"]
            for entry in build_tool_prompt_contract()
            if isinstance(entry, dict) and isinstance(entry.get("name"), str)
        }

    @property
    def is_enabled(self) -> bool:
        return bool(self._api_key)

    async def suggest_action(
        self,
        recipe: Recipe,
        recent_messages: list[ChatMessage],
        user_message: str,
        diet_profile: DietProfile | None = None,
    ) -> GeminiActionEnvelope:
        if not self._api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        url = GEMINI_API_URL_TEMPLATE.format(model=self._model, api_key=self._api_key)
        request_body = self._build_chat_request_body(
            recipe=recipe,
            recent_messages=recent_messages,
            user_message=user_message,
            diet_profile=diet_profile,
        )

        response_json = await self._request_with_retry(url, request_body)
        content_text = self._extract_text(response_json)
        try:
            parsed = json.loads(content_text)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Gemini returned invalid JSON output") from exc
        normalized = self._normalize_envelope(parsed)
        return GeminiActionEnvelope.model_validate(normalized)

    async def suggest_ingredient_substitutions(
        self,
        recipe: Recipe,
        ingredient_name: str,
        diet_profile: DietProfile | None = None,
    ) -> list[str]:
        if not self._api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        url = GEMINI_API_URL_TEMPLATE.format(model=self._model, api_key=self._api_key)
        request_body = self._build_substitutions_request_body(
            recipe=recipe,
            ingredient_name=ingredient_name,
            diet_profile=diet_profile,
        )

        response_json = await self._request_with_retry(url, request_body)
        content_text = self._extract_text(response_json)
        try:
            parsed = json.loads(content_text)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Gemini returned invalid JSON output") from exc

        substitutions = parsed.get("substitutions")
        if not isinstance(substitutions, list):
            raise RuntimeError("Gemini substitutions response was malformed")

        normalized: list[str] = []
        seen: set[str] = set()
        ingredient_name_normalized = ingredient_name.strip().lower()
        for item in substitutions:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()
            if not cleaned:
                continue
            lowered = cleaned.lower()
            if lowered == ingredient_name_normalized or lowered in seen:
                continue
            seen.add(lowered)
            normalized.append(cleaned)
            if len(normalized) >= 5:
                break

        if not normalized:
            raise RuntimeError("Gemini returned no ingredient substitutions")
        return normalized

    async def _request_with_retry(self, url: str, request_body: dict[str, Any]) -> dict[str, Any]:
        request_body_with_config = {
            **request_body,
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }
        max_attempts = 3
        backoff_seconds = [0.25, 0.75]
        timeout = httpx.Timeout(20.0, connect=10.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(max_attempts):
                try:
                    response = await client.post(url, json=request_body_with_config)
                    response.raise_for_status()
                    return response.json()
                except (httpx.ConnectError, httpx.ReadTimeout, httpx.RemoteProtocolError) as exc:
                    if attempt >= max_attempts - 1:
                        raise RuntimeError("Gemini request failed due to a transient network error") from exc
                    await asyncio.sleep(backoff_seconds[attempt])
                except httpx.HTTPStatusError as exc:
                    raise RuntimeError(f"Gemini request failed with status {exc.response.status_code}") from exc
                except httpx.HTTPError as exc:
                    raise RuntimeError("Gemini request failed before receiving a response") from exc
                except ValueError as exc:
                    raise RuntimeError("Gemini response was not valid JSON") from exc

        raise RuntimeError("Gemini request failed after retries")

    def _build_chat_request_body(
        self,
        recipe: Recipe,
        recent_messages: list[ChatMessage],
        user_message: str,
        diet_profile: DietProfile | None,
    ) -> dict[str, Any]:
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
            "diet_profile": self._serialize_diet_profile(diet_profile),
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
                "Always include assistant_message with a concise summary of what you changed or answered.",
                "If actions is non-empty, assistant_message should mention the key edits in plain language.",
                "Never introduce ingredients from allergies_and_hard_avoids.",
                "Treat mostly_avoid ingredients as soft constraints to minimize unless needed for recipe coherence.",
                "Prefer preferred_ingredients when they fit the user's request.",
                "If reference diet images are attached, use them as authoritative supporting context.",
            ],
            "response_schema": {
                "assistant_message": "string (required concise summary)",
                "messages": ["string", "... optional additional text chunks ..."],
                "action": {"type": "object | null", "required_when_not_null": ["type"]},
                "actions": [
                    {"type": "object", "required": ["type"], "description": "ordered tool payload"}
                ],
            },
        }
        return {
            "contents": [
                {
                    "parts": [
                        {"text": json.dumps(instruction)},
                        *self._build_image_parts(diet_profile),
                    ]
                }
            ]
        }

    def _build_substitutions_request_body(
        self,
        recipe: Recipe,
        ingredient_name: str,
        diet_profile: DietProfile | None,
    ) -> dict[str, Any]:
        instruction = {
            "system_prompt": (
                "You are helping a cooking app suggest ingredient substitutions. "
                "Return only practical replacements that fit the recipe context."
            ),
            "diet_profile": self._serialize_diet_profile(diet_profile),
            "recipe": recipe.model_dump(),
            "ingredient_to_replace": ingredient_name,
            "output_rules": [
                "Return plain JSON only.",
                "Return 3 to 5 substitution options.",
                "Favor substitutes that preserve the recipe's flavor, texture, and cooking method.",
                "Use concise ingredient names only, not sentences.",
                "Do not include the original ingredient.",
                "Never suggest ingredients from allergies_and_hard_avoids.",
                "Prefer preferred_ingredients when they are suitable substitutions.",
                "Minimize mostly_avoid ingredients unless options are limited.",
                "Use attached reference diet images when they contain relevant guidance.",
            ],
            "response_schema": {
                "substitutions": ["string", "string", "string"],
            },
        }
        return {
            "contents": [
                {
                    "parts": [
                        {"text": json.dumps(instruction)},
                        *self._build_image_parts(diet_profile),
                    ]
                }
            ]
        }

    def _serialize_diet_profile(self, diet_profile: DietProfile | None) -> dict[str, Any] | None:
        if diet_profile is None:
            return None

        return {
            "allergies_and_hard_avoids": diet_profile.allergies_and_hard_avoids,
            "mostly_avoid": diet_profile.mostly_avoid,
            "preferred_ingredients": diet_profile.preferred_ingredients,
            "freeform_notes": diet_profile.freeform_notes,
            "reference_images": [
                {
                    "id": image.id,
                    "filename": image.filename,
                    "mime_type": image.mime_type,
                    "width": image.width,
                    "height": image.height,
                    "file_size": image.file_size,
                    "included_inline": bool(image.data_base64),
                }
                for image in diet_profile.reference_images
            ],
        }

    def _build_image_parts(self, diet_profile: DietProfile | None) -> list[dict[str, Any]]:
        if diet_profile is None:
            return []

        parts: list[dict[str, Any]] = []
        for image in diet_profile.reference_images:
            if not image.data_base64:
                continue
            parts.append(
                {
                    "inlineData": {
                        "mimeType": image.mime_type or "image/jpeg",
                        "data": image.data_base64,
                    }
                }
            )
        return parts

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

        steps = payload.get("steps")
        if isinstance(steps, list):
            normalized_chunks: list[str] = []
            for step in steps:
                if not isinstance(step, dict):
                    continue
                for key in ("message", "assistant_message", "text", "content"):
                    value = step.get(key)
                    if isinstance(value, str) and value.strip():
                        normalized_chunks.append(value.strip())
                        break
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

        raw_tool_calls = payload.get("tool_calls")
        if isinstance(raw_tool_calls, list):
            for item in raw_tool_calls:
                normalized = self._normalize_action_shape(item)
                append_unique(normalized)

        steps = payload.get("steps")
        if isinstance(steps, list):
            for step in steps:
                if isinstance(step, dict):
                    nested_action = step.get("action")
                    append_unique(self._normalize_action_shape(nested_action))
                    nested_actions = step.get("actions")
                    if isinstance(nested_actions, list):
                        for nested in nested_actions:
                            append_unique(self._normalize_action_shape(nested))
                    nested_tool_call = step.get("tool_call")
                    append_unique(self._normalize_action_shape(nested_tool_call))

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

        if isinstance(action.get("name"), str):
            if action["name"] not in self._known_tool_names:
                return None
            tool_input = action.get("arguments")
            if isinstance(tool_input, dict):
                return {"type": action["name"], **tool_input}
            return {"type": action["name"]}

        if (
            isinstance(action.get("type"), str)
            and isinstance(action.get("input"), dict)
            and action.get("type")
        ):
            if action["type"] not in self._known_tool_names:
                return None
            return {"type": action["type"], **action["input"]}

        if isinstance(action.get("tool"), str):
            if action["tool"] not in self._known_tool_names:
                return None
            tool_input = action.get("input")
            if isinstance(tool_input, dict):
                return {"type": action["tool"], **tool_input}
            return {"type": action["tool"]}

        if isinstance(action.get("type"), str):
            if action["type"] not in self._known_tool_names and action["type"] != "none":
                return None
            return dict(action)
        return None
