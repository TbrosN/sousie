import { Ingredient, Recipe } from "@/src/types/recipe";

export type DisplayIngredient = Ingredient & {
  displayQuantity: number;
};

export type IngredientTotal = {
  name: string;
  unit: string;
  totalQuantity: number;
};

export function computeDisplayIngredient(
  ingredient: Ingredient,
  servings: number
): DisplayIngredient {
  return {
    ...ingredient,
    displayQuantity: ingredient.quantityPerServing * servings,
  };
}

export function computeIngredientTotals(recipe: Recipe): IngredientTotal[] {
  const totalsMap = new Map<string, IngredientTotal>();

  for (const step of recipe.steps) {
    for (const ingredient of step.ingredients) {
      const key = `${ingredient.name.toLowerCase()}|${ingredient.unit.toLowerCase()}`;
      const quantity = ingredient.quantityPerServing * recipe.numServings;
      const existing = totalsMap.get(key);

      if (existing) {
        existing.totalQuantity += quantity;
      } else {
        totalsMap.set(key, {
          name: ingredient.name,
          unit: ingredient.unit,
          totalQuantity: quantity,
        });
      }
    }
  }

  return Array.from(totalsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function formatQuantity(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(2)}`;
}
