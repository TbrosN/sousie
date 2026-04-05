import * as FileSystem from "expo-file-system/legacy";

import { BACKEND_CONFIG } from "@/src/constants/app";
import { LOG_MESSAGES } from "@/src/constants/logMessages";
import { ChatMessage } from "@/src/types/chat";
import { DietProfile } from "@/src/types/dietProfile";
import { Ingredient, Recipe, RecipeStep } from "@/src/types/recipe";
import { logWarning } from "@/src/utils/logger";

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

type BackendIngredientSubstitutionsResponse = {
  substitutions: string[];
};

type BackendIngredientEditResponse = {
  assistant_message: string;
  recipe: BackendRecipe;
};

type BackendDietProfileImage = {
  id: string;
  filename?: string;
  mime_type?: string;
  width?: number;
  height?: number;
  file_size?: number;
  data_base64?: string;
};

type BackendDietProfile = {
  allergies_and_hard_avoids: string[];
  mostly_avoid: string[];
  preferred_ingredients: string[];
  freeform_notes: string;
  reference_images: BackendDietProfileImage[];
};

export class BackendClient {
  static async sendChat(
    recipe: Recipe,
    messages: ChatMessage[],
    userMessage: string,
    dietProfile?: DietProfile
  ): Promise<{ assistantMessage: string; recipe: Recipe }> {
    const recentMessages = messages.map<BackendMessage>((message) => ({
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
          diet_profile: await toBackendDietProfile(dietProfile),
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

  static async suggestIngredientSubstitutions(
    recipe: Recipe,
    ingredientName: string,
    dietProfile?: DietProfile
  ): Promise<string[]> {
    const response = await fetch(
      `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.ingredientSubstitutionsPath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe: toBackendRecipe(recipe),
          ingredient_name: ingredientName,
          diet_profile: await toBackendDietProfile(dietProfile),
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Backend substitutions request failed");
    }

    const payload = (await response.json()) as BackendIngredientSubstitutionsResponse;
    return payload.substitutions;
  }

  static async removeIngredient(
    recipe: Recipe,
    ingredientName: string,
    dietProfile?: DietProfile
  ): Promise<{ assistantMessage: string; recipe: Recipe }> {
    const response = await fetch(
      `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.ingredientRemovePath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe: toBackendRecipe(recipe),
          ingredient_name: ingredientName,
          diet_profile: await toBackendDietProfile(dietProfile),
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Backend ingredient removal request failed");
    }

    const payload = (await response.json()) as BackendIngredientEditResponse;
    return {
      assistantMessage: payload.assistant_message,
      recipe: fromBackendRecipe(payload.recipe, recipe.updatedAt),
    };
  }

  static async substituteIngredient(
    recipe: Recipe,
    oldIngredientName: string,
    newIngredientName: string,
    dietProfile?: DietProfile
  ): Promise<{ assistantMessage: string; recipe: Recipe }> {
    const response = await fetch(
      `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.ingredientSubstitutePath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe: toBackendRecipe(recipe),
          old_ingredient_name: oldIngredientName,
          new_ingredient_name: newIngredientName,
          diet_profile: await toBackendDietProfile(dietProfile),
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Backend ingredient substitution request failed");
    }

    const payload = (await response.json()) as BackendIngredientEditResponse;
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

async function toBackendDietProfile(
  dietProfile?: DietProfile
): Promise<BackendDietProfile | null> {
  if (!dietProfile) {
    return null;
  }

  const imageResults = await Promise.all(
    dietProfile.referenceImages.map(async (image): Promise<BackendDietProfileImage | null> => {
      try {
        const info = await FileSystem.getInfoAsync(image.uri);
        if (!info.exists) {
          return null;
        }

        const dataBase64 = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        return {
          id: image.id,
          filename: image.filename,
          mime_type: image.mimeType ?? guessMimeType(image.filename ?? image.uri),
          width: image.width,
          height: image.height,
          file_size: image.fileSize,
          data_base64: dataBase64,
        };
      } catch (error) {
        logWarning(LOG_MESSAGES.dietProfileImageReadFailed, error);
        return null;
      }
    })
  );
  const referenceImages = imageResults.filter(isBackendDietProfileImage);

  return {
    allergies_and_hard_avoids: dietProfile.allergiesAndHardAvoids,
    mostly_avoid: dietProfile.mostlyAvoid,
    preferred_ingredients: dietProfile.preferredIngredients,
    freeform_notes: dietProfile.freeformNotes,
    reference_images: referenceImages,
  };
}

function guessMimeType(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalized.endsWith(".gif")) {
    return "image/gif";
  }
  return "image/jpeg";
}

function isBackendDietProfileImage(
  image: BackendDietProfileImage | null
): image is BackendDietProfileImage {
  return image !== null;
}
