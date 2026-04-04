import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { UI_COPY } from "@/src/constants/app";
import { useRecipes } from "@/src/context/RecipesContext";
import { logError } from "@/src/utils/logger";

export function RecipeListScreen() {
  const router = useRouter();
  const { recipes, isLoading, createRecipe } = useRecipes();

  async function handleCreateRecipe(): Promise<void> {
    try {
      const recipe = await createRecipe();
      router.push({
        pathname: "/recipes/[recipeId]",
        params: { recipeId: recipe.id },
      });
    } catch (error) {
      logError("Failed to create recipe.", error);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" onPress={handleCreateRecipe} style={styles.createButton}>
        <Text style={styles.createButtonText}>Create Recipe</Text>
      </Pressable>

      {recipes.length === 0 ? (
        <Text style={styles.emptyText}>{UI_COPY.emptyRecipes}</Text>
      ) : (
        recipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/recipes/[recipeId]",
                params: { recipeId: recipe.id },
              })
            }
            style={styles.recipeCard}
          >
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <Text style={styles.recipeSubtitle}>Servings: {recipe.numServings}</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
    gap: 10,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    backgroundColor: "#0284c7",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  createButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  recipeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  recipeSubtitle: {
    marginTop: 4,
    color: "#4b5563",
  },
  emptyText: {
    color: "#6b7280",
  },
});
