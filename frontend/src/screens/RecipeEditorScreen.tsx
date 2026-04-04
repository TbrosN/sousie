import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ChatBottomSheet } from "@/src/components/ChatBottomSheet";
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
  const [errorMessage, setErrorMessage] = useState("");
  const [activeRecipe, setActiveRecipe] = useState<Recipe | undefined>(recipe);

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
      <RecipeView recipe={activeRecipe} bottomInset={THEME.layout.recipeEditorChatBottomInset} />
      <ChatBottomSheet
        isOnline={isOnline}
        messages={messages}
        draftMessage={draftMessage}
        onDraftChange={setDraftMessage}
        onSubmit={handleSubmit}
        isSending={isSending}
        errorMessage={errorMessage}
      />
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
