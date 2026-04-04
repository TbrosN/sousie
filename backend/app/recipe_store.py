from __future__ import annotations

import json
from pathlib import Path

from app.constants import RUNTIME_DATA_DIR
from app.models import Recipe


class RecipeFileStore:
    def __init__(self, base_dir: Path | None = None) -> None:
        self._base_dir = base_dir or RUNTIME_DATA_DIR
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def _recipe_path(self, recipe_id: str) -> Path:
        safe_id = recipe_id.replace("/", "_")
        return self._base_dir / f"{safe_id}.json"

    def save(self, recipe: Recipe) -> None:
        path = self._recipe_path(recipe.id)
        path.write_text(recipe.model_dump_json(indent=2), encoding="utf-8")

    def load(self, recipe_id: str) -> Recipe:
        path = self._recipe_path(recipe_id)
        payload = json.loads(path.read_text(encoding="utf-8"))
        return Recipe.model_validate(payload)
