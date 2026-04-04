import { ScrollView, StyleSheet, Text, View } from "react-native";

import { UI_COPY } from "@/src/constants/app";
import { THEME } from "@/src/constants/theme";
import { ChatMessage } from "@/src/types/chat";

type ChatMessageListProps = {
  messages: ChatMessage[];
  bottomPadding?: number;
};

export function ChatMessageList({ messages, bottomPadding = THEME.space.xl }: ChatMessageListProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
    >
      {messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.bubble,
            message.role === "user" ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text style={styles.roleText}>
            {message.role === "user" ? UI_COPY.chatUserLabel : UI_COPY.chatAssistantLabel}
          </Text>
          <Text style={styles.messageText}>{message.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: THEME.space.lg,
  },
  bubble: {
    borderRadius: THEME.radius.lg,
    padding: THEME.space.lg,
    gap: THEME.space.sm,
  },
  userBubble: {
    backgroundColor: THEME.color.messageUserBg,
    alignSelf: "flex-end",
    maxWidth: THEME.layout.messageUserMaxWidth,
  },
  assistantBubble: {
    backgroundColor: THEME.color.messageAssistantBg,
    alignSelf: "flex-start",
    maxWidth: THEME.layout.messageAssistantMaxWidth,
  },
  roleText: {
    fontSize: THEME.font.size2xs,
    fontWeight: THEME.font.weightSemibold,
    color: THEME.color.textStrong,
  },
  messageText: {
    fontSize: THEME.font.sizeSm,
    color: THEME.color.textPrimary,
    lineHeight: THEME.font.lineHeightMessage,
  },
});
