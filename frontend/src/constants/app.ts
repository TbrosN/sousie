import { Platform } from "react-native";

export const STORAGE_KEYS = {
  recipes: "sousie.recipes.v1",
} as const;

export const UI_COPY = {
  offlineHint: "You're offline. Get back online to activate AI features.",
  aiInputPlaceholder: "Ask AI to modify this recipe...",
  genericError: "Something went wrong. Please try again.",
  emptyRecipes: "No recipes yet. Create your first one.",
  chatUnavailable: "AI is currently unavailable. Try again shortly.",
} as const;

export const UI_NUMBERS = {
  collapsedInputBottomPadding: 12,
  expandedHeightRatio: 0.72,
  collapseSwipeThreshold: 48,
} as const;

export const BACKEND_CONFIG = {
  baseUrl:
    Platform.OS === "android"
      ? "http://10.0.2.2:8000"
      : "http://127.0.0.1:8000",
  chatPath: "/api/chat",
} as const;
