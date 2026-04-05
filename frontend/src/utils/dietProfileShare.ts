import * as Linking from "expo-linking";

import { DietProfile } from "@/src/types/dietProfile";

type SharedDietProfilePayload = {
  version: 1;
  allergiesAndHardAvoids: string[];
  mostlyAvoid: string[];
  preferredIngredients: string[];
  freeformNotes: string;
};

const IMPORT_QUERY_PARAM = "importDiet";

export function buildDietProfileShareUrl(profile: DietProfile): string {
  const payload = serializeSharedDietProfile(profile);
  return Linking.createURL("/diet-preferences", {
    queryParams: {
      [IMPORT_QUERY_PARAM]: payload,
    },
  });
}

export function buildDietProfileShareMessage(profile: DietProfile): string {
  const url = buildDietProfileShareUrl(profile);
  return `Import my Sousie diet preferences: ${url}`;
}

export function parseSharedDietProfile(value: string): DietProfile {
  const normalized = normalizeQueryValue(value);
  const rawJson = decodeBase64Url(normalized);
  const parsed = JSON.parse(rawJson) as Partial<SharedDietProfilePayload> | null;

  if (!parsed || parsed.version !== 1) {
    throw new Error("Unsupported diet profile share payload.");
  }

  return {
    allergiesAndHardAvoids: ensureStringArray(parsed.allergiesAndHardAvoids),
    mostlyAvoid: ensureStringArray(parsed.mostlyAvoid),
    preferredIngredients: ensureStringArray(parsed.preferredIngredients),
    freeformNotes: typeof parsed.freeformNotes === "string" ? parsed.freeformNotes : "",
    referenceImages: [],
  };
}

export function getDietProfileImportQueryParam(): string {
  return IMPORT_QUERY_PARAM;
}

export function canShareDietProfile(profile: DietProfile): boolean {
  return (
    profile.allergiesAndHardAvoids.length > 0 ||
    profile.mostlyAvoid.length > 0 ||
    profile.preferredIngredients.length > 0 ||
    profile.freeformNotes.trim().length > 0
  );
}

function serializeSharedDietProfile(profile: DietProfile): string {
  const payload: SharedDietProfilePayload = {
    version: 1,
    allergiesAndHardAvoids: profile.allergiesAndHardAvoids,
    mostlyAvoid: profile.mostlyAvoid,
    preferredIngredients: profile.preferredIngredients,
    freeformNotes: profile.freeformNotes.trim(),
  };
  return encodeBase64Url(JSON.stringify(payload));
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeQueryValue(value: string): string {
  return value.replace(/ /g, "+");
}

function encodeBase64Url(value: string): string {
  const base64 = encodeToBase64(value);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeFromBase64(padded);
}

function encodeToBase64(value: string): string {
  const bytes = encodeUtf8(value);
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;
    const combined = (byte1 << 16) | (byte2 << 8) | byte3;

    output += BASE64_ALPHABET[(combined >> 18) & 63];
    output += BASE64_ALPHABET[(combined >> 12) & 63];
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(combined >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? BASE64_ALPHABET[combined & 63] : "=";
  }

  return output;
}

function decodeFromBase64(value: string): string {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 4) {
    const char1 = value[index];
    const char2 = value[index + 1];
    const char3 = value[index + 2];
    const char4 = value[index + 3];

    const enc1 = BASE64_ALPHABET.indexOf(char1);
    const enc2 = BASE64_ALPHABET.indexOf(char2);
    const enc3 = char3 === "=" ? 64 : BASE64_ALPHABET.indexOf(char3);
    const enc4 = char4 === "=" ? 64 : BASE64_ALPHABET.indexOf(char4);

    if (enc1 < 0 || enc2 < 0 || enc3 < 0 || enc4 < 0) {
      throw new Error("Invalid base64 payload.");
    }

    const combined =
      (enc1 << 18) |
      (enc2 << 12) |
      ((enc3 & 63) << 6) |
      (enc4 & 63);

    bytes.push((combined >> 16) & 255);
    if (char3 !== "=") {
      bytes.push((combined >> 8) & 255);
    }
    if (char4 !== "=") {
      bytes.push(combined & 255);
    }
  }

  return decodeUtf8(new Uint8Array(bytes));
}

function encodeUtf8(value: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }

  const encoded = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(encoded.length);
  for (let index = 0; index < encoded.length; index += 1) {
    bytes[index] = encoded.charCodeAt(index);
  }
  return bytes;
}

function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return decodeURIComponent(escape(binary));
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
