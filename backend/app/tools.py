from __future__ import annotations

import re
from typing import Callable

from langchain_core.tools import BaseTool, StructuredTool

from app.models import Ingredient, Recipe, RecipeStep


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


def update_step_ingredient(
    recipe: Recipe,
    step_index: int,
    ingredient_name: str,
    new_name: str,
    quantity_per_serving: float,
    unit: str,
) -> Recipe:
    for ingredient in recipe.steps[step_index].ingredients:
        if _ingredient_names_match(ingredient.name, ingredient_name):
            ingredient.name = new_name
            ingredient.quantity_per_serving = quantity_per_serving
            ingredient.unit = unit
            return recipe
    raise ValueError(f"Ingredient '{ingredient_name}' not found in step {step_index}")


def remove_ingredient(recipe: Recipe, name: str) -> Recipe:
    for step in recipe.steps:
        step.ingredients = [
            item
            for item in step.ingredients
            if not _ingredient_names_match(item.name, name)
        ]
    return recipe


def substitute_ingredient(recipe: Recipe, old_name: str, new_name: str) -> Recipe:
    for step in recipe.steps:
        for ingredient in step.ingredients:
            if _ingredient_names_match(ingredient.name, old_name):
                ingredient.name = new_name
    return recipe


def replace_step_instructions(recipe: Recipe, step_index: int, instructions: str) -> Recipe:
    recipe.steps[step_index].instructions = instructions
    return recipe


def replace_step(
    recipe: Recipe,
    step_index: int,
    instructions: str,
    ingredients: list[Ingredient],
) -> Recipe:
    recipe.steps[step_index].instructions = instructions
    recipe.steps[step_index].ingredients = ingredients
    return recipe


def insert_step(
    recipe: Recipe,
    step_index: int,
    instructions: str,
    ingredients: list[Ingredient],
) -> Recipe:
    bounded_index = min(step_index, len(recipe.steps))
    recipe.steps.insert(bounded_index, RecipeStep(instructions=instructions, ingredients=ingredients))
    return recipe


def delete_step(recipe: Recipe, step_index: int) -> Recipe:
    if step_index >= len(recipe.steps):
        raise ValueError(f"Step index {step_index} is out of range")
    del recipe.steps[step_index]
    return recipe


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
            "Add one structured ingredient to a specific step when the step text can stay as-is or will be updated by another action in the same turn.",
            add_ingredient,
        ),
        "update_step_ingredient": _tool(
            "update_step_ingredient",
            "Update one existing structured ingredient within a specific step, including its name, quantity, and unit. Use this for precise ingredient changes that do not require rebuilding the whole step.",
            update_step_ingredient,
        ),
        "remove_ingredient": _tool(
            "remove_ingredient",
            "Remove ingredient by name from all step ingredient lists only. This does not rewrite instructions.",
            remove_ingredient,
        ),
        "substitute_ingredient": _tool(
            "substitute_ingredient",
            "Swap one ingredient name for another across step ingredient lists only. This does not rewrite instructions.",
            substitute_ingredient,
        ),
        "replace_instructions": _tool(
            "replace_instructions",
            "Replace instructions text for a specific step. Use this only when the step ingredient list stays exactly the same.",
            replace_step_instructions,
        ),
        "replace_step": _tool(
            "replace_step",
            "Replace a full step including both instructions and its structured ingredient list. Use this whenever a step gains, loses, swaps, or changes ingredient quantities.",
            replace_step,
        ),
        "insert_step": _tool(
            "insert_step",
            "Insert a new step at a specific index with both instructions and structured ingredients. Use this when the recipe gains a new step.",
            insert_step,
        ),
        "delete_step": _tool(
            "delete_step",
            "Delete a step at a specific index. Use this when the recipe no longer needs that step.",
            delete_step,
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
            "description": "Add one structured ingredient to a specific step when the step text can stay as-is or will be updated by another action in the same turn.",
            "payload_schema": {
                "type": "add_ingredient",
                "step_index": "integer >= 0",
                "name": "string",
                "quantity_per_serving": "number >= 0",
                "unit": "string",
            },
        },
        {
            "name": "update_step_ingredient",
            "description": "Update one existing structured ingredient within a specific step, including its name, quantity, and unit. Use this for precise ingredient changes that do not require rebuilding the whole step.",
            "payload_schema": {
                "type": "update_step_ingredient",
                "step_index": "integer >= 0",
                "ingredient_name": "string",
                "new_name": "string",
                "quantity_per_serving": "number >= 0",
                "unit": "string",
            },
        },
        {
            "name": "remove_ingredient",
            "description": "Remove ingredient by name from all step ingredient lists only. This does not rewrite instructions.",
            "payload_schema": {"type": "remove_ingredient", "name": "string"},
        },
        {
            "name": "substitute_ingredient",
            "description": "Swap one ingredient name for another across step ingredient lists only. This does not rewrite instructions.",
            "payload_schema": {
                "type": "substitute_ingredient",
                "old_name": "string",
                "new_name": "string",
            },
        },
        {
            "name": "replace_instructions",
            "description": "Replace instructions text for a specific step. Use this only when the step ingredient list stays exactly the same.",
            "payload_schema": {
                "type": "replace_instructions",
                "step_index": "integer >= 0",
                "instructions": "string",
            },
        },
        {
            "name": "replace_step",
            "description": "Replace a full step including both instructions and its structured ingredient list. Use this whenever a step gains, loses, swaps, or changes ingredient quantities.",
            "payload_schema": {
                "type": "replace_step",
                "step_index": "integer >= 0",
                "instructions": "string",
                "ingredients": [
                    {
                        "name": "string",
                        "quantity_per_serving": "number >= 0",
                        "unit": "string",
                    }
                ],
            },
        },
        {
            "name": "insert_step",
            "description": "Insert a new step at a specific index with both instructions and structured ingredients. Use this when the recipe gains a new step.",
            "payload_schema": {
                "type": "insert_step",
                "step_index": "integer >= 0",
                "instructions": "string",
                "ingredients": [
                    {
                        "name": "string",
                        "quantity_per_serving": "number >= 0",
                        "unit": "string",
                    }
                ],
            },
        },
        {
            "name": "delete_step",
            "description": "Delete a step at a specific index. Use this when the recipe no longer needs that step.",
            "payload_schema": {
                "type": "delete_step",
                "step_index": "integer >= 0",
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


def _ingredient_names_match(candidate_name: str, query_name: str) -> bool:
    candidate_normalized = _normalize_ingredient_name(candidate_name)
    query_normalized = _normalize_ingredient_name(query_name)
    if not candidate_normalized or not query_normalized:
        return False
    if candidate_normalized == query_normalized:
        return True

    candidate_tokens = set(candidate_normalized.split())
    query_tokens = set(query_normalized.split())
    return bool(query_tokens) and query_tokens.issubset(candidate_tokens)


def _normalize_ingredient_name(value: str) -> str:
    raw_tokens = re.findall(r"[a-z0-9]+", value.lower())
    normalized_tokens = [_singularize_token(token) for token in raw_tokens if token]
    return " ".join(normalized_tokens)


def _singularize_token(token: str) -> str:
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 3 and token.endswith("es") and not token.endswith("ses"):
        return token[:-2]
    if len(token) > 2 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token
