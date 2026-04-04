import { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { UI_COPY, UI_NUMBERS } from "@/src/constants/app";
import { ChatMessage } from "@/src/types/chat";

import { ChatMessageList } from "./ChatMessageList";
import { ErrorBanner } from "./ErrorBanner";

type ChatBottomSheetProps = {
  isOnline: boolean;
  messages: ChatMessage[];
  draftMessage: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  errorMessage: string;
};

export function ChatBottomSheet({
  isOnline,
  messages,
  draftMessage,
  onDraftChange,
  onSubmit,
  isSending,
  errorMessage,
}: ChatBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isExpanded) {
        setIsExpanded(false);
        Keyboard.dismiss();
        return true;
      }
      return false;
    });
    return () => {
      subscription.remove();
    };
  }, [isExpanded]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > UI_NUMBERS.collapseSwipeThreshold) {
            setIsExpanded(false);
            Keyboard.dismiss();
          }
          if (gestureState.dy < -UI_NUMBERS.collapseSwipeThreshold) {
            setIsExpanded(true);
          }
        },
      }),
    []
  );

  const sendDisabled =
    !isOnline || isSending || draftMessage.trim().length === 0 || !isExpanded;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {isExpanded ? <Pressable style={styles.dimBackground} onPress={() => setIsExpanded(false)} /> : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetContainer}
      >
        <View
          style={[
            styles.sheet,
            isExpanded
              ? { height: `${UI_NUMBERS.expandedHeightRatio * 100}%` }
              : styles.sheetCollapsed,
          ]}
        >
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          {!isOnline ? (
            <Text style={styles.offlineHint}>{UI_COPY.offlineHint}</Text>
          ) : null}

          {isExpanded ? <ChatMessageList messages={messages} /> : null}

          <View style={styles.inputContainer}>
            <ErrorBanner message={errorMessage} />
            <View style={styles.inputRow}>
              <TextInput
                editable={!isSending}
                value={draftMessage}
                onChangeText={onDraftChange}
                onPressIn={() => setIsExpanded(true)}
                placeholder={UI_COPY.aiInputPlaceholder}
                style={styles.input}
                multiline={isExpanded}
              />
              <Pressable
                accessibilityRole="button"
                onPress={onSubmit}
                disabled={sendDisabled}
                style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
              >
                <Text style={styles.sendButtonText}>{isSending ? "..." : "Send"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sheetCollapsed: {
    paddingBottom: UI_NUMBERS.collapsedInputBottomPadding,
  },
  handleArea: {
    alignItems: "center",
    paddingVertical: 6,
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
  },
  offlineHint: {
    color: "#92400e",
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    fontSize: 12,
  },
  inputContainer: {
    gap: 8,
    paddingBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  sendButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
