import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ErrorBanner } from "@/src/components/ErrorBanner";
import {
  formatDeleteRecipeAccessibilityLabel,
  formatDeleteRecipeConfirmMessage,
  formatRecipeServingsLine,
  UI_COPY,
} from "@/src/constants/app";
import { LOG_MESSAGES } from "@/src/constants/logMessages";
import { THEME } from "@/src/constants/theme";
import { useRecipes } from "@/src/context/RecipesContext";
import { useNetworkStatus } from "@/src/hooks/useNetworkStatus";
import { BackendClient } from "@/src/services/backendClient";
import { StorageService } from "@/src/services/storageService";
import { ChatMessage } from "@/src/types/chat";
import { buildId } from "@/src/utils/ids";
import { logError } from "@/src/utils/logger";

export function RecipeListScreen() {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { recipes, isLoading, createRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const [newRecipePrompt, setNewRecipePrompt] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const trimmedPrompt = newRecipePrompt.trim();
  const canCreate = trimmedPrompt.length > 0 && isOnline && !createBusy;

  async function handleCreateRecipe(): Promise<void> {
    if (!trimmedPrompt || !isOnline || createBusy) {
      return;
    }
    setCreateError("");
    setCreateBusy(true);
    let createdId: string | undefined;
    try {
      const recipe = await createRecipe();
      createdId = recipe.id;
      const userMessage: ChatMessage = {
        id: buildId("msg"),
        role: "user",
        content: trimmedPrompt,
        createdAt: new Date().toISOString(),
      };
      const result = await BackendClient.sendChat(recipe, [userMessage], trimmedPrompt);
      const assistantMessage: ChatMessage = {
        id: buildId("msg"),
        role: "assistant",
        content: result.assistantMessage,
        createdAt: new Date().toISOString(),
      };
      await updateRecipe(result.recipe);
      await StorageService.writeChatMessages(recipe.id, [userMessage, assistantMessage]);
      setNewRecipePrompt("");
      router.push({
        pathname: "/recipes/[recipeId]",
        params: { recipeId: recipe.id },
      });
    } catch (error) {
      logError(LOG_MESSAGES.createRecipeAiTurnFailed, error);
      setCreateError(UI_COPY.createRecipeAiFailed);
      if (createdId) {
        await deleteRecipe(createdId);
      }
    } finally {
      setCreateBusy(false);
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
      <TextInput
        accessibilityLabel={UI_COPY.createRecipePromptPlaceholder}
        editable={!isLoading && !createBusy}
        onChangeText={setNewRecipePrompt}
        placeholder={UI_COPY.createRecipePromptPlaceholder}
        style={styles.promptInput}
        value={newRecipePrompt}
      />
      <ErrorBanner message={createError} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canCreate }}
        disabled={!canCreate}
        onPress={() => {
          void handleCreateRecipe();
        }}
        style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
      >
        {createBusy ? (
          <View style={styles.createButtonBusy}>
            <ActivityIndicator color={THEME.color.onPrimary} />
            <Text style={styles.createButtonText}>{UI_COPY.createRecipeCreating}</Text>
          </View>
        ) : (
          <Text style={styles.createButtonText}>{UI_COPY.createRecipe}</Text>
        )}
      </Pressable>
      {!isOnline ? <Text style={styles.offlineNote}>{UI_COPY.offlineHint}</Text> : null}

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
              <Text style={styles.recipeSubtitle}>{formatRecipeServingsLine(recipe.numServings)}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={formatDeleteRecipeAccessibilityLabel(recipe.title)}
              accessibilityRole="button"
              hitSlop={THEME.space.hitSlop}
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
              <Ionicons
                name="trash-outline"
                size={THEME.layout.trashIconSize}
                color={THEME.color.destructive}
              />
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
    padding: THEME.space.xxxl,
    backgroundColor: THEME.color.backgroundApp,
    gap: THEME.space.lg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  promptInput: {
    borderWidth: 1,
    borderColor: THEME.color.borderMuted,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.space.xl,
    paddingVertical: THEME.space.lg,
    fontSize: THEME.font.sizeBody,
    backgroundColor: THEME.color.surface,
    color: THEME.color.textPrimary,
  },
  createButton: {
    backgroundColor: THEME.color.primaryButton,
    borderRadius: THEME.radius.md,
    paddingVertical: THEME.space.xl,
    alignItems: "center",
    minHeight: THEME.space.inputMinHeight + THEME.space.xl * 2,
    justifyContent: "center",
  },
  createButtonBusy: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.space.md,
  },
  createButtonDisabled: {
    backgroundColor: THEME.color.controlDisabled,
  },
  createButtonText: {
    color: THEME.color.onPrimary,
    fontWeight: THEME.font.weightBold,
    fontSize: THEME.font.sizeMd,
  },
  offlineNote: {
    color: THEME.color.offlineText,
    fontSize: THEME.font.size2xs,
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.color.surface,
    borderRadius: THEME.radius.lg,
    paddingVertical: THEME.space.md,
    paddingLeft: THEME.space.xl,
    paddingRight: THEME.space.xs,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  recipeCardMain: {
    flex: 1,
    paddingVertical: THEME.space.xs,
    paddingRight: THEME.space.md,
  },
  deleteButton: {
    padding: THEME.space.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  recipeTitle: {
    fontSize: THEME.font.sizeLg,
    fontWeight: THEME.font.weightSemibold,
    color: THEME.color.textPrimary,
  },
  recipeSubtitle: {
    marginTop: THEME.space.xs,
    color: THEME.color.textSecondary,
  },
  emptyText: {
    color: THEME.color.textMuted,
  },
});
