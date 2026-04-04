from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class Ingredient(BaseModel):
    name: str
    quantity_per_serving: float = Field(ge=0)
    unit: str

    @field_validator("name", "unit")
    @classmethod
    def non_empty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Text fields must not be empty")
        return cleaned


class RecipeStep(BaseModel):
    instructions: str
    ingredients: list[Ingredient]

    @field_validator("instructions")
    @classmethod
    def instructions_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Step instructions must not be empty")
        return cleaned


class Recipe(BaseModel):
    id: str
    title: str
    num_servings: int = Field(ge=1, le=100)
    steps: list[RecipeStep]

    @field_validator("id", "title")
    @classmethod
    def non_empty_meta(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Recipe metadata must not be empty")
        return cleaned


class ChatMessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class ChatMessage(BaseModel):
    role: ChatMessageRole
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message content must not be empty")
        return cleaned


class SetServingsAction(BaseModel):
    type: Literal["set_servings"]
    servings: int = Field(ge=1, le=100)


class AddIngredientAction(BaseModel):
    type: Literal["add_ingredient"]
    step_index: int = Field(ge=0)
    name: str
    quantity_per_serving: float = Field(ge=0)
    unit: str


class RemoveIngredientAction(BaseModel):
    type: Literal["remove_ingredient"]
    name: str


class SubstituteIngredientAction(BaseModel):
    type: Literal["substitute_ingredient"]
    old_name: str
    new_name: str


class ReplaceInstructionsAction(BaseModel):
    type: Literal["replace_instructions"]
    step_index: int = Field(ge=0)
    instructions: str


class StringReplaceAction(BaseModel):
    type: Literal["string_replace"]
    target: str
    replacement: str


Action = (
    SetServingsAction
    | AddIngredientAction
    | RemoveIngredientAction
    | SubstituteIngredientAction
    | ReplaceInstructionsAction
    | StringReplaceAction
)


class ChatRequest(BaseModel):
    recipe_id: str
    recipe: Recipe
    messages: list[ChatMessage]
    user_message: str

    @field_validator("recipe_id", "user_message")
    @classmethod
    def non_empty_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Required field must not be empty")
        return cleaned


class ChatResponse(BaseModel):
    assistant_message: str
    recipe: Recipe
    action: dict[str, Any] | None = None


class GeminiActionEnvelope(BaseModel):
    assistant_message: str
    action: dict[str, Any] | None
