import { useCallback, useState } from "react";
import { useUser } from "@clerk/react";

const STORAGE_KEY = (userId: string) => `flowforge_onboarding_v1_${userId}`;

interface OnboardingState {
  step: number;
  isComplete: boolean;
  forceShow: boolean;
  supplierId: number | null;
  buyerId: number | null;
  dismissedNudges: string[];
}

const DEFAULT_STATE: OnboardingState = {
  step: 0,
  isComplete: false,
  forceShow: false,
  supplierId: null,
  buyerId: null,
  dismissedNudges: [],
};

function readState(userId: string): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      step: typeof parsed.step === "number" ? parsed.step : 0,
      isComplete: typeof parsed.isComplete === "boolean" ? parsed.isComplete : false,
      forceShow: typeof parsed.forceShow === "boolean" ? parsed.forceShow : false,
      supplierId: typeof parsed.supplierId === "number" ? parsed.supplierId : null,
      buyerId: typeof parsed.buyerId === "number" ? parsed.buyerId : null,
      dismissedNudges: Array.isArray(parsed.dismissedNudges) ? parsed.dismissedNudges : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(userId: string, state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(state));
  } catch { /* ignore */ }
}

export function useOnboardingState() {
  const { user, isLoaded } = useUser();
  const [version, setVersion] = useState(0);

  const bumpVersion = useCallback(() => setVersion(v => v + 1), []);

  const state: OnboardingState = (() => {
    if (!isLoaded || !user?.id) return { ...DEFAULT_STATE, isComplete: true };
    const s = readState(user.id);
    // reference version so IIFE re-runs when state is written
    void version;
    return s;
  })();

  const markStep = useCallback(
    (step: number, extra?: { supplierId?: number; buyerId?: number }) => {
      if (!user?.id) return;
      const current = readState(user.id);
      const next: OnboardingState = {
        ...current,
        step,
        ...(extra?.supplierId != null ? { supplierId: extra.supplierId } : {}),
        ...(extra?.buyerId != null ? { buyerId: extra.buyerId } : {}),
      };
      writeState(user.id, next);
      bumpVersion();
    },
    [user?.id, bumpVersion],
  );

  const markComplete = useCallback(() => {
    if (!user?.id) return;
    const current = readState(user.id);
    writeState(user.id, { ...current, isComplete: true, forceShow: false, step: 4 });
    bumpVersion();
  }, [user?.id, bumpVersion]);

  const reset = useCallback(() => {
    if (!user?.id) return;
    writeState(user.id, { ...DEFAULT_STATE, forceShow: true });
    bumpVersion();
  }, [user?.id, bumpVersion]);

  const clearForceShow = useCallback(() => {
    if (!user?.id) return;
    const current = readState(user.id);
    if (!current.forceShow) return;
    writeState(user.id, { ...current, forceShow: false });
    bumpVersion();
  }, [user?.id, bumpVersion]);

  const dismissNudge = useCallback(
    (nudgeKey: string) => {
      if (!user?.id) return;
      const current = readState(user.id);
      if (current.dismissedNudges.includes(nudgeKey)) return;
      writeState(user.id, {
        ...current,
        dismissedNudges: [...current.dismissedNudges, nudgeKey],
      });
      bumpVersion();
    },
    [user?.id, bumpVersion],
  );

  return { state, markStep, markComplete, reset, clearForceShow, dismissNudge };
}
