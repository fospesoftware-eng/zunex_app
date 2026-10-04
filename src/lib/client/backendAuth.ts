"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState, useCallback } from "react";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browserClient: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!URL || !PUBLISHABLE) return null;
  if (!browserClient) {
    browserClient = createClient(URL, PUBLISHABLE);
  }
  return browserClient;
}

export type AdminRole = "super_admin" | "admin" | "operator" | "support";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  avatarUrl: string | null;
}

/**
 * Hook for Supabase Auth-backed admin authentication.
 * Returns the current admin user (with role from public.admins) or null.
 */
export function useAdminAuth(): {
  user: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
} {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminProfile = useCallback(async (userId: string): Promise<AdminUser | null> => {
    const client = getClient();
    if (!client) return null;
    const { data, error: err } = await client
      .from("admins")
      .select("id, email, name, role, avatar_url")
      .eq("id", userId)
      .eq("active", true)
      .single();
    if (err || !data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role as AdminRole,
      avatarUrl: data.avatar_url,
    };
  }, []);

  useEffect(() => {
    const client = getClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    // Check existing session
    client.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          const profile = await fetchAdminProfile(session.user.id);
          setUser(profile);
        }
      } catch {
        // profile fetch failed — fall through to signed-out state
      } finally {
        setIsLoading(false);
      }
    }).catch(() => setIsLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchAdminProfile(session.user.id);
        setUser(profile);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAdminProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getClient();
    if (!client) return { ok: false, error: "Supabase not configured" };
    setError(null);

    const { data, error: authErr } = await client.auth.signInWithPassword({ email, password });
    if (authErr) {
      const msg = authErr.message === "Invalid login credentials" ? "Invalid email or password" : authErr.message;
      setError(msg);
      return { ok: false, error: msg };
    }
    if (!data.user) {
      return { ok: false, error: "No user returned" };
    }

    const profile = await fetchAdminProfile(data.user.id);
    if (!profile) {
      await client.auth.signOut();
      const msg = "Account exists but is not an active admin. Contact a super admin.";
      setError(msg);
      return { ok: false, error: msg };
    }

    // Update last_login
    await client.from("admins").update({ last_login: new Date().toISOString() }).eq("id", data.user.id);

    setUser(profile);
    return { ok: true };
  }, [fetchAdminProfile]);

  const signOut = useCallback(async () => {
    const client = getClient();
    if (client) await client.auth.signOut();
    setUser(null);
  }, []);

  return { user, isLoading, error, signIn, signOut };
}

/**
 * Role hierarchy helper. Returns true if `role` has at least `required` level.
 */
export function hasRole(role: AdminRole, required: AdminRole): boolean {
  const levels: Record<AdminRole, number> = {
    super_admin: 4,
    admin: 3,
    operator: 2,
    support: 1,
  };
  return levels[role] >= levels[required];
}

/**
 * Get the access token for API calls. Returns null if not signed in.
 */
export async function getAccessToken(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session?.access_token ?? null;
}

export { getClient as getBrowserSupabase };
