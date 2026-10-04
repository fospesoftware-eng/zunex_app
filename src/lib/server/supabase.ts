// ---------------------------------------------------------------------------
// Supabase client — server-side singleton + browser createClient helper.
// Import from this module only; never create clients directly.
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serverClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** Server-side singleton — use in API routes / server components. */
export function getServerSupabase(): SupabaseClient | null {
  if (!URL || !PUBLISHABLE) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[supabase] env NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY missing — DB disabled, using in-memory fallback");
    }
    return null;
  }
  if (!serverClient) {
    serverClient = createClient(URL, PUBLISHABLE, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}

/**
 * Service-role client — bypasses RLS, full read/write.
 * NEVER expose to browser. Server-only.
 */
export function getAdminSupabase(): SupabaseClient | null {
  if (!URL || !SERVICE_ROLE) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[supabase] env SUPABASE_SERVICE_ROLE_KEY missing — admin writes disabled");
    }
    return null;
  }
  if (!adminClient) {
    adminClient = createClient(URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/** Browser client — use in client components. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!URL || !PUBLISHABLE) return null;
  return createClient(URL, PUBLISHABLE);
}
