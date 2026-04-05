import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "@/src/components/ErrorBanner";
import { GlassSurface } from "@/src/components/GlassSurface";
import { UI_COPY } from "@/src/constants/app";
import { LOG_MESSAGES } from "@/src/constants/logMessages";
import { THEME } from "@/src/constants/theme";
import { useDietProfile } from "@/src/context/DietProfileContext";
import { StorageService } from "@/src/services/storageService";
import {
  DietProfile,
  DietProfileFactory,
  DietProfileImage,
} from "@/src/types/dietProfile";
import { buildId } from "@/src/utils/ids";
import { logError } from "@/src/utils/logger";

const MAX_REFERENCE_IMAGES = 3;

export function DietProfileScreen() {
  const { dietProfile, isLoading, saveDietProfile } = useDietProfile();
  const [draft, setDraft] = useState<DietProfile>(DietProfileFactory.createEmpty());
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setDraft(dietProfile);
  }, [dietProfile]);

  const remainingImageSlots = useMemo(
    () => Math.max(0, MAX_REFERENCE_IMAGES - draft.referenceImages.length),
    [draft.referenceImages.length]
  );

  async function handleSave(): Promise<void> {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);
    try {
      const normalized = normalizeDietProfile(draft);
      await saveDietProfile(normalized);
      const removedImages = dietProfile.referenceImages.filter(
        (image) => !normalized.referenceImages.some((entry) => entry.id === image.id)
      );
      await Promise.all(
        removedImages.map(async (image) => {
          try {
            await StorageService.deleteDietProfileImage(image.uri);
          } catch (error) {
            logError(LOG_MESSAGES.persistDietProfileFailed, error);
          }
        })
      );
      setDraft(normalized);
      setSuccessMessage(UI_COPY.dietPreferencesSaved);
    } catch (error) {
      logError(LOG_MESSAGES.persistDietProfileFailed, error);
      setErrorMessage(UI_COPY.genericError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddImages(): Promise<void> {
    if (remainingImageSlots === 0 || isPickingImage) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsPickingImage(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(UI_COPY.dietPreferencesPermissionError);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: remainingImageSlots > 1,
        quality: 1,
        selectionLimit: remainingImageSlots,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const nextImages = await Promise.all(
        result.assets.slice(0, remainingImageSlots).map(async (asset) => {
          const imageId = buildId("diet-image");
          const extension = getImageExtension(asset.fileName, asset.uri, asset.mimeType);
          const storedUri = await StorageService.copyDietProfileImage(
            asset.uri,
            `${imageId}.${extension}`
          );

          return {
            id: imageId,
            uri: storedUri,
            filename: asset.fileName ?? `${imageId}.${extension}`,
            mimeType: asset.mimeType ?? guessMimeTypeFromExtension(extension),
            width: asset.width,
            height: asset.height,
            fileSize: asset.fileSize,
          } satisfies DietProfileImage;
        })
      );

      setDraft((current) => ({
        ...current,
        referenceImages: [...current.referenceImages, ...nextImages].slice(
          0,
          MAX_REFERENCE_IMAGES
        ),
      }));
    } catch (error) {
      logError(LOG_MESSAGES.persistDietProfileFailed, error);
      setErrorMessage(UI_COPY.dietPreferencesImagePickerError);
    } finally {
      setIsPickingImage(false);
    }
  }

  function handleRemoveImage(image: DietProfileImage): void {
    setDraft((current) => ({
      ...current,
      referenceImages: current.referenceImages.filter((entry) => entry.id !== image.id),
    }));
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GlassSurface contentStyle={styles.heroCard}>
        <Text style={styles.eyebrow}>{UI_COPY.dietPreferencesTitle}</Text>
        <Text style={styles.heroTitle}>Teach Sousie how you like to eat.</Text>
        <Text style={styles.heroSubtitle}>{UI_COPY.dietPreferencesSubtitle}</Text>
      </GlassSurface>

      <ErrorBanner message={errorMessage} />
      {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}

      <BubbleFieldCard
        label={UI_COPY.dietPreferencesSectionHardAvoids}
        hint={UI_COPY.dietPreferencesBubbleHint}
        items={draft.allergiesAndHardAvoids}
        onChangeItems={(items) =>
          setDraft((current) => ({
            ...current,
            allergiesAndHardAvoids: items,
          }))
        }
        placeholder="Peanuts"
      />

      <BubbleFieldCard
        label={UI_COPY.dietPreferencesSectionMostlyAvoid}
        hint={UI_COPY.dietPreferencesBubbleHint}
        items={draft.mostlyAvoid}
        onChangeItems={(items) => setDraft((current) => ({ ...current, mostlyAvoid: items }))}
        placeholder="Bread"
      />

      <BubbleFieldCard
        label={UI_COPY.dietPreferencesSectionPreferred}
        hint={UI_COPY.dietPreferencesBubbleHint}
        items={draft.preferredIngredients}
        onChangeItems={(items) =>
          setDraft((current) => ({
            ...current,
            preferredIngredients: items,
          }))
        }
        placeholder="Eggs"
      />

      <PreferenceFieldCard
        label={UI_COPY.dietPreferencesSectionNotes}
        hint={UI_COPY.dietPreferencesNotesHint}
        value={draft.freeformNotes}
        onChangeText={(value) =>
          setDraft((current) => ({ ...current, freeformNotes: value }))
        }
        placeholder="Example: I mostly follow this chart. Fruit is okay after workouts, but avoid sugary sauces."
        multiline
      />

      <GlassSurface contentStyle={styles.imagesCard}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>{UI_COPY.dietPreferencesSectionImages}</Text>
            <Text style={styles.sectionHint}>{UI_COPY.dietPreferencesImagesHint}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: remainingImageSlots === 0 || isPickingImage,
            }}
            disabled={remainingImageSlots === 0 || isPickingImage}
            onPress={() => {
              void handleAddImages();
            }}
            style={[
              styles.secondaryButton,
              remainingImageSlots === 0 || isPickingImage ? styles.secondaryButtonDisabled : null,
            ]}
          >
            {isPickingImage ? (
              <ActivityIndicator color={THEME.color.textPrimary} />
            ) : (
              <>
                <Ionicons name="image-outline" size={18} color={THEME.color.textPrimary} />
                <Text style={styles.secondaryButtonText}>
                  {UI_COPY.dietPreferencesAddImage}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.imageLimitText}>{UI_COPY.dietPreferencesImageLimit}</Text>

        {draft.referenceImages.length === 0 ? (
          <Text style={styles.emptyText}>
            No reference images yet. Add a chart or diagram if it helps explain your diet.
          </Text>
        ) : (
          <View style={styles.imageGrid}>
            {draft.referenceImages.map((image) => (
              <GlassSurface
                key={image.id}
                style={styles.imageCardWrap}
                contentStyle={styles.imageCard}
              >
                <Image source={{ uri: image.uri }} style={styles.previewImage} contentFit="cover" />
                <View style={styles.imageMeta}>
                  <Text numberOfLines={1} style={styles.imageName}>
                    {image.filename ?? "Reference image"}
                  </Text>
                  <Pressable
                    accessibilityLabel={UI_COPY.dietPreferencesRemoveImage}
                    accessibilityRole="button"
                    onPress={() => {
                      handleRemoveImage(image);
                    }}
                    style={styles.imageRemoveButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={THEME.color.destructive}
                    />
                  </Pressable>
                </View>
              </GlassSurface>
            ))}
          </View>
        )}
      </GlassSurface>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving }}
        disabled={isSaving}
        onPress={() => {
          void handleSave();
        }}
        style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : null]}
      >
        {isSaving ? (
          <ActivityIndicator color={THEME.color.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>{UI_COPY.dietPreferencesSave}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

type PreferenceFieldCardProps = {
  label: string;
  hint: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
};

function PreferenceFieldCard({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: PreferenceFieldCardProps) {
  return (
    <GlassSurface contentStyle={styles.fieldCard}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>
      <TextInput
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.color.textMuted}
        style={[styles.textArea, multiline ? styles.notesArea : null]}
        textAlignVertical="top"
        value={value}
      />
    </GlassSurface>
  );
}

type BubbleFieldCardProps = {
  label: string;
  hint: string;
  items: string[];
  onChangeItems: (items: string[]) => void;
  placeholder: string;
};

function BubbleFieldCard({
  label,
  hint,
  items,
  onChangeItems,
  placeholder,
}: BubbleFieldCardProps) {
  const [draftValue, setDraftValue] = useState("");

  function addItem(): void {
    const cleaned = draftValue.trim();
    if (!cleaned) {
      return;
    }
    const exists = items.some((item) => item.toLowerCase() === cleaned.toLowerCase());
    if (!exists) {
      onChangeItems([...items, cleaned]);
    }
    setDraftValue("");
  }

  function removeItem(target: string): void {
    onChangeItems(items.filter((item) => item !== target));
  }

  return (
    <GlassSurface contentStyle={styles.fieldCard}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>
      <View style={styles.bubbleComposer}>
        <TextInput
          onChangeText={setDraftValue}
          onSubmitEditing={addItem}
          placeholder={placeholder}
          placeholderTextColor={THEME.color.textMuted}
          style={styles.bubbleInput}
          value={draftValue}
          returnKeyType="done"
        />
        <Pressable accessibilityRole="button" onPress={addItem} style={styles.addBubbleButton}>
          <Text style={styles.addBubbleButtonText}>{UI_COPY.dietPreferencesAddItem}</Text>
        </Pressable>
      </View>
      <View style={styles.bubblesWrap}>
        {items.map((item) => (
          <View key={item} style={styles.bubble}>
            <Text style={styles.bubbleText}>{item}</Text>
            <Pressable
              accessibilityLabel={`Remove ${item}`}
              accessibilityRole="button"
              hitSlop={THEME.space.hitSlop}
              onPress={() => {
                removeItem(item);
              }}
              style={styles.bubbleRemoveButton}
            >
              <Ionicons name="close" size={14} color={THEME.color.textPrimary} />
            </Pressable>
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}

function normalizeDietProfile(profile: DietProfile): DietProfile {
  return {
    allergiesAndHardAvoids: dedupeStrings(profile.allergiesAndHardAvoids),
    mostlyAvoid: dedupeStrings(profile.mostlyAvoid),
    preferredIngredients: dedupeStrings(profile.preferredIngredients),
    freeformNotes: profile.freeformNotes.trim(),
    referenceImages: profile.referenceImages.slice(0, MAX_REFERENCE_IMAGES),
  };
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned) {
      continue;
    }
    const lowered = cleaned.toLowerCase();
    if (seen.has(lowered)) {
      continue;
    }
    seen.add(lowered);
    normalized.push(cleaned);
  }
  return normalized;
}

function getImageExtension(
  filename: string | null | undefined,
  uri: string,
  mimeType: string | null | undefined
): string {
  const fileValue = filename ?? uri;
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(fileValue);
  if (match?.[1]) {
    return match[1].toLowerCase();
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "image/gif") {
    return "gif";
  }
  return "jpg";
}

function guessMimeTypeFromExtension(extension: string): string {
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  if (extension === "gif") {
    return "image/gif";
  }
  return "image/jpeg";
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.space.xxxl,
    backgroundColor: THEME.color.backgroundApp,
    gap: THEME.space.sectionGap,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.color.backgroundApp,
  },
  heroCard: {
    gap: THEME.space.lg,
    padding: THEME.space.xxxl,
  },
  eyebrow: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeXs,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: THEME.color.textStrong,
    fontSize: THEME.font.sizeDisplay,
    lineHeight: THEME.font.lineHeightDisplay,
    fontWeight: THEME.font.weightBold,
  },
  heroSubtitle: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeMd,
    lineHeight: THEME.font.lineHeightBody,
  },
  successMessage: {
    color: THEME.color.accent,
    fontSize: THEME.font.sizeSm,
  },
  fieldCard: {
    gap: THEME.space.md,
    padding: THEME.space.xxxl,
  },
  imagesCard: {
    gap: THEME.space.md,
    padding: THEME.space.xxxl,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: THEME.space.md,
  },
  sectionTitleWrap: {
    flex: 1,
    gap: THEME.space.sm,
  },
  sectionTitle: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeTitle,
    fontWeight: THEME.font.weightBold,
  },
  sectionHint: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeSm,
    lineHeight: THEME.font.lineHeightBody,
  },
  textArea: {
    minHeight: 108,
    borderWidth: 1,
    borderColor: THEME.color.borderMuted,
    borderRadius: THEME.radius.xl,
    paddingHorizontal: THEME.space.xl,
    paddingVertical: THEME.space.xl,
    backgroundColor: THEME.color.surfaceMuted,
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeBody,
    lineHeight: THEME.font.lineHeightBody,
  },
  notesArea: {
    minHeight: 132,
  },
  bubbleComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.space.md,
  },
  bubbleInput: {
    flex: 1,
    minHeight: THEME.space.inputMinHeight + THEME.space.md,
    borderWidth: 1,
    borderColor: THEME.color.borderMuted,
    borderRadius: THEME.radius.xl,
    paddingHorizontal: THEME.space.xl,
    paddingVertical: THEME.space.lg,
    backgroundColor: THEME.color.surfaceMuted,
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeBody,
  },
  addBubbleButton: {
    minHeight: THEME.space.inputMinHeight + THEME.space.md,
    paddingHorizontal: THEME.space.xl,
    borderRadius: THEME.radius.xl,
    backgroundColor: THEME.color.surfaceInteractive,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.color.borderStrong,
  },
  addBubbleButtonText: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeSm,
    fontWeight: THEME.font.weightSemibold,
  },
  bubblesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.space.md,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.space.sm,
    paddingLeft: THEME.space.xl,
    paddingRight: THEME.space.md,
    paddingVertical: THEME.space.lg,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.color.accentSoft,
    borderWidth: 1,
    borderColor: THEME.color.borderStrong,
  },
  bubbleText: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeSm,
    fontWeight: THEME.font.weightSemibold,
  },
  bubbleRemoveButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: THEME.space.sm,
    minHeight: THEME.space.inputMinHeight + THEME.space.md,
    paddingHorizontal: THEME.space.xl,
    borderRadius: THEME.radius.xl,
    backgroundColor: THEME.color.surfaceInteractive,
    borderWidth: 1,
    borderColor: THEME.color.borderStrong,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeSm,
    fontWeight: THEME.font.weightSemibold,
  },
  imageLimitText: {
    color: THEME.color.textMuted,
    fontSize: THEME.font.sizeXs,
  },
  emptyText: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeMd,
    lineHeight: THEME.font.lineHeightBody,
  },
  imageGrid: {
    gap: THEME.space.md,
  },
  imageCardWrap: {
    overflow: "hidden",
  },
  imageCard: {
    padding: 0,
  },
  previewImage: {
    width: "100%",
    height: 180,
    backgroundColor: THEME.color.surfaceMuted,
  },
  imageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: THEME.space.xl,
    paddingVertical: THEME.space.lg,
  },
  imageName: {
    flex: 1,
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeSm,
    fontWeight: THEME.font.weightSemibold,
    marginRight: THEME.space.md,
  },
  imageRemoveButton: {
    padding: THEME.space.sm,
  },
  saveButton: {
    minHeight: THEME.space.inputMinHeight + THEME.space.xl * 2,
    borderRadius: THEME.radius.xl,
    backgroundColor: THEME.color.accentStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: THEME.color.controlDisabled,
  },
  saveButtonText: {
    color: THEME.color.onPrimary,
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightBold,
  },
});
