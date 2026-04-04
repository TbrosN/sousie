export type Ingredient = {
  name: string;
  quantityPerServing: number;
  unit: string;
};

export type RecipeStep = {
  instructions: string;
  ingredients: Ingredient[];
};

export type Recipe = {
  id: string;
  title: string;
  numServings: number;
  steps: RecipeStep[];
  updatedAt: string;
};

export class RecipeFactory {
  static createBlank(id: string): Recipe {
    return {
      id,
      title: "Untitled Recipe",
      numServings: 2,
      steps: [
        {
          instructions: "Add your first step.",
          ingredients: [],
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}
