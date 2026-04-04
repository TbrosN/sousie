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
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  formatPresentationProgress,
  formatRecipeStepTitle,
  UI_COPY,
} from "@/src/constants/app";
import { THEME } from "@/src/constants/theme";
import { Recipe } from "@/src/types/recipe";
import { computeDisplayIngredient, formatQuantityWithUnit } from "@/src/utils/recipeMath";

import { GlassSurface } from "./GlassSurface";

type PresentationModeModalProps = {
  recipe: Recipe;
  visible: boolean;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
};

const WINDOW_WIDTH = Dimensions.get("window").width;

function PresentationModeModalBody({
  recipe,
  visible,
  currentStepIndex,
  onStepChange,
  onClose,
  screenSize,
}: PresentationModeModalProps & { screenSize: ScaledSize }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Recipe["steps"][number]>>(null);
  const totalSteps = recipe.steps.length;

  useEffect(() => {
    if (!visible) {
      return;
    }
    listRef.current?.scrollToIndex({
      animated: false,
      index: currentStepIndex,
    });
  }, [currentStepIndex, visible]);

  function handleMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / WINDOW_WIDTH);
    if (nextIndex !== currentStepIndex) {
      onStepChange(nextIndex);
    }
  }

  function goToStep(index: number): void {
    const boundedIndex = Math.max(0, Math.min(index, totalSteps - 1));
    listRef.current?.scrollToIndex({ index: boundedIndex, animated: true });
    if (boundedIndex !== currentStepIndex) {
      onStepChange(boundedIndex);
    }
  }

  return (
    <View
      style={[
        styles.screenSizedRoot,
        {
          width: screenSize.width,
          height: screenSize.height,
          backgroundColor: THEME.color.presentationBackdrop,
        },
      ]}
    >
      <View style={styles.container}>
        <View style={styles.chrome}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={THEME.color.textPrimary} />
            <Text style={styles.closeText}>{UI_COPY.presentationModeClose}</Text>
          </Pressable>
          <View style={styles.progressWrap}>
            <Text style={styles.kicker}>{UI_COPY.presentationModeTitle}</Text>
            <Text style={styles.progressText}>
              {formatPresentationProgress(currentStepIndex, totalSteps)}
            </Text>
          </View>
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
          keyExtractor={(_, index) => `presentation-step-${index}`}
          renderItem={({ item, index }) => (
            <View style={styles.page}>
              <GlassSurface style={styles.pageSurface} contentStyle={styles.pageSurfaceContent}>
                <Text style={styles.pageEyebrow}>{formatRecipeStepTitle(index)}</Text>
                <Text style={styles.instructions}>{item.instructions}</Text>

                <View style={styles.ingredientsSection}>
                  <Text style={styles.ingredientsLabel}>{UI_COPY.recipeIngredientsSectionTitle}</Text>
                  {item.ingredients.length === 0 ? (
                    <Text style={styles.ingredientsEmpty}>{UI_COPY.ingredientsNone}</Text>
                  ) : (
                    item.ingredients.map((ingredient, ingredientIndex) => {
                      const display = computeDisplayIngredient(ingredient, recipe.numServings);
                      return (
                        <View key={`${ingredient.name}-${ingredientIndex}`} style={styles.ingredientPill}>
                          <Text style={styles.ingredientName}>{ingredient.name}</Text>
                          <Text style={styles.ingredientMeta}>
                            {formatQuantityWithUnit(display.displayQuantity, display.unit)}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
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
          <Text style={styles.swipeHint}>{UI_COPY.presentationModeSwipeHint}</Text>
          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              disabled={currentStepIndex === 0}
              onPress={() => goToStep(currentStepIndex - 1)}
              style={[styles.navButton, currentStepIndex === 0 && styles.navButtonDisabled]}
            >
              <Ionicons name="chevron-back" size={18} color={THEME.color.textPrimary} />
              <Text style={styles.navText}>{UI_COPY.presentationModePrevious}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                currentStepIndex === totalSteps - 1 ? onClose() : goToStep(currentStepIndex + 1)
              }
              style={styles.navButtonPrimary}
            >
              <Text style={styles.navPrimaryText}>
                {currentStepIndex === totalSteps - 1
                  ? UI_COPY.presentationModeDone
                  : UI_COPY.presentationModeNext}
              </Text>
              <Ionicons
                name={currentStepIndex === totalSteps - 1 ? "checkmark" : "chevron-forward"}
                size={18}
                color={THEME.color.onPrimary}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export function PresentationModeModal({
  recipe,
  visible,
  currentStepIndex,
  onStepChange,
  onClose,
}: PresentationModeModalProps) {
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
        <PresentationModeModalBody
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: THEME.space.xxxl,
    marginBottom: THEME.space.xl,
    gap: THEME.space.lg,
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.space.sm,
    borderRadius: THEME.radius.pill,
    paddingHorizontal: THEME.space.lg,
    paddingVertical: THEME.space.md,
    backgroundColor: THEME.color.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  closeText: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeSm,
    fontWeight: THEME.font.weightSemibold,
  },
  progressWrap: {
    alignItems: "flex-end",
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
    maxWidth: THEME.layout.presentationCardMaxWidth,
    alignSelf: "center",
  },
  pageSurfaceContent: {
    minHeight: "70%",
    paddingHorizontal: THEME.space.xxxl * 2,
    paddingVertical: THEME.space.xxxl * 2,
    justifyContent: "space-between",
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
  ingredientsLabel: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeSm,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  ingredientsEmpty: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeMd,
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
    gap: THEME.space.lg,
    flexShrink: 0,
    backgroundColor: THEME.color.presentationBackdrop,
  },
  swipeHint: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeXs,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    gap: THEME.space.md,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: THEME.space.sm,
    borderRadius: THEME.radius.pill,
    paddingVertical: THEME.space.lg,
    backgroundColor: THEME.color.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navText: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightSemibold,
  },
  navButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: THEME.space.sm,
    borderRadius: THEME.radius.pill,
    paddingVertical: THEME.space.lg,
    backgroundColor: THEME.color.accentStrong,
  },
  navPrimaryText: {
    color: THEME.color.onPrimary,
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightBold,
  },
});
