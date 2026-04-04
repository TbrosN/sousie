import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ChatBottomSheet } from "@/src/components/ChatBottomSheet";
import { IngredientActionModal } from "@/src/components/IngredientActionModal";
import { PresentationModeModal } from "@/src/components/PresentationModeModal";
import { RecipeView } from "@/src/components/RecipeView";
import { UI_COPY } from "@/src/constants/app";
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
  const [selectedIngredientName, setSelectedIngredientName] = useState("");
  const [substitutionOptions, setSubstitutionOptions] = useState<string[]>([]);
  const [isLoadingSubstitutions, setIsLoadingSubstitutions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeRecipe, setActiveRecipe] = useState<Recipe | undefined>(recipe);
  const [isPresentationModeVisible, setIsPresentationModeVisible] = useState(false);
  const [presentationStepIndex, setPresentationStepIndex] = useState(0);

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

  const closeIngredientModal = useCallback(() => {
    setSelectedIngredientName("");
    setSubstitutionOptions([]);
    setIsLoadingSubstitutions(false);
  }, []);

  const handleIngredientPress = useCallback(
    (ingredientName: string) => {
      if (isSending) {
        return;
      }
      if (!isOnline) {
        setErrorMessage(UI_COPY.offlineHint);
        return;
      }
      setErrorMessage("");
      setSelectedIngredientName(ingredientName);
      setSubstitutionOptions([]);
    },
    [isOnline, isSending]
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

  const handleIngredientRemoval = useCallback(async () => {
    if (!activeRecipe || !selectedIngredientName) {
      return;
    }
    if (!isOnline) {
      setErrorMessage(UI_COPY.offlineHint);
      return;
    }
    closeIngredientModal();
    setErrorMessage("");
    setIsSending(true);
    const snapshot = messages;
    const userMessage: ChatMessage = {
      id: buildId("msg"),
      role: "user",
      content: `User requested ingredient removal for ${selectedIngredientName}.`,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const result = await BackendClient.removeIngredient(activeRecipe, selectedIngredientName);
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
  }, [
    activeRecipe,
    closeIngredientModal,
    isOnline,
    messages,
    recipeId,
    selectedIngredientName,
    updateRecipe,
  ]);

  const handleSwapRequest = useCallback(async () => {
    if (!activeRecipe || !selectedIngredientName) {
      return;
    }
    setIsLoadingSubstitutions(true);
    setErrorMessage("");
    try {
      const substitutions = await BackendClient.suggestIngredientSubstitutions(
        activeRecipe,
        selectedIngredientName
      );
      setSubstitutionOptions(substitutions);
    } catch (error) {
      logWarning(LOG_MESSAGES.ingredientSubstitutionsFailed, error);
      closeIngredientModal();
      setErrorMessage(UI_COPY.chatUnavailable);
    } finally {
      setIsLoadingSubstitutions(false);
    }
  }, [activeRecipe, closeIngredientModal, selectedIngredientName]);

  const handleSubstitutionSelect = useCallback(
    async (substitution: string) => {
      if (!activeRecipe || !selectedIngredientName) {
        return;
      }
      if (!isOnline) {
        setErrorMessage(UI_COPY.offlineHint);
        return;
      }
      closeIngredientModal();
      setErrorMessage("");
      setIsSending(true);
      const snapshot = messages;
      const userMessage: ChatMessage = {
        id: buildId("msg"),
        role: "user",
        content: `User requested substitution of ${selectedIngredientName} for ${substitution}.`,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      try {
        const result = await BackendClient.substituteIngredient(
          activeRecipe,
          selectedIngredientName,
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
      closeIngredientModal,
      isOnline,
      messages,
      recipeId,
      selectedIngredientName,
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
        onIngredientPress={handleIngredientPress}
        ingredientsDisabled={isSending}
      />
      <IngredientActionModal
        visible={selectedIngredientName.length > 0}
        ingredientName={selectedIngredientName}
        substitutions={substitutionOptions}
        isLoadingSubstitutions={isLoadingSubstitutions}
        onClose={closeIngredientModal}
        onRemove={() => {
          void handleIngredientRemoval();
        }}
        onSwap={() => {
          void handleSwapRequest();
        }}
        onSelectSubstitution={handleSubstitutionSelect}
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
