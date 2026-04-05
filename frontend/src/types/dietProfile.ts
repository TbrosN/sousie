export type DietProfileImage = {
  id: string;
  uri: string;
  filename?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
};

export type DietProfile = {
  allergiesAndHardAvoids: string[];
  mostlyAvoid: string[];
  preferredIngredients: string[];
  freeformNotes: string;
  referenceImages: DietProfileImage[];
};

export class DietProfileFactory {
  static createEmpty(): DietProfile {
    return {
      allergiesAndHardAvoids: [],
      mostlyAvoid: [],
      preferredIngredients: [],
      freeformNotes: "",
      referenceImages: [],
    };
  }
}
