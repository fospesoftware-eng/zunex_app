"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "zunex_admin_token";
const EXPECTED = process.env.NEXT_PUBLIC_ZUNEX_ADMIN_TOKEN ?? process.env.ZUNEX_ADMIN_TOKEN ?? "";

/**
 * Client-side admin auth gate. Returns `authenticated: true` if we're in dev
 * without a token configured OR if localStorage has the correct token.
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
    if (inDev && !EXPECTED) {
      setAuthenticated(true);
      setIsLoading(false);
      return;
    }
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (EXPECTED) {
      setAuthenticated(stored === EXPECTED);
    } else {
      // No token in env — allow only in dev case handled above
      setAuthenticated(inDev);
    }
    setIsLoading(false);
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
    setAuthenticated(false);
  };

  return { authenticated, isLoading, setToken, clearToken };
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}
