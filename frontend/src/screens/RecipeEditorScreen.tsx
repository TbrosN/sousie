import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ChatBottomSheet } from "@/src/components/ChatBottomSheet";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { IngredientSwapModal } from "@/src/components/IngredientSwapModal";
import { PresentationModeModal } from "@/src/components/PresentationModeModal";
import { RecipeView } from "@/src/components/RecipeView";
import { formatIngredientDeleteConfirmMessage, UI_COPY } from "@/src/constants/app";
import { LOG_MESSAGES } from "@/src/constants/logMessages";
import { THEME } from "@/src/constants/theme";
import { useRecipes } from "@/src/context/RecipesContext";
import { useNetworkStatus } from "@/src/hooks/useNetworkStatus";
import { BackendClient } from "@/src/services/backendClient";
import { StorageService } from "@/src/services/storageService";
import { ChatMessage } from "@/src/types/chat";
import { Recipe } from "@/src/types/recipe";
import { buildId } from "@/src/utils/ids";
import { logError, logWarning } from "@/src/utils/logger";

type RecipeEditorScreenProps = {
  recipeId: string;
};

export function RecipeEditorScreen({ recipeId }: RecipeEditorScreenProps) {
  const { getRecipeById, updateRecipe } = useRecipes();
  const isOnline = useNetworkStatus();

  const recipe = useMemo(() => getRecipeById(recipeId), [getRecipeById, recipeId]);
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [swapIngredientName, setSwapIngredientName] = useState("");
  const [substitutionOptions, setSubstitutionOptions] = useState<string[]>([]);
  const [isLoadingSubstitutions, setIsLoadingSubstitutions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeRecipe, setActiveRecipe] = useState<Recipe | undefined>(recipe);
  const [isPresentationModeVisible, setIsPresentationModeVisible] = useState(false);
  const [presentationStepIndex, setPresentationStepIndex] = useState(0);
  const [ingredientDeleteConfirmName, setIngredientDeleteConfirmName] = useState<string | null>(null);

  useEffect(() => {
    setActiveRecipe(recipe);
  }, [recipe]);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    void (async () => {
      try {
        const loaded = await StorageService.readChatMessages(recipeId);
        if (!cancelled) {
          setMessages(loaded);
        }
      } catch (error) {
        logError(LOG_MESSAGES.loadChatFailed, error);
        if (!cancelled) {
          setErrorMessage(UI_COPY.genericError);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  const submitChat = useCallback(
    async (trimmed: string) => {
      if (!activeRecipe) {
        return;
      }
      if (!trimmed) {
        return;
      }
      if (!isOnline) {
        setErrorMessage(UI_COPY.offlineHint);
        return;
      }

      const snapshot = messages;
      const userMessage: ChatMessage = {
        id: buildId("msg"),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setErrorMessage("");
      setIsSending(true);

      try {
        const result = await BackendClient.sendChat(activeRecipe, nextMessages, trimmed);
        const assistantMessage: ChatMessage = {
          id: buildId("msg"),
          role: "assistant",
          content: result.assistantMessage,
          createdAt: new Date().toISOString(),
        };
        const updatedRecipe = result.recipe;
        const persisted = [...nextMessages, assistantMessage];
        setMessages(persisted);
        setActiveRecipe(updatedRecipe);
        await updateRecipe(updatedRecipe);
        try {
          await StorageService.writeChatMessages(recipeId, persisted);
        } catch (persistError) {
          logError(LOG_MESSAGES.persistChatFailed, persistError);
        }
      } catch (error) {
        logWarning(LOG_MESSAGES.chatRequestFailed, error);
        setErrorMessage(UI_COPY.chatUnavailable);
        setMessages(snapshot);
      } finally {
        setIsSending(false);
      }
    },
    [activeRecipe, isOnline, messages, recipeId, updateRecipe]
  );

  function handleSubmit(): void {
    const trimmed = draftMessage.trim();
    if (!trimmed) {
      return;
    }
    setDraftMessage("");
    void submitChat(trimmed).catch((error) => {
      logError(LOG_MESSAGES.submitChatUnexpectedFailure, error);
      setErrorMessage(UI_COPY.genericError);
    });
  }

  const closeSwapModal = useCallback(() => {
    setSwapIngredientName("");
    setSubstitutionOptions([]);
    setIsLoadingSubstitutions(false);
  }, []);

  const handleIngredientSwapPress = useCallback(
    async (ingredientName: string) => {
      if (isSending) {
        return;
      }
      if (!isOnline) {
        setErrorMessage(UI_COPY.offlineHint);
        return;
      }
      if (!activeRecipe) {
        return;
      }
      setErrorMessage("");
      setSwapIngredientName(ingredientName);
      setSubstitutionOptions([]);
      setIsLoadingSubstitutions(true);
      try {
        const substitutions = await BackendClient.suggestIngredientSubstitutions(
          activeRecipe,
          ingredientName
        );
        setSubstitutionOptions(substitutions);
      } catch (error) {
        logWarning(LOG_MESSAGES.ingredientSubstitutionsFailed, error);
        closeSwapModal();
        setErrorMessage(UI_COPY.chatUnavailable);
      } finally {
        setIsLoadingSubstitutions(false);
      }
    },
    [activeRecipe, closeSwapModal, isOnline, isSending]
  );

  const openPresentationMode = useCallback(() => {
    if (!activeRecipe || activeRecipe.steps.length === 0) {
      return;
    }
    setPresentationStepIndex(0);
    setIsPresentationModeVisible(true);
  }, [activeRecipe]);

  const closePresentationMode = useCallback(() => {
    setIsPresentationModeVisible(false);
  }, []);

  const handleIngredientRemoval = useCallback(
    async (ingredientName: string) => {
      if (!activeRecipe) {
        return;
      }
      if (!isOnline) {
        setErrorMessage(UI_COPY.offlineHint);
        return;
      }
      setErrorMessage("");
      setIsSending(true);
      const snapshot = messages;
      const userMessage: ChatMessage = {
        id: buildId("msg"),
        role: "user",
        content: `User requested ingredient removal for ${ingredientName}.`,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      try {
        const result = await BackendClient.removeIngredient(activeRecipe, ingredientName);
        const assistantMessage: ChatMessage = {
          id: buildId("msg"),
          role: "assistant",
          content: result.assistantMessage,
          createdAt: new Date().toISOString(),
        };
        const updatedRecipe = result.recipe;
        const persistedMessages = [...nextMessages, assistantMessage];
        setMessages(persistedMessages);
        setActiveRecipe(updatedRecipe);
        await updateRecipe(updatedRecipe);
        await StorageService.writeChatMessages(recipeId, persistedMessages);
      } catch (error) {
        logWarning(LOG_MESSAGES.chatRequestFailed, error);
        setMessages(snapshot);
        setErrorMessage(UI_COPY.chatUnavailable);
      } finally {
        setIsSending(false);
      }
    },
    [activeRecipe, isOnline, messages, recipeId, updateRecipe]
  );

  const handleIngredientRemovePress = useCallback(
    (ingredientName: string) => {
      if (isSending) {
        return;
      }
      if (!isOnline) {
        setErrorMessage(UI_COPY.offlineHint);
        return;
      }
      setErrorMessage("");
      setIngredientDeleteConfirmName(ingredientName);
    },
    [isOnline, isSending]
  );

  const closeIngredientDeleteDialog = useCallback(() => {
    setIngredientDeleteConfirmName(null);
  }, []);

  const confirmIngredientDelete = useCallback(() => {
    if (!ingredientDeleteConfirmName) {
      return;
    }
    const name = ingredientDeleteConfirmName;
    setIngredientDeleteConfirmName(null);
    void handleIngredientRemoval(name);
  }, [handleIngredientRemoval, ingredientDeleteConfirmName]);

  const handleSubstitutionSelect = useCallback(
    async (substitution: string) => {
      if (!activeRecipe || !swapIngredientName) {
        return;
      }
      if (!isOnline) {
        setErrorMessage(UI_COPY.offlineHint);
        return;
      }
      const ingredientBeingSwapped = swapIngredientName;
      closeSwapModal();
      setErrorMessage("");
      setIsSending(true);
      const snapshot = messages;
      const userMessage: ChatMessage = {
        id: buildId("msg"),
        role: "user",
        content: `User requested substitution of ${ingredientBeingSwapped} for ${substitution}.`,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      try {
        const result = await BackendClient.substituteIngredient(
          activeRecipe,
          ingredientBeingSwapped,
          substitution
        );
        const assistantMessage: ChatMessage = {
          id: buildId("msg"),
          role: "assistant",
          content: result.assistantMessage,
          createdAt: new Date().toISOString(),
        };
        const updatedRecipe = result.recipe;
        const persistedMessages = [...nextMessages, assistantMessage];
        setMessages(persistedMessages);
        setActiveRecipe(updatedRecipe);
        await updateRecipe(updatedRecipe);
        await StorageService.writeChatMessages(recipeId, persistedMessages);
      } catch (error) {
        logWarning(LOG_MESSAGES.chatRequestFailed, error);
        setMessages(snapshot);
        setErrorMessage(UI_COPY.chatUnavailable);
      } finally {
        setIsSending(false);
      }
    },
    [
      activeRecipe,
      closeSwapModal,
      isOnline,
      messages,
      recipeId,
      swapIngredientName,
      updateRecipe,
    ]
  );

  if (!recipeId) {
    return (
      <View style={styles.centered}>
        <Text>{UI_COPY.invalidRecipeId}</Text>
      </View>
    );
  }

  if (!activeRecipe) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RecipeView
        recipe={activeRecipe}
        bottomInset={isPresentationModeVisible ? THEME.space.xxxl : THEME.layout.recipeEditorChatBottomInset}
        onPresentationModePress={openPresentationMode}
        onIngredientSwapPress={handleIngredientSwapPress}
        onIngredientRemovePress={handleIngredientRemovePress}
        ingredientsDisabled={isSending}
      />
      <IngredientSwapModal
        visible={swapIngredientName.length > 0}
        ingredientName={swapIngredientName}
        substitutions={substitutionOptions}
        isLoadingSubstitutions={isLoadingSubstitutions}
        onClose={closeSwapModal}
        onSelectSubstitution={handleSubstitutionSelect}
      />
      <ConfirmDialog
        visible={ingredientDeleteConfirmName != null}
        title={UI_COPY.ingredientDeleteConfirmTitle}
        message={
          ingredientDeleteConfirmName
            ? formatIngredientDeleteConfirmMessage(ingredientDeleteConfirmName)
            : ""
        }
        cancelLabel={UI_COPY.deleteRecipeConfirmCancel}
        confirmLabel={UI_COPY.ingredientRemove}
        onCancel={closeIngredientDeleteDialog}
        onConfirm={confirmIngredientDelete}
      />
      <PresentationModeModal
        recipe={activeRecipe}
        visible={isPresentationModeVisible}
        currentStepIndex={presentationStepIndex}
        onStepChange={setPresentationStepIndex}
        onClose={closePresentationMode}
      />
      {!isPresentationModeVisible ? (
        <ChatBottomSheet
          isOnline={isOnline}
          messages={messages}
          draftMessage={draftMessage}
          onDraftChange={setDraftMessage}
          onSubmit={handleSubmit}
          isSending={isSending}
          errorMessage={errorMessage}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.color.backgroundApp,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
