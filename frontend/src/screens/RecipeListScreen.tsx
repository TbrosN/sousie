import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ErrorBanner } from "@/src/components/ErrorBanner";
import { GlassSurface } from "@/src/components/GlassSurface";
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
  const [pendingDeleteRecipeId, setPendingDeleteRecipeId] = useState<string | null>(null);

  const trimmedPrompt = newRecipePrompt.trim();
  const canCreate = trimmedPrompt.length > 0 && isOnline && !createBusy;
  const pendingDeleteRecipe =
    pendingDeleteRecipeId === null
      ? undefined
      : recipes.find((r) => r.id === pendingDeleteRecipeId);

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
    <ScrollView contentContainerStyle={styles.container}>
      <GlassSurface contentStyle={styles.heroCard}>
        <Text style={styles.eyebrow}>Sousie Kitchen</Text>
        <Text style={styles.heroTitle}>Build and refine beautiful recipes.</Text>
        <Text style={styles.heroSubtitle}>
          Create a recipe with AI, then open a card to replace ingredients, adjust the method, or cook in chef mode.
        </Text>

        <View style={styles.promptWrap}>
          <TextInput
            accessibilityLabel={UI_COPY.createRecipePromptPlaceholder}
            editable={!isLoading && !createBusy}
            onChangeText={setNewRecipePrompt}
            placeholder={UI_COPY.createRecipePromptPlaceholder}
            placeholderTextColor={THEME.color.textMuted}
            style={styles.promptInput}
            value={newRecipePrompt}
          />
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
              <>
                <Text style={styles.createButtonText}>{UI_COPY.createRecipe}</Text>
                <Ionicons name="arrow-forward" size={18} color={THEME.color.onPrimary} />
              </>
            )}
          </Pressable>
        </View>

        <ErrorBanner message={createError} />
        {!isOnline ? <Text style={styles.offlineNote}>{UI_COPY.offlineHint}</Text> : null}
      </GlassSurface>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recipes</Text>
        <Text style={styles.sectionCaption}>{recipes.length} saved</Text>
      </View>

      {recipes.length === 0 ? (
        <GlassSurface contentStyle={styles.emptyCard}>
          <Ionicons name="moon-outline" size={28} color={THEME.color.accent} />
          <Text style={styles.emptyTitle}>{UI_COPY.emptyRecipes}</Text>
          <Text style={styles.emptyText}>
            Start with a dish idea above and Sousie will draft the first version for you.
          </Text>
        </GlassSurface>
      ) : (
        recipes.map((recipe) => (
          <GlassSurface key={recipe.id} style={styles.recipeCardWrap} contentStyle={styles.recipeCard}>
            <Pressable
              accessibilityLabel={`${UI_COPY.openRecipeLabel} ${recipe.title}`}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/recipes/[recipeId]",
                  params: { recipeId: recipe.id },
                })
              }
              style={({ pressed }) => [styles.recipeCardMain, pressed ? styles.recipeCardPressed : null]}
            >
              <View style={styles.recipeCardText}>
                <Text style={styles.recipeTitle}>{recipe.title}</Text>
                <Text style={styles.recipeSubtitle}>{formatRecipeServingsLine(recipe.numServings)}</Text>
                <Text style={styles.recipeHint}>{UI_COPY.recipeCardHint}</Text>
              </View>
              <View style={styles.recipeCardAffordance}>
                <Ionicons name="chevron-forward-circle" size={30} color={THEME.color.accent} />
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel={formatDeleteRecipeAccessibilityLabel(recipe.title)}
              accessibilityRole="button"
              hitSlop={THEME.space.hitSlop}
              onPress={() => {
                setPendingDeleteRecipeId(recipe.id);
              }}
              style={styles.deleteButton}
            >
              <Ionicons
                name="trash-outline"
                size={THEME.layout.trashIconSize}
                color={THEME.color.destructive}
              />
            </Pressable>
          </GlassSurface>
        ))
      )}
      <ConfirmDialog
        visible={pendingDeleteRecipe != null}
        title={UI_COPY.deleteRecipeConfirmTitle}
        message={
          pendingDeleteRecipe
            ? formatDeleteRecipeConfirmMessage(pendingDeleteRecipe.title)
            : ""
        }
        cancelLabel={UI_COPY.deleteRecipeConfirmCancel}
        confirmLabel={UI_COPY.deleteRecipeConfirmDelete}
        onCancel={() => {
          setPendingDeleteRecipeId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteRecipeId) {
            void deleteRecipe(pendingDeleteRecipeId);
          }
          setPendingDeleteRecipeId(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.space.xxxl,
    backgroundColor: THEME.color.backgroundApp,
    gap: THEME.space.sectionGap,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.color.backgroundApp,
  },
  heroCard: {
    padding: THEME.space.xxxl,
    gap: THEME.space.lg,
  },
  eyebrow: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeXs,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: THEME.color.textStrong,
    fontSize: THEME.font.sizeDisplay,
    lineHeight: THEME.font.lineHeightDisplay,
    fontWeight: THEME.font.weightBold,
  },
  heroSubtitle: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeMd,
    lineHeight: THEME.font.lineHeightBody,
  },
  promptWrap: {
    gap: THEME.space.md,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: THEME.color.borderMuted,
    borderRadius: THEME.radius.xl,
    paddingHorizontal: THEME.space.xl,
    paddingVertical: THEME.space.lg,
    fontSize: THEME.font.sizeBody,
    backgroundColor: THEME.color.surfaceMuted,
    color: THEME.color.textPrimary,
  },
  createButton: {
    flexDirection: "row",
    gap: THEME.space.sm,
    backgroundColor: THEME.color.accentStrong,
    borderRadius: THEME.radius.xl,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeTitle,
    fontWeight: THEME.font.weightBold,
  },
  sectionCaption: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeSm,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: THEME.space.xxxl * 2,
    paddingHorizontal: THEME.space.xxxl,
    gap: THEME.space.md,
  },
  emptyTitle: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeLg,
    fontWeight: THEME.font.weightBold,
  },
  emptyText: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeMd,
    textAlign: "center",
    lineHeight: THEME.font.lineHeightBody,
  },
  recipeCardWrap: {
    marginBottom: THEME.space.sm,
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.space.md,
    padding: THEME.space.md,
  },
  recipeCardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: THEME.radius.lg,
    paddingVertical: THEME.space.xl,
    paddingLeft: THEME.space.xl,
    paddingRight: THEME.space.md,
  },
  recipeCardPressed: {
    backgroundColor: THEME.color.accentSoft,
  },
  recipeCardText: {
    flex: 1,
    gap: THEME.space.sm,
  },
  recipeCardAffordance: {
    paddingLeft: THEME.space.md,
  },
  recipeTitle: {
    fontSize: THEME.font.sizeLg,
    fontWeight: THEME.font.weightBold,
    color: THEME.color.textPrimary,
  },
  recipeSubtitle: {
    fontSize: THEME.font.sizeMd,
    color: THEME.color.textSecondary,
  },
  recipeHint: {
    fontSize: THEME.font.sizeXs,
    color: THEME.color.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: THEME.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.color.destructiveSurface,
    borderWidth: 1,
    borderColor: THEME.color.borderMuted,
  },
});
