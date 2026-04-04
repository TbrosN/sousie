import { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  type KeyboardEvent,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { UI_COPY } from "@/src/constants/app";
import { THEME } from "@/src/constants/theme";
import { ChatMessage } from "@/src/types/chat";

import { ChatMessageList } from "./ChatMessageList";
import { ErrorBanner } from "./ErrorBanner";
import { GlassSurface } from "./GlassSurface";

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const updateKeyboardHeight = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const resetKeyboardHeight = () => {
      setKeyboardHeight(0);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const frameChangeEvent =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";

    const showSubscription = Keyboard.addListener(showEvent, updateKeyboardHeight);
    const frameSubscription = Keyboard.addListener(frameChangeEvent, updateKeyboardHeight);
    const hideSubscription = Keyboard.addListener(hideEvent, resetKeyboardHeight);

    return () => {
      showSubscription.remove();
      frameSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
          if (gestureState.dy > THEME.metrics.collapseSwipeThreshold) {
            setIsExpanded(false);
            Keyboard.dismiss();
          }
          if (gestureState.dy < -THEME.metrics.collapseSwipeThreshold) {
            setIsExpanded(true);
          }
        },
      }),
    []
  );

  const sendDisabled =
    !isOnline || isSending || draftMessage.trim().length === 0 || !isExpanded;
  const composerBottomOffset = keyboardHeight + THEME.metrics.expandedComposerBottomGap;
  const expandedTranscriptBottomPadding =
    THEME.space.inputMaxHeight +
    THEME.space.xxxl +
    THEME.space.xl +
    THEME.metrics.expandedComposerBottomGap;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {isExpanded ? <Pressable style={styles.dimBackground} onPress={() => setIsExpanded(false)} /> : null}

      <View style={styles.sheetContainer}>
        <View
          style={[
            styles.sheet,
            isExpanded
              ? { height: `${THEME.metrics.expandedHeightRatio * 100}%` }
              : styles.sheetCollapsed,
          ]}
        >
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          {!isOnline ? (
            <Text style={styles.offlineHint}>{UI_COPY.offlineHint}</Text>
          ) : null}

          {isExpanded ? (
            <View style={styles.transcriptContainer}>
              <ErrorBanner message={errorMessage} />
              <ChatMessageList
                messages={messages}
                bottomPadding={expandedTranscriptBottomPadding}
              />
            </View>
          ) : null}

          <View
            style={[
              styles.inputContainer,
              isExpanded
                ? [styles.inputContainerExpanded, { bottom: composerBottomOffset }]
                : styles.inputContainerCollapsed,
            ]}
          >
            <GlassSurface contentStyle={styles.composerSurface}>
              <View style={styles.inputRow}>
                <TextInput
                  editable={!isSending}
                  value={draftMessage}
                  onChangeText={onDraftChange}
                  onPressIn={() => setIsExpanded(true)}
                  placeholder={UI_COPY.aiInputPlaceholder}
                  placeholderTextColor={THEME.color.textMuted}
                  style={styles.input}
                  multiline={isExpanded}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={onSubmit}
                  disabled={sendDisabled}
                  style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
                >
                  <Text style={styles.sendButtonText}>
                    {isSending ? UI_COPY.chatSendingEllipsis : UI_COPY.chatSend}
                  </Text>
                </Pressable>
              </View>
            </GlassSurface>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.color.dimmingOverlay,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: THEME.color.surfaceMuted,
    borderTopLeftRadius: THEME.radius.sheetTop,
    borderTopRightRadius: THEME.radius.sheetTop,
    paddingHorizontal: THEME.space.xl,
    paddingTop: THEME.space.md,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
  },
  sheetCollapsed: {
    paddingBottom: THEME.metrics.collapsedInputBottomPadding,
  },
  handleArea: {
    alignItems: "center",
    paddingVertical: THEME.space.sm,
  },
  handle: {
    width: THEME.space.sheetHandleWidth,
    height: THEME.space.sheetHandleHeight,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.color.sheetHandle,
  },
  offlineHint: {
    color: THEME.color.offlineText,
    backgroundColor: THEME.color.offlineBg,
    borderWidth: 1,
    borderColor: THEME.color.offlineBorder,
    borderRadius: THEME.radius.sm,
    paddingVertical: THEME.space.sm,
    paddingHorizontal: THEME.space.md,
    marginBottom: THEME.space.md,
    fontSize: THEME.font.size2xs,
  },
  transcriptContainer: {
    flex: 1,
    gap: THEME.space.md,
  },
  inputContainer: {
    gap: THEME.space.md,
  },
  inputContainerCollapsed: {
    paddingBottom: THEME.space.lg,
  },
  inputContainerExpanded: {
    position: "absolute",
    left: THEME.space.xl,
    right: THEME.space.xl,
    borderRadius: THEME.radius.lg,
  },
  composerSurface: {
    paddingHorizontal: THEME.space.md,
    paddingTop: THEME.space.md,
    paddingBottom: THEME.space.md,
    backgroundColor: THEME.color.composerOverlaySurface,
  },
  inputRow: {
    flexDirection: "row",
    gap: THEME.space.md,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: THEME.space.inputMinHeight,
    maxHeight: THEME.space.inputMaxHeight,
    borderWidth: 1,
    borderColor: THEME.color.borderMuted,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: THEME.space.lg,
    paddingVertical: THEME.space.md,
    backgroundColor: THEME.color.surfaceMuted,
    color: THEME.color.textPrimary,
  },
  sendButton: {
    height: THEME.space.inputMinHeight,
    paddingHorizontal: THEME.space.xxl,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.color.accentStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: THEME.color.controlDisabled,
  },
  sendButtonText: {
    color: THEME.color.onPrimary,
    fontWeight: THEME.font.weightSemibold,
  },
});
