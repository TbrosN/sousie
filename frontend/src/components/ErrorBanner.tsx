import { StyleSheet, Text, View } from "react-native";

import { THEME } from "@/src/constants/theme";

type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.color.errorSurface,
    borderColor: THEME.color.errorBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingVertical: THEME.space.md,
    paddingHorizontal: THEME.space.lg,
  },
  text: {
    color: THEME.color.errorText,
    fontSize: THEME.font.sizeXs,
  },
});
