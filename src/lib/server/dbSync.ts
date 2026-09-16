// ---------------------------------------------------------------------------
// Fire-and-forget DB sync. Every in-memory session mutation we also try to
// write to Supabase so the LiveDB mirrors the server state. Silent on RLS
// blocks (publishable key can't write by design — a future service_role key
// makes these writes stick). Never blocks the request path.
// ---------------------------------------------------------------------------

import { getServerSupabase } from "@/lib/server/supabase";
import type { SessionRecord } from "@/lib/server/store";

const THROTTLED = new Set<string>();
let lastWarnAt = 0;
const WARN_INTERVAL_MS = 60_000;

/** Upsert a session row — best effort, silent fail. */
export function syncSessionToDb(s: SessionRecord): void {
  const supabase = getServerSupabase();
  if (!supabase) return;
  const key = `${s.id}:${s.state}`;
  if (THROTTLED.has(key)) return;
  THROTTLED.add(key);
  setTimeout(() => THROTTLED.delete(key), 5000); // dedupe per state per session

  const row = {
    id: s.id,
    station_id: s.stationId,
    plan_id: s.planId,
    state: s.state,
    started_at: s.startedAt ? new Date(s.startedAt).toISOString() : null,
    ends_at: s.endsAt ? new Date(s.endsAt).toISOString() : null,
    stopped_at: s.completedAt ? new Date(s.completedAt).toISOString() : null,
    power_kw: s.watts ? s.watts / 1000 : null,
    delivered_kwh: null, // populated later from hardware telemetry
    client_did: null,
  };

  void supabase
    .from("sessions")
    .upsert(row, { onConflict: "id" })
    .then(({ error }) => {
      if (error) {
        const now = Date.now();
        if (now - lastWarnAt > WARN_INTERVAL_MS) {
          lastWarnAt = now;
          // RLS "violates row-level security policy" is expected with publishable-only key
          if (!error.message?.includes("row-level security")) {
            console.warn("[db] session upsert error:", error.message);
          }
        }
      }
    });
}
