from __future__ import annotations

import json
from typing import Callable

from langchain_core.tools import BaseTool, StructuredTool

from app.models import Ingredient, Recipe


def set_servings(recipe: Recipe, servings: int) -> Recipe:
    recipe.num_servings = servings
    return recipe


def add_ingredient(
    recipe: Recipe,
    step_index: int,
    name: str,
    quantity_per_serving: float,
    unit: str,
) -> Recipe:
    recipe.steps[step_index].ingredients.append(
        Ingredient(
            name=name,
            quantity_per_serving=quantity_per_serving,
            unit=unit,
        )
    )
    return recipe


def remove_ingredient(recipe: Recipe, name: str) -> Recipe:
    for step in recipe.steps:
        step.ingredients = [
            item
            for item in step.ingredients
            if item.name.strip().lower() != name.strip().lower()
        ]
    return recipe


def substitute_ingredient(recipe: Recipe, old_name: str, new_name: str) -> Recipe:
    for step in recipe.steps:
        for ingredient in step.ingredients:
            if ingredient.name.strip().lower() == old_name.strip().lower():
                ingredient.name = new_name
    return recipe


def replace_step_instructions(recipe: Recipe, step_index: int, instructions: str) -> Recipe:
    recipe.steps[step_index].instructions = instructions
    return recipe


def string_replace(recipe: Recipe, target: str, replacement: str) -> Recipe:
    serialized_recipe = recipe.model_dump_json()
    replaced = serialized_recipe.replace(target, replacement)
    return Recipe.model_validate(json.loads(replaced))


def replace_recipe(recipe: Recipe, replacement: Recipe) -> Recipe:
    updated_recipe = replacement.model_copy(deep=True)
    updated_recipe.id = recipe.id
    return updated_recipe


def build_tools() -> dict[str, BaseTool]:
    def _tool(name: str, description: str, func: Callable[..., object]) -> BaseTool:
        return StructuredTool.from_function(
            func=func,
            name=name,
            description=description,
        )

    return {
        "set_servings": _tool(
            "set_servings",
            "Update number of servings for the recipe.",
            set_servings,
        ),
        "add_ingredient": _tool(
            "add_ingredient",
            "Add ingredient to a given step index.",
            add_ingredient,
        ),
        "remove_ingredient": _tool(
            "remove_ingredient",
            "Remove ingredient by name from all steps.",
            remove_ingredient,
        ),
        "substitute_ingredient": _tool(
            "substitute_ingredient",
            "Swap one ingredient name for another across steps.",
            substitute_ingredient,
        ),
        "replace_instructions": _tool(
            "replace_instructions",
            "Replace instructions text for a specific step.",
            replace_step_instructions,
        ),
        "string_replace": _tool(
            "string_replace",
            "Perform plain string replacement over serialized recipe JSON.",
            string_replace,
        ),
        "replace_recipe": _tool(
            "replace_recipe",
            "Replace the full recipe with a complete draft while preserving recipe id.",
            replace_recipe,
        ),
    }


def build_tool_prompt_contract() -> list[dict[str, object]]:
    return [
        {
            "name": "set_servings",
            "description": "Update number of servings for the recipe.",
            "payload_schema": {"type": "set_servings", "servings": "integer >= 1"},
        },
        {
            "name": "add_ingredient",
            "description": "Add ingredient to a given step index.",
            "payload_schema": {
                "type": "add_ingredient",
                "step_index": "integer >= 0",
                "name": "string",
                "quantity_per_serving": "number >= 0",
                "unit": "string",
            },
        },
        {
            "name": "remove_ingredient",
            "description": "Remove ingredient by name from all steps.",
            "payload_schema": {"type": "remove_ingredient", "name": "string"},
        },
        {
            "name": "substitute_ingredient",
            "description": "Swap one ingredient name for another across steps.",
            "payload_schema": {
                "type": "substitute_ingredient",
                "old_name": "string",
                "new_name": "string",
            },
        },
        {
            "name": "replace_instructions",
            "description": "Replace instructions text for a specific step.",
            "payload_schema": {
                "type": "replace_instructions",
                "step_index": "integer >= 0",
                "instructions": "string",
            },
        },
        {
            "name": "string_replace",
            "description": "Perform plain string replacement over serialized recipe JSON.",
            "payload_schema": {
                "type": "string_replace",
                "target": "string",
                "replacement": "string",
            },
        },
        {
            "name": "replace_recipe",
            "description": "Replace the full recipe with a complete draft while preserving recipe id.",
            "payload_schema": {
                "type": "replace_recipe",
                "replacement": {
                    "id": "string (current id is preserved server-side)",
                    "title": "string",
                    "num_servings": "integer >= 1",
                    "steps": [
                        {
                            "instructions": "string",
                            "ingredients": [
                                {
                                    "name": "string",
                                    "quantity_per_serving": "number >= 0",
                                    "unit": "string",
                                }
                            ],
                        }
                    ],
                },
            },
        },
    ]


def execute_agent_actions(
    recipe: Recipe,
    action_payloads: list[dict[str, object]],
    tools: dict[str, BaseTool],
) -> Recipe:
    updated_recipe = recipe
    for action_payload in action_payloads:
        normalized = _normalize_action_payload(action_payload)
        action_type = normalized.get("type")
        if action_type in {None, "none"}:
            continue
        if not isinstance(action_type, str):
            raise ValueError(f"Invalid action type in payload: {action_payload}")

        tool = tools.get(action_type)
        if tool is None:
            raise ValueError(f"Unknown tool action: {action_type}")

        tool_input = {key: value for key, value in normalized.items() if key != "type"}
        if action_type == "replace_recipe" and "recipe" in tool_input and "replacement" not in tool_input:
            tool_input["replacement"] = tool_input.pop("recipe")

        try:
            result = tool.invoke({"recipe": updated_recipe, **tool_input})
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"Failed to execute tool call {action_payload}: {exc}") from exc

        if not isinstance(result, Recipe):
            raise ValueError(f"Tool {action_type} did not return a Recipe")
        updated_recipe = result
    return updated_recipe


def _normalize_action_payload(action_payload: dict[str, object]) -> dict[str, object]:
    schema_payload = action_payload.get("schema")
    if not isinstance(schema_payload, dict):
        return action_payload

    normalized = {**schema_payload, **action_payload}
    normalized.pop("schema", None)
    return normalized
