import { Platform } from "react-native";

export const STORAGE_KEYS = {
  recipes: "sousie.recipes.v1",
  /** Per-recipe chat transcripts: `${chatKeyPrefix}${recipeId}` */
  chatKeyPrefix: "sousie.chat.v1:",
} as const;

export const UI_COPY = {
  offlineHint: "You're offline. Get back online to activate AI features.",
  aiInputPlaceholder: "Ask AI to modify this recipe...",
  createRecipe: "Create Recipe",
  createRecipeCreating: "Creating recipe…",
  createRecipeAiFailed: "Could not generate that recipe. Check your connection and try again.",
  createRecipePromptPlaceholder: "What do you want to cook? e.g. lentil soup",
  genericError: "Something went wrong. Please try again.",
  emptyRecipes: "No recipes yet. Create your first one.",
  chatUnavailable: "AI is currently unavailable. Try again shortly.",
  ingredientActionsTitle: "Ingredient options",
  ingredientSwapTitle: "Choose a replacement",
  ingredientRemove: "Remove ingredient",
  ingredientSwap: "Swap ingredient",
  ingredientActionCancel: "Cancel",
  ingredientSuggestionsLoading: "Finding good replacements…",
  ingredientTapHint: "Tap any ingredient to replace or remove it.",
  chatSend: "Send",
  chatSendingEllipsis: "...",
  chatUserLabel: "You",
  chatAssistantLabel: "Sousie",
  invalidRecipeId: "Invalid recipe id.",
  deleteRecipeAccessibilityPrefix: "Delete",
  deleteRecipeConfirmTitle: "Delete recipe?",
  deleteRecipeConfirmCancel: "Cancel",
  deleteRecipeConfirmDelete: "Delete",
  servingsPrefix: "Servings:",
  recipeTotalIngredientsTitle: "Total Ingredients",
  recipeIngredientsSectionTitle: "Ingredients",
  recipeStepsSectionTitle: "Method",
  recipeNoIngredientsYet: "No ingredients yet.",
  recipeStepPrefix: "Step",
  recipeIngredientLinePrefix: "- ",
  openRecipeLabel: "Open recipe",
  recipeCardHint: "Tap to open recipe",
  presentationModeTitle: "Presentation Mode",
  presentationModeSubtitle: "Focus on one step at a time",
  presentationModeEnter: "Start cooking view",
  presentationModeClose: "Close presentation mode",
  presentationModePrevious: "Previous",
  presentationModeNext: "Next",
  presentationModeDone: "Done",
  presentationModeSwipeHint: "Swipe left or right to move between steps.",
  presentationModeEmpty: "This recipe needs at least one step before presentation mode can begin.",
} as const;

export function formatDeleteRecipeConfirmMessage(recipeTitle: string): string {
  return `Are you sure you want to delete "${recipeTitle}"? This cannot be undone.`;
}

export function formatDeleteRecipeAccessibilityLabel(recipeTitle: string): string {
  return `${UI_COPY.deleteRecipeAccessibilityPrefix} ${recipeTitle}`;
}

export function formatRecipeServingsLine(numServings: number): string {
  return `${UI_COPY.servingsPrefix} ${numServings}`;
}

export function formatRecipeStepTitle(stepIndexZeroBased: number): string {
  return `${UI_COPY.recipeStepPrefix} ${stepIndexZeroBased + 1}`;
}

export function formatPresentationProgress(
  stepIndexZeroBased: number,
  totalSteps: number
): string {
  return `${UI_COPY.recipeStepPrefix} ${stepIndexZeroBased + 1} of ${totalSteps}`;
}

const apiBaseUrlFromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
let apiBaseUrl: string;

if (apiBaseUrlFromEnv && apiBaseUrlFromEnv.length > 0) {
  apiBaseUrl = apiBaseUrlFromEnv.replace(/\/+$/, "");
} else if (Platform.OS === "android") {
  apiBaseUrl = "http://10.0.2.2:8000";
} else {
  apiBaseUrl = "http://127.0.0.1:8000";
}

export const BACKEND_CONFIG = {
  baseUrl: apiBaseUrl,
  chatPath: "/api/chat",
  ingredientRemovePath: "/api/ingredient-remove",
  ingredientSubstitutionsPath: "/api/ingredient-substitutions",
  ingredientSubstitutePath: "/api/ingredient-substitute",
} as const;
