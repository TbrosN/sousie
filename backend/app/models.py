from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class Ingredient(BaseModel):
    name: str
    quantity_per_serving: float = Field(ge=0)
    unit: str

    @field_validator("name")
    @classmethod
    def non_empty_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Text fields must not be empty")
        return cleaned

    @field_validator("unit")
    @classmethod
    def normalize_unit(cls, value: str) -> str:
        return value.strip()


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


class DietProfileImage(BaseModel):
    id: str
    filename: str | None = None
    mime_type: str | None = None
    width: int | None = Field(default=None, ge=1)
    height: int | None = Field(default=None, ge=1)
    file_size: int | None = Field(default=None, ge=1)
    data_base64: str | None = None

    @field_validator("id")
    @classmethod
    def image_id_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Image id must not be empty")
        return cleaned

    @field_validator("filename", "mime_type", "data_base64")
    @classmethod
    def optional_text_is_trimmed(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class DietProfile(BaseModel):
    allergies_and_hard_avoids: list[str] = Field(default_factory=list)
    mostly_avoid: list[str] = Field(default_factory=list)
    preferred_ingredients: list[str] = Field(default_factory=list)
    freeform_notes: str = ""
    reference_images: list[DietProfileImage] = Field(default_factory=list, max_length=3)

    @field_validator(
        "allergies_and_hard_avoids",
        "mostly_avoid",
        "preferred_ingredients",
        mode="before",
    )
    @classmethod
    def normalize_string_lists(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("Diet profile lists must be arrays")

        normalized: list[str] = []
        seen: set[str] = set()
        for item in value:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()
            if not cleaned:
                continue
            lowered = cleaned.lower()
            if lowered in seen:
                continue
            seen.add(lowered)
            normalized.append(cleaned)
        return normalized

    @field_validator("freeform_notes")
    @classmethod
    def normalize_freeform_notes(cls, value: str) -> str:
        return value.strip()


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


class UpdateStepIngredientAction(BaseModel):
    type: Literal["update_step_ingredient"]
    step_index: int = Field(ge=0)
    ingredient_name: str
    new_name: str
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


class ReplaceStepAction(BaseModel):
    type: Literal["replace_step"]
    step_index: int = Field(ge=0)
    instructions: str
    ingredients: list[Ingredient]


class InsertStepAction(BaseModel):
    type: Literal["insert_step"]
    step_index: int = Field(ge=0)
    instructions: str
    ingredients: list[Ingredient]


class DeleteStepAction(BaseModel):
    type: Literal["delete_step"]
    step_index: int = Field(ge=0)


class ReplaceRecipeAction(BaseModel):
    type: Literal["replace_recipe"]
    recipe: Recipe


Action = (
    SetServingsAction
    | AddIngredientAction
    | UpdateStepIngredientAction
    | RemoveIngredientAction
    | SubstituteIngredientAction
    | ReplaceInstructionsAction
    | ReplaceStepAction
    | InsertStepAction
    | DeleteStepAction
    | ReplaceRecipeAction
)


class ChatRequest(BaseModel):
    recipe_id: str
    recipe: Recipe
    messages: list[ChatMessage]
    user_message: str
    diet_profile: DietProfile | None = None

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


class IngredientSubstitutionsRequest(BaseModel):
    recipe: Recipe
    ingredient_name: str
    diet_profile: DietProfile | None = None

    @field_validator("ingredient_name")
    @classmethod
    def ingredient_name_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Ingredient name must not be empty")
        return cleaned


class IngredientSubstitutionsResponse(BaseModel):
    substitutions: list[str]


class IngredientRemovalRequest(BaseModel):
    recipe: Recipe
    ingredient_name: str
    diet_profile: DietProfile | None = None

    @field_validator("ingredient_name")
    @classmethod
    def ingredient_name_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Ingredient name must not be empty")
        return cleaned


class IngredientSubstitutionRequest(BaseModel):
    recipe: Recipe
    old_ingredient_name: str
    new_ingredient_name: str
    diet_profile: DietProfile | None = None

    @field_validator("old_ingredient_name", "new_ingredient_name")
    @classmethod
    def substitution_names_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Ingredient name must not be empty")
        return cleaned


class IngredientEditResponse(BaseModel):
    assistant_message: str
    recipe: Recipe


class GeminiActionEnvelope(BaseModel):
    assistant_message: str = ""
    action: dict[str, Any] | None = None
    actions: list[dict[str, Any]] = Field(default_factory=list)
