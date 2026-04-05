import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { LOG_MESSAGES } from "@/src/constants/logMessages";
import { StorageService } from "@/src/services/storageService";
import { DietProfile, DietProfileFactory } from "@/src/types/dietProfile";
import { logError } from "@/src/utils/logger";

type DietProfileContextValue = {
  dietProfile: DietProfile;
  isLoading: boolean;
  saveDietProfile: (profile: DietProfile) => Promise<void>;
};

const DietProfileContext = createContext<DietProfileContextValue | null>(null);

export function DietProfileProvider({ children }: PropsWithChildren) {
  const [dietProfile, setDietProfile] = useState<DietProfile>(DietProfileFactory.createEmpty());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize(): Promise<void> {
    try {
      const stored = await StorageService.readDietProfile();
      setDietProfile(stored);
    } catch (error) {
      logError(LOG_MESSAGES.loadDietProfileFailed, error);
      setDietProfile(DietProfileFactory.createEmpty());
    } finally {
      setIsLoading(false);
    }
  }

  const saveDietProfile = useCallback(async (profile: DietProfile): Promise<void> => {
    setDietProfile(profile);
    try {
      await StorageService.writeDietProfile(profile);
    } catch (error) {
      logError(LOG_MESSAGES.persistDietProfileFailed, error);
      throw error;
    }
  }, []);

  const value = useMemo<DietProfileContextValue>(
    () => ({
      dietProfile,
      isLoading,
      saveDietProfile,
    }),
    [dietProfile, isLoading, saveDietProfile]
  );

  return <DietProfileContext.Provider value={value}>{children}</DietProfileContext.Provider>;
}

export function useDietProfile(): DietProfileContextValue {
  const context = useContext(DietProfileContext);
  if (!context) {
    throw new Error("useDietProfile must be used within DietProfileProvider");
  }
  return context;
}
