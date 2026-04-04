import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { formatDeleteRecipeConfirmMessage, UI_COPY } from "@/src/constants/app";
import { useRecipes } from "@/src/context/RecipesContext";
import { logError } from "@/src/utils/logger";

const TRASH_ICON_COLOR = "#dc2626";

export function RecipeListScreen() {
  const router = useRouter();
  const { recipes, isLoading, createRecipe, deleteRecipe } = useRecipes();

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
          <View key={recipe.id} style={styles.recipeCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/recipes/[recipeId]",
                  params: { recipeId: recipe.id },
                })
              }
              style={styles.recipeCardMain}
            >
              <Text style={styles.recipeTitle}>{recipe.title}</Text>
              <Text style={styles.recipeSubtitle}>Servings: {recipe.numServings}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Delete ${recipe.title}`}
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => {
                Alert.alert(
                  UI_COPY.deleteRecipeConfirmTitle,
                  formatDeleteRecipeConfirmMessage(recipe.title),
                  [
                    { text: UI_COPY.deleteRecipeConfirmCancel, style: "cancel" },
                    {
                      text: UI_COPY.deleteRecipeConfirmDelete,
                      style: "destructive",
                      onPress: () => {
                        void deleteRecipe(recipe.id);
                      },
                    },
                  ]
                );
              }}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={22} color={TRASH_ICON_COLOR} />
            </Pressable>
          </View>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  recipeCardMain: {
    flex: 1,
    paddingVertical: 4,
    paddingRight: 8,
  },
  deleteButton: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
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
