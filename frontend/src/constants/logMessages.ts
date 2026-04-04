/** Console / diagnostic messages — avoid scattering string literals (see SPEC.md). */
export const LOG_MESSAGES = {
  chatRequestFailed: "Chat request failed.",
  createRecipeAiTurnFailed: "Failed to complete create-recipe AI request.",
  deleteChatFailed: "Failed to delete chat history from storage.",
  loadChatFailed: "Failed to load chat history from storage.",
  loadRecipesFailed: "Failed to load recipes from storage.",
  persistChatFailed: "Failed to persist chat history.",
  persistNewRecipeFailed: "Failed to persist newly created recipe.",
  persistRecipeUpdateFailed: "Failed to persist updated recipe.",
  persistRecipeDeleteFailed: "Failed to persist recipe deletion.",
  submitChatUnexpectedFailure: "Unexpected failure while submitting chat.",
} as const;
