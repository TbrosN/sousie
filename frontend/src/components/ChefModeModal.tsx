import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScaledSize,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  formatChefModeProgress,
  formatRecipeStepTitle,
  formatTotalIngredientCount,
  UI_COPY,
} from "@/src/constants/app";
import { THEME } from "@/src/constants/theme";
import { Recipe } from "@/src/types/recipe";
import { computeDisplayIngredient, formatQuantityWithUnit } from "@/src/utils/recipeMath";

import { GlassSurface } from "./GlassSurface";

type ChefModeModalProps = {
  recipe: Recipe;
  visible: boolean;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
};

const WINDOW_WIDTH = Dimensions.get("window").width;

function ChefModeModalBody({
  recipe,
  visible,
  currentStepIndex,
  onStepChange,
  onClose,
  screenSize,
}: ChefModeModalProps & { screenSize: ScaledSize }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const stepCardMaxHeight = Math.max(
    THEME.layout.chefModeStepCardMinHeight,
    Math.floor(windowHeight * THEME.layout.chefModeStepCardMaxHeightRatio)
  );
  const listRef = useRef<FlatList<Recipe["steps"][number]>>(null);
  const totalSteps = recipe.steps.length;
  const [stepIngredientsExpanded, setStepIngredientsExpanded] = useState<Record<number, boolean>>(
    {}
  );

  useEffect(() => {
    if (!visible) {
      setStepIngredientsExpanded({});
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    listRef.current?.scrollToIndex({
      animated: false,
      index: currentStepIndex,
    });
  }, [currentStepIndex, visible]);

  function stepIngredientsAreExpanded(stepIndex: number): boolean {
    return stepIngredientsExpanded[stepIndex] !== false;
  }

  function toggleStepIngredients(stepIndex: number): void {
    setStepIngredientsExpanded((prev) => {
      const expanded = prev[stepIndex] !== false;
      return { ...prev, [stepIndex]: !expanded };
    });
  }

  function handleMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / WINDOW_WIDTH);
    if (nextIndex !== currentStepIndex) {
      onStepChange(nextIndex);
    }
  }

  return (
    <View
      style={[
        styles.screenSizedRoot,
        {
          width: screenSize.width,
          height: screenSize.height,
          backgroundColor: THEME.color.chefModeBackdrop,
        },
      ]}
    >
      <View style={styles.container}>
        <View style={styles.chrome}>
          <View style={styles.progressWrap}>
            <Text style={styles.kicker}>{UI_COPY.chefModeTitle}</Text>
            <Text style={styles.progressText}>
              {formatChefModeProgress(currentStepIndex, totalSteps)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={UI_COPY.chefModeClose}
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={22} color={THEME.color.textPrimary} />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          style={styles.list}
          data={recipe.steps}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          keyExtractor={(_, index) => `chef-mode-step-${index}`}
          renderItem={({ item, index }) => (
            <View style={styles.page}>
              <GlassSurface
                style={[styles.pageSurface, { maxHeight: stepCardMaxHeight }]}
                contentStyle={styles.pageSurfaceShell}
              >
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={{ maxHeight: stepCardMaxHeight }}
                  contentContainerStyle={styles.pageScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.pageEyebrow}>{formatRecipeStepTitle(index)}</Text>

                  <View style={styles.ingredientsSection}>
                    {item.ingredients.length === 0 ? (
                      <Text style={styles.ingredientsLabel}>{UI_COPY.chefModeNoIngredients}</Text>
                    ) : (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ expanded: stepIngredientsAreExpanded(index) }}
                          accessibilityLabel={
                            stepIngredientsAreExpanded(index)
                              ? UI_COPY.ingredientsListCollapseA11y
                              : UI_COPY.ingredientsListExpandA11y
                          }
                          hitSlop={THEME.space.hitSlop}
                          onPress={() => toggleStepIngredients(index)}
                          style={({ pressed }) => [
                            styles.ingredientsHeader,
                            pressed ? styles.ingredientsHeaderPressed : null,
                          ]}
                        >
                          <View style={styles.ingredientsHeaderText}>
                            <Text style={styles.ingredientsLabel}>
                              {UI_COPY.recipeIngredientsSectionTitle}
                            </Text>
                            {!stepIngredientsAreExpanded(index) ? (
                              <Text style={styles.ingredientsCollapsedSummary}>
                                {formatTotalIngredientCount(item.ingredients.length)}
                              </Text>
                            ) : null}
                          </View>
                          <Ionicons
                            name={stepIngredientsAreExpanded(index) ? "chevron-up" : "chevron-down"}
                            size={22}
                            color={THEME.color.textMuted}
                          />
                        </Pressable>
                        {stepIngredientsAreExpanded(index) ? (
                          <View style={styles.ingredientPillsWrap}>
                            {item.ingredients.map((ingredient, ingredientIndex) => {
                              const display = computeDisplayIngredient(ingredient, recipe.numServings);
                              return (
                                <View
                                  key={`${ingredient.name}-${ingredientIndex}`}
                                  style={styles.ingredientPill}
                                >
                                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                                  <Text style={styles.ingredientMeta}>
                                    {formatQuantityWithUnit(display.displayQuantity, display.unit)}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>

                  <Text style={styles.instructions}>{item.instructions}</Text>
                </ScrollView>
              </GlassSurface>
            </View>
          )}
          getItemLayout={(_, index) => ({
            length: WINDOW_WIDTH,
            offset: WINDOW_WIDTH * index,
            index,
          })}
        />

        <View
          style={[
            styles.footer,
            { paddingBottom: THEME.space.xxxl * 2 + insets.bottom },
          ]}
        >
          <Text style={styles.swipeHint}>{UI_COPY.chefModeSwipeHint}</Text>
        </View>
      </View>
    </View>
  );
}

export function ChefModeModal({
  recipe,
  visible,
  currentStepIndex,
  onStepChange,
  onClose,
}: ChefModeModalProps) {
  const [screenSize, setScreenSize] = useState(() => Dimensions.get("screen"));

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ screen }) => {
      setScreenSize(screen);
    });
    return () => sub.remove();
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent={Platform.OS === "android"}
      navigationBarTranslucent={Platform.OS === "android"}
      onRequestClose={onClose}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ChefModeModalBody
          recipe={recipe}
          visible={visible}
          currentStepIndex={currentStepIndex}
          onStepChange={onStepChange}
          onClose={onClose}
          screenSize={screenSize}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenSizedRoot: {
    flex: 0,
  },
  container: {
    flex: 1,
    paddingTop: THEME.space.xxxl * 3,
  },
  list: {
    flex: 1,
  },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: THEME.space.xxxl,
    marginBottom: THEME.space.xl,
    gap: THEME.space.lg,
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: THEME.radius.pill,
    paddingHorizontal: THEME.space.lg,
    paddingVertical: THEME.space.md,
    backgroundColor: THEME.color.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  progressWrap: {
    flex: 1,
    alignItems: "flex-start",
    gap: THEME.space.xs,
  },
  kicker: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeXs,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  progressText: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightSemibold,
  },
  page: {
    width: WINDOW_WIDTH,
    flex: 1,
    paddingHorizontal: THEME.space.xxxl,
    justifyContent: "center",
  },
  pageSurface: {
    width: "100%",
    maxWidth: THEME.layout.chefModeCardMaxWidth,
    alignSelf: "center",
  },
  pageSurfaceShell: {
    padding: 0,
    minHeight: 0,
    maxHeight: "100%",
  },
  pageScrollContent: {
    paddingHorizontal: THEME.space.xxxl * 2,
    paddingVertical: THEME.space.xxxl * 2,
    gap: THEME.space.sectionGap,
  },
  pageEyebrow: {
    color: THEME.color.accent,
    fontSize: THEME.font.sizeSm,
    fontWeight: THEME.font.weightSemibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  instructions: {
    color: THEME.color.textStrong,
    fontSize: THEME.font.sizeDisplay,
    lineHeight: THEME.font.lineHeightDisplay,
    fontWeight: THEME.font.weightBold,
  },
  ingredientsSection: {
    gap: THEME.space.md,
  },
  ingredientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: THEME.space.md,
    paddingVertical: THEME.space.xs,
    marginHorizontal: -THEME.space.xs,
    paddingHorizontal: THEME.space.xs,
  },
  ingredientsHeaderPressed: {
    opacity: 0.85,
  },
  ingredientsHeaderText: {
    flex: 1,
    gap: THEME.space.xs,
  },
  ingredientsCollapsedSummary: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeSm,
  },
  ingredientPillsWrap: {
    gap: THEME.space.md,
  },
  ingredientsLabel: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeSm,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  ingredientPill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: THEME.space.lg,
    paddingHorizontal: THEME.space.lg,
    paddingVertical: THEME.space.md,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.color.surfaceInteractive,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  ingredientName: {
    flex: 1,
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightSemibold,
  },
  ingredientMeta: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeMd,
  },
  footer: {
    paddingHorizontal: THEME.space.xxxl,
    paddingTop: THEME.space.xl,
    flexShrink: 0,
    backgroundColor: THEME.color.chefModeBackdrop,
  },
  swipeHint: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeXs,
    textAlign: "center",
  },
});
