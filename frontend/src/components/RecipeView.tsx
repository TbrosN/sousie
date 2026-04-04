import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Recipe } from "@/src/types/recipe";
import {
  computeDisplayIngredient,
  computeIngredientTotals,
  formatQuantity,
} from "@/src/utils/recipeMath";

type RecipeViewProps = {
  recipe: Recipe;
  bottomInset: number;
};

export function RecipeView({ recipe, bottomInset }: RecipeViewProps) {
  const totals = computeIngredientTotals(recipe);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
      <Text style={styles.title}>{recipe.title}</Text>
      <Text style={styles.subtitle}>Servings: {recipe.numServings}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Ingredients</Text>
        {totals.length === 0 ? (
          <Text style={styles.muted}>No ingredients yet.</Text>
        ) : (
          totals.map((ingredient) => (
            <Text key={`${ingredient.name}-${ingredient.unit}`} style={styles.bodyText}>
              {ingredient.name}: {formatQuantity(ingredient.totalQuantity)} {ingredient.unit}
            </Text>
          ))
        )}
      </View>

      {recipe.steps.map((step, index) => (
        <View key={`step-${index}`} style={styles.card}>
          <Text style={styles.cardTitle}>Step {index + 1}</Text>
          <Text style={styles.bodyText}>{step.instructions}</Text>
          <View style={styles.ingredientsBlock}>
            {step.ingredients.map((ingredient, ingredientIndex) => {
              const display = computeDisplayIngredient(ingredient, recipe.numServings);
              return (
                <Text key={`${ingredient.name}-${ingredientIndex}`} style={styles.ingredientText}>
                  - {ingredient.name}: {formatQuantity(display.displayQuantity)} {display.unit}
                </Text>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    color: "#4b5563",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#111827",
  },
  ingredientText: {
    fontSize: 14,
    color: "#374151",
  },
  ingredientsBlock: {
    gap: 4,
  },
  muted: {
    color: "#6b7280",
  },
});
