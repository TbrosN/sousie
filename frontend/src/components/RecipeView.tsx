import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatRecipeServingsLine, formatRecipeStepTitle, UI_COPY } from "@/src/constants/app";
import { THEME } from "@/src/constants/theme";
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
      <Text style={styles.subtitle}>{formatRecipeServingsLine(recipe.numServings)}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{UI_COPY.recipeTotalIngredientsTitle}</Text>
        {totals.length === 0 ? (
          <Text style={styles.muted}>{UI_COPY.recipeNoIngredientsYet}</Text>
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
          <Text style={styles.cardTitle}>{formatRecipeStepTitle(index)}</Text>
          <Text style={styles.bodyText}>{step.instructions}</Text>
          <View style={styles.ingredientsBlock}>
            {step.ingredients.map((ingredient, ingredientIndex) => {
              const display = computeDisplayIngredient(ingredient, recipe.numServings);
              return (
                <Text key={`${ingredient.name}-${ingredientIndex}`} style={styles.ingredientText}>
                  {UI_COPY.recipeIngredientLinePrefix}
                  {ingredient.name}: {formatQuantity(display.displayQuantity)} {display.unit}
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
    padding: THEME.space.xxxl,
    gap: THEME.space.xl,
  },
  title: {
    fontSize: THEME.font.sizeHero,
    fontWeight: THEME.font.weightBold,
  },
  subtitle: {
    fontSize: THEME.font.sizeBody,
    color: THEME.color.textSecondary,
  },
  card: {
    backgroundColor: THEME.color.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.space.xl,
    gap: THEME.space.md,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  cardTitle: {
    fontSize: THEME.font.sizeTitle,
    fontWeight: THEME.font.weightSemibold,
  },
  bodyText: {
    fontSize: THEME.font.sizeMd,
    lineHeight: THEME.font.lineHeightBody,
    color: THEME.color.textPrimary,
  },
  ingredientText: {
    fontSize: THEME.font.sizeSm,
    color: THEME.color.textBody,
  },
  ingredientsBlock: {
    gap: THEME.space.xs,
  },
  muted: {
    color: THEME.color.textMuted,
  },
});
