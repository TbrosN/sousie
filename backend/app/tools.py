from __future__ import annotations

from typing import Callable

from langchain_core.tools import Tool

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


def remove_ingredient(recipe: Recipe, ingredient_name: str) -> Recipe:
    for step in recipe.steps:
        step.ingredients = [
            item
            for item in step.ingredients
            if item.name.strip().lower() != ingredient_name.strip().lower()
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


def string_replace(serialized_recipe: str, target: str, replacement: str) -> str:
    return serialized_recipe.replace(target, replacement)


def build_tools() -> dict[str, Tool]:
    def _tool(name: str, description: str, func: Callable[..., object]) -> Tool:
        return Tool(name=name, description=description, func=func)

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
    }
