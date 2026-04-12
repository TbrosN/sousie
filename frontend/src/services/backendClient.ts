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

type BackendJsonValue =
  | string
  | number
  | boolean
  | null
  | BackendJsonValue[]
  | { [key: string]: BackendJsonValue };

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

    const payload = await postJson<BackendChatResponse>(
      `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.chatPath}`,
      {
        recipe_id: recipe.id,
        recipe: toBackendRecipe(recipe),
        messages: recentMessages,
        user_message: userMessage,
        diet_profile: await toBackendDietProfile(dietProfile),
      },
      "chat request"
    );
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
    const payload = await postJson<BackendIngredientSubstitutionsResponse>(
      `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.ingredientSubstitutionsPath}`,
      {
        recipe: toBackendRecipe(recipe),
        ingredient_name: ingredientName,
        diet_profile: await toBackendDietProfile(dietProfile),
      },
      "ingredient substitutions request"
    );
    return payload.substitutions;
  }

  static async removeIngredient(
    recipe: Recipe,
    ingredientName: string,
    dietProfile?: DietProfile
  ): Promise<{ assistantMessage: string; recipe: Recipe }> {
    const payload = await postJson<BackendIngredientEditResponse>(
      `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.ingredientRemovePath}`,
      {
        recipe: toBackendRecipe(recipe),
        ingredient_name: ingredientName,
        diet_profile: await toBackendDietProfile(dietProfile),
      },
      "ingredient removal request"
    );
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
    const payload = await postJson<BackendIngredientEditResponse>(
      `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.ingredientSubstitutePath}`,
      {
        recipe: toBackendRecipe(recipe),
        old_ingredient_name: oldIngredientName,
        new_ingredient_name: newIngredientName,
        diet_profile: await toBackendDietProfile(dietProfile),
      },
      "ingredient substitution request"
    );
    return {
      assistantMessage: payload.assistant_message,
      recipe: fromBackendRecipe(payload.recipe, recipe.updatedAt),
    };
  }
}

async function postJson<TResponse>(
  url: string,
  body: BackendJsonValue,
  requestLabel: string
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Backend ${requestLabel} could not reach ${url}. ${formatUnknownError(error)}`,
      { cause: error }
    );
  }

  if (!response.ok) {
    const responseDetails = await readErrorResponseDetails(response);
    throw new Error(
      `Backend ${requestLabel} failed with ${response.status} ${response.statusText} at ${url}${responseDetails}`
    );
  }

  try {
    return (await response.json()) as TResponse;
  } catch (error) {
    throw new Error(
      `Backend ${requestLabel} returned invalid JSON from ${url}. ${formatUnknownError(error)}`,
      { cause: error }
    );
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

async function readErrorResponseDetails(response: Response): Promise<string> {
  try {
    const rawText = await response.text();
    const trimmed = rawText.trim();
    if (!trimmed) {
      return "";
    }

    try {
      const parsed = JSON.parse(trimmed) as BackendJsonValue;
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        "detail" in parsed &&
        typeof parsed.detail === "string" &&
        parsed.detail.trim().length > 0
      ) {
        return ` - ${parsed.detail.trim()}`;
      }
    } catch {
      // Ignore JSON parse failures and fall back to raw text.
    }

    return ` - ${trimmed.slice(0, 200)}`;
  } catch (error) {
    return ` - failed to read error response body: ${formatUnknownError(error)}`;
  }
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
