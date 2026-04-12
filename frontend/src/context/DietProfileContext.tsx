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
  isDietProfileEnabled: boolean;
  dietProfileForAi: DietProfile | undefined;
  isLoading: boolean;
  setDietProfileEnabled: (enabled: boolean) => Promise<void>;
  saveDietProfile: (profile: DietProfile) => Promise<void>;
};

const DietProfileContext = createContext<DietProfileContextValue | null>(null);

export function DietProfileProvider({ children }: PropsWithChildren) {
  const [dietProfile, setDietProfile] = useState<DietProfile>(DietProfileFactory.createEmpty());
  const [isDietProfileEnabled, setIsDietProfileEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize(): Promise<void> {
    try {
      const stored = await StorageService.readDietProfile();
      setDietProfile(stored);
      setIsDietProfileEnabled(stored.isEnabled !== false);
    } catch (error) {
      logError(LOG_MESSAGES.loadDietProfileFailed, error);
      setDietProfile(DietProfileFactory.createEmpty());
      setIsDietProfileEnabled(true);
    } finally {
      setIsLoading(false);
    }
  }

  const saveDietProfile = useCallback(async (profile: DietProfile): Promise<void> => {
    const nextProfile = {
      ...profile,
      isEnabled: isDietProfileEnabled,
    };
    setDietProfile(nextProfile);
    try {
      await StorageService.writeDietProfile(nextProfile);
    } catch (error) {
      logError(LOG_MESSAGES.persistDietProfileFailed, error);
      throw error;
    }
  }, [isDietProfileEnabled]);

  const setDietProfileEnabled = useCallback(
    async (enabled: boolean): Promise<void> => {
      const previousEnabled = isDietProfileEnabled;
      setIsDietProfileEnabled(enabled);
      try {
        await StorageService.writeDietProfile({
          ...dietProfile,
          isEnabled: enabled,
        });
      } catch (error) {
        setIsDietProfileEnabled(previousEnabled);
        logError(LOG_MESSAGES.persistDietProfileFailed, error);
        throw error;
      }
    },
    [dietProfile, isDietProfileEnabled]
  );

  const dietProfileForAi = useMemo<DietProfile | undefined>(
    () =>
      isDietProfileEnabled
        ? {
            ...dietProfile,
            isEnabled: true,
          }
        : undefined,
    [dietProfile, isDietProfileEnabled]
  );

  const value = useMemo<DietProfileContextValue>(
    () => ({
      dietProfile,
      isDietProfileEnabled,
      dietProfileForAi,
      isLoading,
      setDietProfileEnabled,
      saveDietProfile,
    }),
    [
      dietProfile,
      dietProfileForAi,
      isDietProfileEnabled,
      isLoading,
      saveDietProfile,
      setDietProfileEnabled,
    ]
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
