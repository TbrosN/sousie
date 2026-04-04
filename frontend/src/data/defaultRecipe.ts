import { Recipe } from "@/src/types/recipe";

export function buildSampleRecipe(id: string): Recipe {
  return {
    id,
    title: "Simple Lentil Soup",
    numServings: 2,
    updatedAt: new Date().toISOString(),
    steps: [
      {
        instructions: "Saute onion and garlic in olive oil until fragrant.",
        ingredients: [
          { name: "onion", quantityPerServing: 0.5, unit: "whole" },
          { name: "garlic", quantityPerServing: 1, unit: "clove" },
          { name: "olive oil", quantityPerServing: 0.5, unit: "tbsp" },
        ],
      },
      {
        instructions: "Add lentils and stock, then simmer for 20 minutes.",
        ingredients: [
          { name: "lentils", quantityPerServing: 100, unit: "g" },
          { name: "vegetable stock", quantityPerServing: 250, unit: "ml" },
        ],
      },
    ],
  };
}
