import { useUser } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";

function storageKey(userId: string, pref: string): string {
  return `ff:user:${userId}:pref:${pref}`;
}

export function useUserPref<T extends string>(
  pref: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const { user } = useUser();
  const userId = user?.id ?? "__anonymous__";

  const [value, setLocalValue] = useState<T>(
    () => (localStorage.getItem(storageKey(userId, pref)) as T | null) ?? defaultValue,
  );

  useEffect(() => {
    const stored = localStorage.getItem(storageKey(userId, pref)) as T | null;
    setLocalValue(stored ?? defaultValue);
  }, [userId, pref, defaultValue]);

  const setValue = useCallback(
    (next: T) => {
      localStorage.setItem(storageKey(userId, pref), next);
      setLocalValue(next);
    },
    [userId, pref],
  );

  return [value, setValue];
}
