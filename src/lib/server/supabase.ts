// ---------------------------------------------------------------------------
// Supabase client — server-side singleton + browser createClient helper.
// Import from this module only; never create clients directly.
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let serverClient: SupabaseClient | null = null;

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

/** Browser client — use in client components. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!URL || !PUBLISHABLE) return null;
  return createClient(URL, PUBLISHABLE);
}
