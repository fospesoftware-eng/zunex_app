"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "zunex_admin_token";
const EXPECTED = process.env.NEXT_PUBLIC_ZUNEX_ADMIN_TOKEN ?? process.env.ZUNEX_ADMIN_TOKEN ?? "";

/**
 * Client-side admin auth gate. Returns `authenticated: true` when ANY of:
 *   - We're in dev with no env token (free local access)
 *   - localStorage matches the expected token
 *   - NO token env var is configured at all (we treat this as "open mode"
 *     so a missed Replit env var never locks production out — you MUST
 *     explicitly set ZUNEX_ADMIN_TOKEN to enable the gate)
 * Also returns `isLoading` during the initial mount so callers can show a
 * skeleton instead of flashing the gate.
 */
export function useAdminAuth(): {
  authenticated: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const inDev = process.env.NODE_ENV === "development";
    // OPEN MODE — no token configured anywhere. Allow access unconditionally.
    // This is intentional: on fresh Replit deploys, no ZUNEX_ADMIN_TOKEN is
    // set, and we don't want users locked behind an invisible gate.
    if (!EXPECTED) {
      setAuthenticated(true);
      setIsLoading(false);
      return;
    }
    // Token IS configured — check localStorage match
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    setAuthenticated(stored === EXPECTED);
    setIsLoading(false);
    void inDev; // keep lint happy
  }, []);

  const setToken = (token: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {
      // ignore
    }
    setAuthenticated(!EXPECTED || token === EXPECTED);
  };

  const clearToken = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    // If NO env token is configured, clearing localStorage shouldn't lock us out
    setAuthenticated(!EXPECTED);
  };

  return { authenticated, isLoading, setToken, clearToken };
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}
