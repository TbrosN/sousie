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
} as const;
