import type { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { THEME } from "@/src/constants/theme";

type GlassSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function GlassSurface({ children, style, contentStyle }: GlassSurfaceProps) {
  return (
    <View style={[styles.shadowWrap, style]}>
      <View style={styles.borderGlow} />
      <View style={[styles.surface, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    position: "relative",
    borderRadius: THEME.radius.xl,
    overflow: "hidden",
    shadowColor: THEME.color.shadow,
    shadowOpacity: THEME.metrics.cardShadowOpacity,
    shadowRadius: THEME.metrics.cardShadowRadius,
    shadowOffset: { width: 0, height: THEME.metrics.cardShadowOffsetY },
    elevation: 12,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: THEME.color.borderStrong,
    backgroundColor: THEME.color.surfaceMuted,
  },
  surface: {
    borderRadius: THEME.radius.xl,
    backgroundColor: THEME.color.surface,
    borderWidth: 1,
    borderColor: THEME.color.borderMuted,
  },
});
