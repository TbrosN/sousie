import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "@/src/constants/app";
import { ChatMessage } from "@/src/types/chat";
import { Recipe } from "@/src/types/recipe";

function chatStorageKey(recipeId: string): string {
  return `${STORAGE_KEYS.chatKeyPrefix}${recipeId}`;
}

export class StorageService {
  static async readRecipes(): Promise<Recipe[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.recipes);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as Recipe[];
  }

  static async writeRecipes(recipes: Recipe[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(recipes));
  }

  static async readChatMessages(recipeId: string): Promise<ChatMessage[]> {
    const raw = await AsyncStorage.getItem(chatStorageKey(recipeId));
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as ChatMessage[];
  }

  static async writeChatMessages(recipeId: string, messages: ChatMessage[]): Promise<void> {
    await AsyncStorage.setItem(chatStorageKey(recipeId), JSON.stringify(messages));
  }

  static async deleteChatMessages(recipeId: string): Promise<void> {
    await AsyncStorage.removeItem(chatStorageKey(recipeId));
  }
}
