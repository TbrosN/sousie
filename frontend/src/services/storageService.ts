import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "@/src/constants/app";
import { Recipe } from "@/src/types/recipe";

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
}
