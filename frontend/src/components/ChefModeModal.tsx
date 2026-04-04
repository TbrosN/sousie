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
  formatChefModeProgress,
  formatRecipeStepTitle,
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
              <GlassSurface style={styles.pageSurface} contentStyle={styles.pageSurfaceContent}>
                <Text style={styles.pageEyebrow}>{formatRecipeStepTitle(index)}</Text>

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

                <Text style={styles.instructions}>{item.instructions}</Text>
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
  pageSurfaceContent: {
    minHeight: "70%",
    paddingHorizontal: THEME.space.xxxl * 2,
    paddingVertical: THEME.space.xxxl * 2,
    justifyContent: "flex-start",
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
    flexShrink: 0,
    backgroundColor: THEME.color.chefModeBackdrop,
  },
  swipeHint: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeXs,
    textAlign: "center",
  },
});
