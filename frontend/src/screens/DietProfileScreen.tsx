import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
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
import {
  buildDietProfileShareMessage,
  canShareDietProfile,
  getDietProfileImportQueryParam,
  parseSharedDietProfile,
} from "@/src/utils/dietProfileShare";
import { buildId } from "@/src/utils/ids";
import { logError } from "@/src/utils/logger";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";

const MAX_REFERENCE_IMAGES = 3;

export function DietProfileScreen() {
  const params = useLocalSearchParams();
  const { dietProfile, isDietProfileEnabled, isLoading, saveDietProfile, setDietProfileEnabled } =
    useDietProfile();
  const [draft, setDraft] = useState<DietProfile>(DietProfileFactory.createEmpty());
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastImportedPayload, setLastImportedPayload] = useState("");
  const [pendingImportedProfile, setPendingImportedProfile] = useState<DietProfile | null>(null);
  const lastSyncedProfileRef = useRef("");

  useEffect(() => {
    const nextSyncKey = JSON.stringify({
      ...dietProfile,
      isEnabled: true,
    });
    if (nextSyncKey === lastSyncedProfileRef.current) {
      return;
    }
    lastSyncedProfileRef.current = nextSyncKey;
    setDraft({
      ...dietProfile,
      isEnabled: isDietProfileEnabled,
    });
  }, [dietProfile, isDietProfileEnabled]);

  const remainingImageSlots = useMemo(
    () => Math.max(0, MAX_REFERENCE_IMAGES - draft.referenceImages.length),
    [draft.referenceImages.length]
  );
  const formDisabled = !isDietProfileEnabled;

  async function handleToggleDietProfileEnabled(): Promise<void> {
    const nextEnabled = !isDietProfileEnabled;
    setErrorMessage("");
    setSuccessMessage("");
    setDraft((current) => ({
      ...current,
      isEnabled: nextEnabled,
    }));

    try {
      await setDietProfileEnabled(nextEnabled);
    } catch (error) {
      logError(LOG_MESSAGES.persistDietProfileFailed, error);
      setDraft((current) => ({
        ...current,
        isEnabled: !nextEnabled,
      }));
      setErrorMessage(UI_COPY.genericError);
    }
  }

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

  async function handleShare(): Promise<void> {
    if (isSharing) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const normalized = normalizeDietProfile(draft);
    if (!canShareDietProfile(normalized)) {
      setErrorMessage(UI_COPY.dietPreferencesShareEmpty);
      return;
    }

    setIsSharing(true);

    try {
      await Share.share({
        message: buildDietProfileShareMessage(normalized),
      });
      setSuccessMessage(UI_COPY.dietPreferencesShared);
    } catch (error) {
      logError(LOG_MESSAGES.shareDietProfileFailed, error);
      setErrorMessage(UI_COPY.genericError);
    } finally {
      setIsSharing(false);
    }
  }

  const handleIncomingImport = useCallback((importParam: string): void => {
    setLastImportedPayload(importParam);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const importedProfile = normalizeDietProfile({
        ...parseSharedDietProfile(importParam),
        isEnabled: isDietProfileEnabled,
      });
      const currentProfile = normalizeDietProfile({
        ...dietProfile,
        isEnabled: isDietProfileEnabled,
      });
      const changed = JSON.stringify(importedProfile) !== JSON.stringify(currentProfile);

      if (!changed) {
        setSuccessMessage(UI_COPY.dietPreferencesImportUnchanged);
        return;
      }

      setPendingImportedProfile(importedProfile);
    } catch (error) {
      logError(LOG_MESSAGES.importDietProfileFailed, error);
      setErrorMessage(UI_COPY.dietPreferencesImportError);
    }
  }, [dietProfile, isDietProfileEnabled]);

  useEffect(() => {
    const importParam = readImportParam(params[getDietProfileImportQueryParam()]);
    if (!importParam || isLoading || importParam === lastImportedPayload) {
      return;
    }

    handleIncomingImport(importParam);
  }, [handleIncomingImport, isLoading, lastImportedPayload, params]);

  async function confirmImportReplace(): Promise<void> {
    if (!pendingImportedProfile) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      await saveDietProfile(pendingImportedProfile);
      await deleteDietProfileImages(dietProfile.referenceImages);
      setDraft(pendingImportedProfile);
      setSuccessMessage(UI_COPY.dietPreferencesImportSuccess);
      setPendingImportedProfile(null);
    } catch (error) {
      logError(LOG_MESSAGES.importDietProfileFailed, error);
      setErrorMessage(UI_COPY.dietPreferencesImportError);
    } finally {
      setIsSaving(false);
    }
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
        <View style={styles.toggleCard}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleLabel}>{UI_COPY.dietPreferencesToggleLabel}</Text>
            <Text style={styles.toggleHint}>
              {isDietProfileEnabled
                ? UI_COPY.dietPreferencesToggleEnabled
                : UI_COPY.dietPreferencesToggleDisabled}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={UI_COPY.dietPreferencesToggleLabel}
            accessibilityRole="switch"
            accessibilityState={{ checked: isDietProfileEnabled }}
            hitSlop={THEME.space.hitSlop}
            onPress={() => {
              void handleToggleDietProfileEnabled();
            }}
            style={({ pressed }) => [styles.toggleControl, pressed ? styles.toggleControlPressed : null]}
          >
            <View
              style={[
                styles.toggleTrack,
                isDietProfileEnabled ? styles.toggleTrackEnabled : styles.toggleTrackDisabled,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  isDietProfileEnabled ? styles.toggleThumbEnabled : styles.toggleThumbDisabled,
                ]}
              >
                <Ionicons
                  name={isDietProfileEnabled ? "checkmark" : "close"}
                  size={14}
                  color={isDietProfileEnabled ? THEME.color.onPrimary : THEME.color.textMuted}
                />
              </View>
            </View>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSharing }}
          disabled={isSharing}
          onPress={() => {
            void handleShare();
          }}
          style={[styles.shareButton, isSharing ? styles.shareButtonDisabled : null]}
        >
          {isSharing ? (
            <ActivityIndicator color={THEME.color.textPrimary} />
          ) : (
            <>
              <View style={styles.shareButtonTextWrap}>
                <Text style={styles.shareButtonTitle}>{UI_COPY.dietPreferencesShare}</Text>
                <Text style={styles.shareButtonSubtitle}>
                  {UI_COPY.dietPreferencesShareSubtitle}
                </Text>
              </View>
              <Ionicons name="share-outline" size={20} color={THEME.color.accent} />
            </>
          )}
        </Pressable>
      </GlassSurface>

      <ErrorBanner message={errorMessage} />
      {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}

      <BubbleFieldCard
        disabled={formDisabled}
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
        disabled={formDisabled}
        label={UI_COPY.dietPreferencesSectionMostlyAvoid}
        hint={UI_COPY.dietPreferencesBubbleHint}
        items={draft.mostlyAvoid}
        onChangeItems={(items) => setDraft((current) => ({ ...current, mostlyAvoid: items }))}
        placeholder="Bread"
      />

      <BubbleFieldCard
        disabled={formDisabled}
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
        disabled={formDisabled}
        label={UI_COPY.dietPreferencesSectionNotes}
        hint={UI_COPY.dietPreferencesNotesHint}
        value={draft.freeformNotes}
        onChangeText={(value) =>
          setDraft((current) => ({ ...current, freeformNotes: value }))
        }
        placeholder="Example: I mostly follow this chart. Fruit is okay after workouts, but avoid sugary sauces."
        multiline
      />

      <GlassSurface contentStyle={[styles.imagesCard, formDisabled ? styles.disabledCard : null]}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>{UI_COPY.dietPreferencesSectionImages}</Text>
            <Text style={styles.sectionHint}>{UI_COPY.dietPreferencesImagesHint}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: formDisabled || remainingImageSlots === 0 || isPickingImage,
            }}
            disabled={formDisabled || remainingImageSlots === 0 || isPickingImage}
            onPress={() => {
              void handleAddImages();
            }}
            style={[
              styles.secondaryButton,
              formDisabled || remainingImageSlots === 0 || isPickingImage
                ? styles.secondaryButtonDisabled
                : null,
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
                    accessibilityState={{ disabled: formDisabled }}
                    disabled={formDisabled}
                    onPress={() => {
                      handleRemoveImage(image);
                    }}
                    style={[styles.imageRemoveButton, formDisabled ? styles.iconButtonDisabled : null]}
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
      <ConfirmDialog
        visible={pendingImportedProfile != null}
        title={UI_COPY.dietPreferencesImportConfirmTitle}
        message={UI_COPY.dietPreferencesImportConfirmMessage}
        cancelLabel={UI_COPY.dietPreferencesImportConfirmCancel}
        confirmLabel={UI_COPY.dietPreferencesImportConfirmReplace}
        onCancel={() => {
          setPendingImportedProfile(null);
        }}
        onConfirm={() => {
          void confirmImportReplace();
        }}
      />
    </ScrollView>
  );
}

type PreferenceFieldCardProps = {
  disabled: boolean;
  label: string;
  hint: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
};

function PreferenceFieldCard({
  disabled,
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: PreferenceFieldCardProps) {
  return (
    <GlassSurface contentStyle={[styles.fieldCard, disabled ? styles.disabledCard : null]}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>
      <TextInput
        editable={!disabled}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.color.textMuted}
        style={[
          styles.textArea,
          multiline ? styles.notesArea : null,
          disabled ? styles.inputDisabled : null,
        ]}
        textAlignVertical="top"
        value={value}
      />
    </GlassSurface>
  );
}

type BubbleFieldCardProps = {
  disabled: boolean;
  label: string;
  hint: string;
  items: string[];
  onChangeItems: (items: string[]) => void;
  placeholder: string;
};

function BubbleFieldCard({
  disabled,
  label,
  hint,
  items,
  onChangeItems,
  placeholder,
}: BubbleFieldCardProps) {
  const [draftValue, setDraftValue] = useState("");
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const sortedItems = useMemo(() => sortStringsCaseInsensitive(items), [items]);
  const hasDuplicates = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) {
      const normalized = item.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      if (seen.has(normalized)) {
        return true;
      }
      seen.add(normalized);
    }
    return false;
  }, [items]);

  function addItem(): void {
    if (disabled) {
      return;
    }
    const cleaned = draftValue.trim();
    if (!cleaned) {
      return;
    }
    const exists = items.some((item) => item.toLowerCase() === cleaned.toLowerCase());
    if (!exists) {
      onChangeItems([...items, cleaned]);
      setDuplicateMessage("");
    } else {
      setDuplicateMessage(UI_COPY.dietPreferencesDuplicateItem);
    }
    setDraftValue("");
  }

  function removeItem(target: string): void {
    if (disabled) {
      return;
    }
    onChangeItems(items.filter((item) => item !== target));
    setDuplicateMessage("");
  }

  return (
    <GlassSurface contentStyle={[styles.fieldCard, disabled ? styles.disabledCard : null]}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>
      <View style={styles.bubbleComposer}>
        <TextInput
          editable={!disabled}
          onChangeText={setDraftValue}
          onSubmitEditing={addItem}
          placeholder={placeholder}
          placeholderTextColor={THEME.color.textMuted}
          style={[styles.bubbleInput, disabled ? styles.inputDisabled : null]}
          value={draftValue}
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={addItem}
          style={[styles.addBubbleButton, disabled ? styles.secondaryButtonDisabled : null]}
        >
          <Text style={styles.addBubbleButtonText}>{UI_COPY.dietPreferencesAddItem}</Text>
        </Pressable>
      </View>
      {duplicateMessage ? (
        <Text style={styles.inlineWarningText}>{duplicateMessage}</Text>
      ) : null}
      {hasDuplicates ? (
        <Text style={styles.inlineWarningText}>
          {UI_COPY.dietPreferencesDuplicateItemsDetected}
        </Text>
      ) : null}
      <View style={styles.bubblesWrap}>
        {sortedItems.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.bubble}>
            <Text style={styles.bubbleText}>{item}</Text>
            <Pressable
              accessibilityLabel={`Remove ${item}`}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              hitSlop={THEME.space.hitSlop}
              onPress={() => {
                removeItem(item);
              }}
              style={[styles.bubbleRemoveButton, disabled ? styles.iconButtonDisabled : null]}
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
    isEnabled: profile.isEnabled !== false,
    allergiesAndHardAvoids: dedupeAndSortStrings(profile.allergiesAndHardAvoids),
    mostlyAvoid: dedupeAndSortStrings(profile.mostlyAvoid),
    preferredIngredients: dedupeAndSortStrings(profile.preferredIngredients),
    freeformNotes: profile.freeformNotes.trim(),
    referenceImages: profile.referenceImages.slice(0, MAX_REFERENCE_IMAGES),
  };
}

async function deleteDietProfileImages(images: DietProfileImage[]): Promise<void> {
  await Promise.all(
    images.map(async (image) => {
      try {
        await StorageService.deleteDietProfileImage(image.uri);
      } catch (error) {
        logError(LOG_MESSAGES.persistDietProfileFailed, error);
      }
    })
  );
}

function dedupeAndSortStrings(values: string[]): string[] {
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
  return sortStringsCaseInsensitive(normalized);
}

function sortStringsCaseInsensitive(values: string[]): string[] {
  return [...values].sort((left, right) =>
    left.toLowerCase().localeCompare(right.toLowerCase())
  );
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
  toggleCard: {
    minHeight: THEME.space.inputMinHeight + THEME.space.xl,
    borderWidth: 1,
    borderColor: THEME.color.borderMuted,
    borderRadius: THEME.radius.xl,
    backgroundColor: THEME.color.surfaceMuted,
    paddingHorizontal: THEME.space.xl,
    paddingVertical: THEME.space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: THEME.space.lg,
  },
  toggleTextWrap: {
    flex: 1,
    gap: THEME.space.xs,
  },
  toggleLabel: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightSemibold,
  },
  toggleHint: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeSm,
    lineHeight: THEME.font.lineHeightBody,
  },
  toggleControl: {
    paddingVertical: THEME.space.xs,
    paddingLeft: THEME.space.lg,
  },
  toggleControlPressed: {
    opacity: 0.85,
  },
  toggleTrack: {
    width: 58,
    height: 34,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    paddingHorizontal: THEME.space.xs,
    alignItems: "center",
    flexDirection: "row",
  },
  toggleTrackEnabled: {
    justifyContent: "flex-end",
    backgroundColor: THEME.color.accentSoft,
    borderColor: THEME.color.borderStrong,
  },
  toggleTrackDisabled: {
    justifyContent: "flex-start",
    backgroundColor: THEME.color.surfaceInteractive,
    borderColor: THEME.color.borderMuted,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: THEME.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  toggleThumbEnabled: {
    backgroundColor: THEME.color.accentStrong,
    borderColor: THEME.color.primaryAction,
  },
  toggleThumbDisabled: {
    backgroundColor: THEME.color.surfaceStrong,
    borderColor: THEME.color.borderDefault,
  },
  shareButton: {
    minHeight: THEME.space.inputMinHeight + THEME.space.md,
    borderWidth: 1,
    borderColor: THEME.color.borderStrong,
    borderRadius: THEME.radius.xl,
    backgroundColor: THEME.color.surfaceInteractive,
    paddingHorizontal: THEME.space.xl,
    paddingVertical: THEME.space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: THEME.space.lg,
  },
  shareButtonDisabled: {
    opacity: 0.72,
  },
  shareButtonTextWrap: {
    flex: 1,
    gap: THEME.space.xs,
  },
  shareButtonTitle: {
    color: THEME.color.textPrimary,
    fontSize: THEME.font.sizeMd,
    fontWeight: THEME.font.weightSemibold,
  },
  shareButtonSubtitle: {
    color: THEME.color.textSecondary,
    fontSize: THEME.font.sizeSm,
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
  disabledCard: {
    opacity: 0.58,
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
  inputDisabled: {
    color: THEME.color.textMuted,
    borderColor: THEME.color.borderDefault,
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
  inlineWarningText: {
    color: THEME.color.destructive,
    fontSize: THEME.font.sizeSm,
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
  iconButtonDisabled: {
    opacity: 0.5,
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

function readImportParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
