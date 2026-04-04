import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatRecipeServingsLine, formatRecipeStepTitle, UI_COPY } from "@/src/constants/app";
import { THEME } from "@/src/constants/theme";
import { Recipe } from "@/src/types/recipe";
import {
  computeDisplayIngredient,
  computeIngredientTotals,
  formatQuantityWithUnit,
} from "@/src/utils/recipeMath";

import { GlassSurface } from "./GlassSurface";

type RecipeViewProps = {
  recipe: Recipe;
  bottomInset: number;
  onPresentationModePress?: () => void;
  onIngredientSwapPress?: (ingredientName: string) => void;
  onIngredientRemovePress?: (ingredientName: string) => void;
  ingredientsDisabled?: boolean;
};

export function RecipeView({
  recipe,
  bottomInset,
  onPresentationModePress,
  onIngredientSwapPress,
  onIngredientRemovePress,
  ingredientsDisabled = false,
}: RecipeViewProps) {
  const totals = computeIngredientTotals(recipe);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
      <GlassSurface contentStyle={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleBlock}>
            <Text style={styles.eyebrow}>{UI_COPY.openRecipeLabel}</Text>
            <Text style={styles.title}>{recipe.title}</Text>
            <Text style={styles.subtitle}>{formatRecipeServingsLine(recipe.numServings)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!onPresentationModePress || recipe.steps.length === 0}
            onPress={onPresentationModePress}
            style={({ pressed }) => [
              styles.presentationButton,
              pressed ? styles.presentationButtonPressed : null,
              recipe.steps.length === 0 ? styles.presentationButtonDisabled : null,
            ]}
          >
            <Ionicons name="play-circle" size={22} color={THEME.color.onPrimary} />
            <View style={styles.presentationCopy}>
              <Text style={styles.presentationLabel}>{UI_COPY.presentationModeTitle}</Text>
              <Text style={styles.presentationValue}>
                {recipe.steps.length === 0
                  ? UI_COPY.presentationModeEmpty
                  : UI_COPY.presentationModeEnter}
              </Text>
            </View>
          </Pressable>
        </View>
      </GlassSurface>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{UI_COPY.recipeIngredientsSectionTitle}</Text>
        {totals.length > 0 ? <Text style={styles.hintText}>{UI_COPY.ingredientTapHint}</Text> : null}
      </View>

      <GlassSurface contentStyle={styles.sectionCard}>
        <Text style={styles.cardTitle}>{UI_COPY.recipeTotalIngredientsTitle}</Text>
        {totals.length === 0 ? (
          <Text style={styles.muted}>{UI_COPY.recipeNoIngredientsYet}</Text>
        ) : (
          <View style={styles.ingredientsGrid}>
            {totals.map((ingredient) => {
              const swapDisabled =
                !onIngredientSwapPress || ingredientsDisabled;
              const removeDisabled =
                !onIngredientRemovePress || ingredientsDisabled;
              return (
                <View
                  key={`${ingredient.name}-${ingredient.unit}`}
                  style={[
                    styles.ingredientRow,
                    ingredientsDisabled ? styles.ingredientRowDisabled : null,
                  ]}
                >
                  <View style={styles.ingredientCopy}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientValue}>
                      {formatQuantityWithUnit(ingredient.totalQuantity, ingredient.unit)}
                    </Text>
                  </View>
                  <View style={styles.ingredientActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Swap ${ingredient.name}`}
                      disabled={swapDisabled}
                      hitSlop={THEME.space.hitSlop}
                      onPress={() => onIngredientSwapPress?.(ingredient.name)}
                      style={({ pressed }) => [
                        styles.ingredientIconButton,
                        pressed && !swapDisabled ? styles.ingredientIconButtonPressed : null,
                      ]}
                    >
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={20}
                        color={
                          swapDisabled ? THEME.color.controlDisabled : THEME.color.textMuted
                        }
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${ingredient.name}`}
                      disabled={removeDisabled}
                      hitSlop={THEME.space.hitSlop}
                      onPress={() => onIngredientRemovePress?.(ingredient.name)}
                      style={({ pressed }) => [
                        styles.ingredientIconButton,
                        pressed && !removeDisabled ? styles.ingredientIconButtonPressed : null,
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={
                          removeDisabled ? THEME.color.controlDisabled : THEME.color.destructive
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </GlassSurface>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{UI_COPY.recipeStepsSectionTitle}</Text>
        <Text style={styles.sectionCaption}>{`${recipe.steps.length} steps`}</Text>
      </View>

      {recipe.steps.map((step, index) => (
        <GlassSurface key={`step-${index}`} contentStyle={styles.stepCard}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>{formatRecipeStepTitle(index)}</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{step.ingredients.length} ingredients</Text>
            </View>
          </View>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.bodyText}>{step.instructions}</Text>
          <View style={styles.stepIngredientsSection}>
            <Text style={styles.ingredientsLabel}>{UI_COPY.recipeIngredientsSectionTitle}</Text>
            <View style={styles.ingredientsBlock}>
              {step.ingredients.length === 0 ? (
                <Text style={styles.emptyStepIngredientText}>{UI_COPY.recipeNoIngredientsYet}</Text>
              ) : (
                step.ingredients.map((ingredient, ingredientIndex) => {
                  const display = computeDisplayIngredient(ingredient, recipe.numServings);
                  return (
                    <View key={`${ingredient.name}-${ingredientIndex}`} style={styles.stepIngredientPill}>
                      <Text style={styles.stepIngredientName}>{ingredient.name}</Text>
                      <Text style={styles.stepIngredientQuantity}>
                        {formatQuantityWithUnit(display.displayQuantity, display.unit)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </GlassSurface>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: THEME.space.xxxl,
    gap: THEME.space.sectionGap,
  },
  heroCard: {
    minHeight: THEME.layout.heroMinHeight,
    padding: THEME.space.xxxl,
    gap: THEME.space.sectionGap,
  },
  heroTopRow: {
    gap: THEME.space.sectionGap,
  },
  heroTitleBlock: {
    gap: THEME.space.sm,
  },
  eyebrow: {
    fontSize: THEME.font.sizeXs,
    color: THEME.color.textMuted,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: THEME.font.sizeDisplay,
    fontWeight: THEME.font.weightSemibold,
    color: THEME.color.textStrong,
    lineHeight: THEME.font.lineHeightDisplay,
  },
  subtitle: {
    fontSize: THEME.font.sizeBody,
    color: THEME.color.textSecondary,
  },
  presentationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.space.md,
    borderRadius: THEME.radius.xl,
    paddingHorizontal: THEME.space.xl,
    paddingVertical: THEME.space.xl,
    backgroundColor: THEME.color.accentStrong,
  },
  presentationButtonPressed: {
    opacity: 0.9,
  },
  presentationButtonDisabled: {
    opacity: 0.5,
  },
  presentationCopy: {
    flex: 1,
    gap: THEME.space.xs,
  },
  presentationLabel: {
    color: THEME.color.onPrimary,
    fontSize: THEME.font.sizeSm,
    fontWeight: THEME.font.weightBold,
  },
  presentationValue: {
    color: THEME.color.onPrimary,
    fontSize: THEME.font.sizeXs,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: THEME.space.md,
  },
  sectionTitle: {
    fontSize: THEME.font.sizeTitle,
    fontWeight: THEME.font.weightBold,
    color: THEME.color.textPrimary,
  },
  sectionCaption: {
    fontSize: THEME.font.sizeSm,
    color: THEME.color.textMuted,
  },
  sectionCard: {
    padding: THEME.space.xxxl,
    gap: THEME.space.lg,
  },
  cardTitle: {
    fontSize: THEME.font.sizeBody,
    fontWeight: THEME.font.weightSemibold,
    color: THEME.color.textSecondary,
  },
  bodyText: {
    fontSize: THEME.font.sizeMd,
    lineHeight: THEME.font.lineHeightBody,
    color: THEME.color.textBody,
  },
  ingredientsGrid: {
    gap: THEME.space.md,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: THEME.space.lg,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: THEME.space.lg,
    paddingVertical: THEME.space.sm,
    backgroundColor: THEME.color.surfaceInteractive,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  ingredientRowDisabled: {
    opacity: 0.55,
  },
  ingredientCopy: {
    flex: 1,
    gap: THEME.space.xs,
  },
  ingredientName: {
    fontSize: THEME.font.sizeMd,
    color: THEME.color.textPrimary,
    fontWeight: THEME.font.weightSemibold,
  },
  ingredientValue: {
    fontSize: THEME.font.sizeSm,
    color: THEME.color.textSecondary,
  },
  ingredientActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.space.sm,
  },
  ingredientIconButton: {
    padding: THEME.space.sm,
    borderRadius: THEME.radius.md,
  },
  ingredientIconButtonPressed: {
    backgroundColor: THEME.color.accentSoft,
  },
  stepCard: {
    padding: THEME.space.xxxl,
    gap: THEME.space.lg,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: THEME.space.md,
  },
  stepTitle: {
    fontSize: THEME.font.sizeLg,
    color: THEME.color.textPrimary,
    fontWeight: THEME.font.weightBold,
  },
  stepBadge: {
    paddingHorizontal: THEME.space.md,
    paddingVertical: THEME.space.sm,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.color.surfaceInteractive,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  stepBadgeText: {
    fontSize: THEME.font.sizeXs,
    color: THEME.color.textSecondary,
  },
  instructionsLabel: {
    fontSize: THEME.font.sizeXs,
    color: THEME.color.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  stepIngredientsSection: {
    gap: THEME.space.md,
    paddingTop: THEME.space.sm,
  },
  ingredientsLabel: {
    fontSize: THEME.font.sizeXs,
    color: THEME.color.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  ingredientsBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.space.sm,
  },
  stepIngredientPill: {
    paddingHorizontal: THEME.space.md,
    paddingVertical: THEME.space.sm,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.color.surfaceInteractive,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  stepIngredientName: {
    fontSize: THEME.font.sizeSm,
    color: THEME.color.textPrimary,
    fontWeight: THEME.font.weightSemibold,
  },
  stepIngredientQuantity: {
    fontSize: THEME.font.sizeXs,
    color: THEME.color.textSecondary,
  },
  hintText: {
    fontSize: THEME.font.sizeXs,
    color: THEME.color.textMuted,
  },
  muted: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeMd,
  },
  emptyStepIngredientText: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeSm,
  },
});
