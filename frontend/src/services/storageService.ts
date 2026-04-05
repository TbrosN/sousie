import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { STORAGE_KEYS } from "@/src/constants/app";
import { ChatMessage } from "@/src/types/chat";
import { DietProfile, DietProfileFactory } from "@/src/types/dietProfile";
import { Recipe } from "@/src/types/recipe";

function chatStorageKey(recipeId: string): string {
  return `${STORAGE_KEYS.chatKeyPrefix}${recipeId}`;
}

function dietProfileImagesDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("Local file storage is unavailable on this device");
  }
  return `${FileSystem.documentDirectory}diet-profile-images`;
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

  static async readDietProfile(): Promise<DietProfile> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.dietProfile);
    if (!raw) {
      return DietProfileFactory.createEmpty();
    }

    return {
      ...DietProfileFactory.createEmpty(),
      ...(JSON.parse(raw) as Partial<DietProfile>),
    };
  }

  static async writeDietProfile(profile: DietProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.dietProfile, JSON.stringify(profile));
  }

  static async ensureDietProfileImagesDirectory(): Promise<string> {
    const directory = dietProfileImagesDirectory();
    const info = await FileSystem.getInfoAsync(directory);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
    return directory;
  }

  static async copyDietProfileImage(sourceUri: string, targetFilename: string): Promise<string> {
    const directory = await this.ensureDietProfileImagesDirectory();
    const targetUri = `${directory}/${targetFilename}`;
    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetUri,
    });
    return targetUri;
  }

  static async deleteDietProfileImage(uri: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }

  static async readFileAsBase64(uri: string): Promise<string> {
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}
