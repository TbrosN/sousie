import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { UI_COPY } from "@/src/constants/app";
import { THEME } from "@/src/constants/theme";

import { GlassSurface } from "./GlassSurface";

type IngredientSwapModalProps = {
  visible: boolean;
  ingredientName: string;
  substitutions: string[];
  isLoadingSubstitutions: boolean;
  onClose: () => void;
  onSelectSubstitution: (substitution: string) => void;
};

export function IngredientSwapModal({
  visible,
  ingredientName,
  substitutions,
  isLoadingSubstitutions,
  onClose,
  onSelectSubstitution,
}: IngredientSwapModalProps) {
  const showEmpty =
    !isLoadingSubstitutions && substitutions.length === 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <GlassSurface style={styles.card} contentStyle={styles.cardContent}>
          <Text style={styles.title}>{UI_COPY.ingredientSwapTitle}</Text>
          <Text style={styles.subtitle}>{ingredientName}</Text>

          {isLoadingSubstitutions ? (
            <Text style={styles.loadingText}>{UI_COPY.ingredientSuggestionsLoading}</Text>
          ) : showEmpty ? (
            <Text style={styles.emptyText}>{UI_COPY.ingredientSuggestionsEmpty}</Text>
          ) : (
            <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsContent}>
              {substitutions.map((substitution) => (
                <Pressable
                  key={substitution}
                  accessibilityRole="button"
                  onPress={() => onSelectSubstitution(substitution)}
                  style={styles.optionButton}
                >
                  <Text style={styles.optionButtonText}>{substitution}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>{UI_COPY.ingredientActionCancel}</Text>
          </Pressable>
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.color.dimmingOverlay,
    padding: THEME.space.xxxl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "70%",
  },
  cardContent: {
    padding: THEME.space.xxxl,
    gap: THEME.space.lg,
  },
  title: {
    fontSize: THEME.font.sizeTitle,
    fontWeight: THEME.font.weightBold,
    color: THEME.color.textPrimary,
  },
  subtitle: {
    fontSize: THEME.font.sizeMd,
    color: THEME.color.textSecondary,
  },
  optionsList: {
    maxHeight: 260,
  },
  optionsContent: {
    gap: THEME.space.md,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: THEME.space.lg,
    paddingVertical: THEME.space.lg,
    backgroundColor: THEME.color.surfaceInteractive,
  },
  optionButtonText: {
    fontSize: THEME.font.sizeMd,
    color: THEME.color.textPrimary,
  },
  loadingText: {
    fontSize: THEME.font.sizeSm,
    color: THEME.color.textSecondary,
  },
  emptyText: {
    fontSize: THEME.font.sizeSm,
    color: THEME.color.textMuted,
  },
  cancelButton: {
    alignSelf: "flex-end",
    paddingVertical: THEME.space.sm,
    paddingHorizontal: THEME.space.md,
  },
  cancelButtonText: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeSm,
    fontWeight: THEME.font.weightSemibold,
  },
});
