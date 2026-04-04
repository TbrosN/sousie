import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ChatBottomSheet } from "@/src/components/ChatBottomSheet";
import { RecipeView } from "@/src/components/RecipeView";
import { UI_COPY } from "@/src/constants/app";
import { useRecipes } from "@/src/context/RecipesContext";
import { useNetworkStatus } from "@/src/hooks/useNetworkStatus";
import { BackendClient } from "@/src/services/backendClient";
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

  async function handleSubmit(): Promise<void> {
    if (!activeRecipe) {
      return;
    }
    const trimmed = draftMessage.trim();
    if (!trimmed) {
      return;
    }
    if (!isOnline) {
      setErrorMessage(UI_COPY.offlineHint);
      return;
    }

    const userMessage: ChatMessage = {
      id: buildId("msg"),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraftMessage("");
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
      const updatedRecipe: Recipe = {
        ...result.recipe,
        updatedAt: new Date().toISOString(),
      };
      setMessages((previous) => [...previous, assistantMessage]);
      setActiveRecipe(updatedRecipe);
      await updateRecipe(updatedRecipe);
    } catch (error) {
      logWarning("Chat request failed.", error);
      setErrorMessage(UI_COPY.chatUnavailable);
    } finally {
      setIsSending(false);
    }
  }

  if (!recipeId) {
    return (
      <View style={styles.centered}>
        <Text>Invalid recipe id.</Text>
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
      <RecipeView recipe={activeRecipe} bottomInset={260} />
      <ChatBottomSheet
        isOnline={isOnline}
        messages={messages}
        draftMessage={draftMessage}
        onDraftChange={setDraftMessage}
        onSubmit={() => {
          void handleSubmit().catch((error) => {
            logError("Unexpected failure while submitting chat.", error);
            setErrorMessage(UI_COPY.genericError);
          });
        }}
        isSending={isSending}
        errorMessage={errorMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
