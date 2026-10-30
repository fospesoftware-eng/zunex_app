// ---------------------------------------------------------------------------
// Fire-and-forget DB sync. Every in-memory session mutation we also write to
// Supabase so the LiveDB mirrors server state. Uses the service-role client
// (RLS is enabled on `sessions`; the publishable key cannot write by design).
// Never blocks the request path.
// ---------------------------------------------------------------------------

import { getAdminSupabase } from "@/lib/server/supabase";
import type { SessionRecord } from "@/lib/server/store";

const THROTTLED = new Set<string>();
let lastWarnAt = 0;
const WARN_INTERVAL_MS = 60_000;

/** Upsert a session row — best effort, never throws. */
export function syncSessionToDb(s: SessionRecord): void {
  const supabase = getAdminSupabase();
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
          console.warn("[db] session upsert error:", error.message);
        }
      }
    });
}
