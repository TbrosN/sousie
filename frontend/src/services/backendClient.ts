import { BACKEND_CONFIG, UI_NUMBERS } from "@/src/constants/app";
import { ChatMessage } from "@/src/types/chat";
import { Ingredient, Recipe, RecipeStep } from "@/src/types/recipe";

type BackendIngredient = {
  name: string;
  quantity_per_serving: number;
  unit: string;
};

type BackendStep = {
  instructions: string;
  ingredients: BackendIngredient[];
};

type BackendRecipe = {
  id: string;
  title: string;
  num_servings: number;
  steps: BackendStep[];
};

type BackendMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type BackendChatResponse = {
  assistant_message: string;
  recipe: BackendRecipe;
};

export class BackendClient {
  static async sendChat(
    recipe: Recipe,
    messages: ChatMessage[],
    userMessage: string
  ): Promise<{ assistantMessage: string; recipe: Recipe }> {
    const recentMessages = messages
      .slice(-UI_NUMBERS.maxChatMessagesForRequest)
      .map<BackendMessage>((message) => ({
        role: message.role,
        content: message.content,
      }));

    const response = await fetch(
      `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.chatPath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe_id: recipe.id,
          recipe: toBackendRecipe(recipe),
          messages: recentMessages,
          user_message: userMessage,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Backend request failed");
    }

    const payload = (await response.json()) as BackendChatResponse;
    return {
      assistantMessage: payload.assistant_message,
      recipe: fromBackendRecipe(payload.recipe, recipe.updatedAt),
    };
  }
}

function toBackendRecipe(recipe: Recipe): BackendRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    num_servings: recipe.numServings,
    steps: recipe.steps.map((step) => ({
      instructions: step.instructions,
      ingredients: step.ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantity_per_serving: ingredient.quantityPerServing,
        unit: ingredient.unit,
      })),
    })),
  };
}

function fromBackendRecipe(recipe: BackendRecipe, previousUpdatedAt: string): Recipe {
  return {
    id: recipe.id,
    title: recipe.title,
    numServings: recipe.num_servings,
    steps: recipe.steps.map<RecipeStep>((step) => ({
      instructions: step.instructions,
      ingredients: step.ingredients.map<Ingredient>((ingredient) => ({
        name: ingredient.name,
        quantityPerServing: ingredient.quantity_per_serving,
        unit: ingredient.unit,
      })),
    })),
    updatedAt: previousUpdatedAt,
  };
}
