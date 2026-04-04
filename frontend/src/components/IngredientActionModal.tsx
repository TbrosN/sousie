import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { UI_COPY } from "@/src/constants/app";
import { THEME } from "@/src/constants/theme";

type IngredientActionModalProps = {
  visible: boolean;
  ingredientName: string;
  substitutions: string[];
  isLoadingSubstitutions: boolean;
  onClose: () => void;
  onRemove: () => void;
  onSwap: () => void;
  onSelectSubstitution: (substitution: string) => void;
};

export function IngredientActionModal({
  visible,
  ingredientName,
  substitutions,
  isLoadingSubstitutions,
  onClose,
  onRemove,
  onSwap,
  onSelectSubstitution,
}: IngredientActionModalProps) {
  const showSuggestions = isLoadingSubstitutions || substitutions.length > 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>
            {showSuggestions ? UI_COPY.ingredientSwapTitle : UI_COPY.ingredientActionsTitle}
          </Text>
          <Text style={styles.subtitle}>{ingredientName}</Text>

          {showSuggestions ? (
            isLoadingSubstitutions ? (
              <Text style={styles.loadingText}>{UI_COPY.ingredientSuggestionsLoading}</Text>
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
            )
          ) : (
            <View style={styles.actionsBlock}>
              <Pressable
                accessibilityRole="button"
                onPress={onRemove}
                style={[styles.optionButton, styles.destructiveButton]}
              >
                <Text style={[styles.optionButtonText, styles.destructiveButtonText]}>
                  {UI_COPY.ingredientRemove}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onSwap}
                style={styles.optionButton}
              >
                <Text style={styles.optionButtonText}>{UI_COPY.ingredientSwap}</Text>
              </Pressable>
            </View>
          )}

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>{UI_COPY.ingredientActionCancel}</Text>
          </Pressable>
        </View>
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
    backgroundColor: THEME.color.surface,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
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
  actionsBlock: {
    gap: THEME.space.md,
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
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.space.lg,
    paddingVertical: THEME.space.lg,
    backgroundColor: THEME.color.surface,
  },
  optionButtonText: {
    fontSize: THEME.font.sizeMd,
    color: THEME.color.textPrimary,
  },
  destructiveButton: {
    borderColor: THEME.color.destructive,
    backgroundColor: THEME.color.errorSurface,
  },
  destructiveButtonText: {
    color: THEME.color.destructive,
  },
  loadingText: {
    fontSize: THEME.font.sizeSm,
    color: THEME.color.textSecondary,
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
