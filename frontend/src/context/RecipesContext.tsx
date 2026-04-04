import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { StorageService } from "@/src/services/storageService";
import { Recipe, RecipeFactory } from "@/src/types/recipe";
import { buildId } from "@/src/utils/ids";
import { logError } from "@/src/utils/logger";

type RecipesContextValue = {
  recipes: Recipe[];
  isLoading: boolean;
  createRecipe: () => Promise<Recipe>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getRecipeById: (id: string) => Recipe | undefined;
};

const RecipesContext = createContext<RecipesContextValue | null>(null);

export function RecipesProvider({ children }: PropsWithChildren) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize(): Promise<void> {
    try {
      const stored = await StorageService.readRecipes();
      setRecipes(stored);
    } catch (error) {
      logError("Failed to load recipes from storage.", error);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }

  const createRecipe = useCallback(async (): Promise<Recipe> => {
    const newRecipe = RecipeFactory.createBlank(buildId("recipe"));
    setRecipes((previous) => {
      const nextRecipes = [newRecipe, ...previous];
      void StorageService.writeRecipes(nextRecipes).catch((error) => {
        logError("Failed to persist newly created recipe.", error);
      });
      return nextRecipes;
    });
    return newRecipe;
  }, []);

  const updateRecipe = useCallback(async (recipe: Recipe): Promise<void> => {
    const updatedRecipe = { ...recipe, updatedAt: new Date().toISOString() };
    setRecipes((previous) => {
      const nextRecipes = previous.map((entry) =>
        entry.id === updatedRecipe.id ? updatedRecipe : entry
      );
      void StorageService.writeRecipes(nextRecipes).catch((error) => {
        logError("Failed to persist updated recipe.", error);
      });
      return nextRecipes;
    });
  }, []);

  const deleteRecipe = useCallback(async (id: string): Promise<void> => {
    setRecipes((previous) => {
      const nextRecipes = previous.filter((entry) => entry.id !== id);
      void StorageService.writeRecipes(nextRecipes).catch((error) => {
        logError("Failed to persist recipe deletion.", error);
      });
      return nextRecipes;
    });
  }, []);

  const getRecipeById = useCallback(
    (id: string): Recipe | undefined => recipes.find((recipe) => recipe.id === id),
    [recipes]
  );

  const value = useMemo<RecipesContextValue>(
    () => ({
      recipes,
      isLoading,
      createRecipe,
      updateRecipe,
      deleteRecipe,
      getRecipeById,
    }),
    [createRecipe, deleteRecipe, getRecipeById, isLoading, recipes, updateRecipe]
  );

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes(): RecipesContextValue {
  const context = useContext(RecipesContext);
  if (!context) {
    throw new Error("useRecipes must be used within RecipesProvider");
  }
  return context;
}
