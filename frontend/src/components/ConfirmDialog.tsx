import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { THEME } from "@/src/constants/theme";

import { GlassSurface } from "./GlassSurface";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** When true, confirm uses destructive colors (default). */
  confirmDestructive?: boolean;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDestructive = true,
}: ConfirmDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable accessible={false} onPress={onCancel} style={StyleSheet.absoluteFill} />
        <GlassSurface style={styles.card} contentStyle={styles.cardContent}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelButton, pressed ? styles.cancelButtonPressed : null]}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                confirmDestructive ? styles.confirmButtonDestructive : styles.confirmButtonDefault,
                pressed ? styles.confirmButtonPressed : null,
              ]}
            >
              <Text
                style={
                  confirmDestructive ? styles.confirmButtonTextDestructive : styles.confirmButtonTextDefault
                }
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.color.dimmingOverlay,
    padding: THEME.space.xxxl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
  },
  cardContent: {
    padding: THEME.space.xxxl,
    gap: THEME.space.lg,
  },
  title: {
    fontSize: THEME.font.sizeTitle,
    fontWeight: THEME.font.weightBold,
    color: THEME.color.textPrimary,
  },
  message: {
    fontSize: THEME.font.sizeMd,
    lineHeight: THEME.font.lineHeightBody,
    color: THEME.color.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: THEME.space.md,
    marginTop: THEME.space.sm,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: THEME.space.lg,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
    backgroundColor: THEME.color.surfaceInteractive,
  },
  cancelButtonPressed: {
    opacity: 0.88,
    backgroundColor: THEME.color.accentSoft,
  },
  cancelButtonText: {
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightSemibold,
    color: THEME.color.textPrimary,
  },
  confirmButtonDestructive: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: THEME.space.lg,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.color.destructive,
    backgroundColor: THEME.color.destructiveSurface,
  },
  confirmButtonDefault: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: THEME.space.lg,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.color.borderDefault,
    backgroundColor: THEME.color.surfaceInteractive,
  },
  confirmButtonPressed: {
    opacity: 0.92,
  },
  confirmButtonTextDestructive: {
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightBold,
    color: THEME.color.destructive,
  },
  confirmButtonTextDefault: {
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightBold,
    color: THEME.color.textPrimary,
  },
});
