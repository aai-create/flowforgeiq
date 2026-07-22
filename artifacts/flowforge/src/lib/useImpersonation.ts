import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

export interface ImpersonationState {
  active: boolean;
  orgId: number | null;
  orgName: string | null;
  token: string | null;
}

export interface ImpersonationContext extends ImpersonationState {
  enter: (token: string) => void;
  exit: () => void;
}

const STORAGE_KEY = "forge-impersonate-token";

function decodePayload(token: string): { orgId: number; orgName: string; orgSlug: string; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { orgId: number; orgName: string; orgSlug: string; exp: number };
    if (payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function readFromStorage(): ImpersonationState {
  try {
    const token = sessionStorage.getItem(STORAGE_KEY);
    if (!token) return { active: false, orgId: null, orgName: null, token: null };
    const payload = decodePayload(token);
    if (!payload) {
      sessionStorage.removeItem(STORAGE_KEY);
      return { active: false, orgId: null, orgName: null, token: null };
    }
    return { active: true, orgId: payload.orgId, orgName: payload.orgName, token };
  } catch {
    return { active: false, orgId: null, orgName: null, token: null };
  }
}

export const ImpersonationCtx = createContext<ImpersonationContext>({
  active: false,
  orgId: null,
  orgName: null,
  token: null,
  enter: () => {},
  exit: () => {},
});

export function useImpersonation(): ImpersonationContext {
  return useContext(ImpersonationCtx);
}

export function useImpersonationProvider(): ImpersonationContext {
  const [state, setState] = useState<ImpersonationState>(readFromStorage);
  const originalFetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    if (state.active && state.token) {
      const token = state.token;
      if (!originalFetchRef.current) {
        originalFetchRef.current = window.fetch.bind(window);
      }
      const orig = originalFetchRef.current;
      window.fetch = (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (url.includes("/api/")) {
          const headers = new Headers(init?.headers);
          headers.set("X-Forge-Impersonate", token);
          return orig(input, { ...init, headers });
        }
        return orig(input, init);
      };
    } else {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    }
    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, [state.active, state.token]);

  const enter = useCallback((token: string) => {
    const payload = decodePayload(token);
    if (!payload) return;
    sessionStorage.setItem(STORAGE_KEY, token);
    setState({ active: true, orgId: payload.orgId, orgName: payload.orgName, token });
  }, []);

  const exit = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({ active: false, orgId: null, orgName: null, token: null });
  }, []);

  return { ...state, enter, exit };
}
