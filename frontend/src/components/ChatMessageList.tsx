import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ChatMessage } from "@/src/types/chat";

type ChatMessageListProps = {
  messages: ChatMessage[];
};

export function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.bubble,
            message.role === "user" ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text style={styles.roleText}>
            {message.role === "user" ? "You" : "Sousie AI"}
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
    gap: 10,
    paddingBottom: 12,
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  userBubble: {
    backgroundColor: "#e0f2fe",
    alignSelf: "flex-end",
    maxWidth: "85%",
  },
  assistantBubble: {
    backgroundColor: "#f3f4f6",
    alignSelf: "flex-start",
    maxWidth: "95%",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },
  messageText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
});
