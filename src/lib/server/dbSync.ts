// ---------------------------------------------------------------------------
// Fire-and-forget DB sync. Every in-memory session mutation we also write to
// Supabase so the LiveDB mirrors server state. Uses the service-role client
// (RLS is enabled on `sessions`; the publishable key cannot write by design).
// Never blocks the request path.
// ---------------------------------------------------------------------------

import { getAdminSupabase } from "@/lib/server/supabase";
import { FREE_PLANS, PLANS, WIFI_PLANS, type SessionRecord } from "@/lib/server/store";

const THROTTLED = new Set<string>();
let lastWarnAt = 0;
const WARN_INTERVAL_MS = 60_000;

const ALL_PLANS = [...PLANS, ...FREE_PLANS, ...WIFI_PLANS];
const PRICE_MAP = new Map(ALL_PLANS.map((p) => [p.id, p.pricePaise]));

// ── Device resolution (station → hardware device) ───────────────────────────
// Sessions record which physical device served them. Cached; refreshed lazily
// so the write path never waits on a lookup.
const deviceByStation = new Map<string, string>();
let deviceMapLoadedAt = 0;

function refreshDeviceMap(): void {
  const sb = getAdminSupabase();
  if (!sb) return;
  if (Date.now() - deviceMapLoadedAt < 60_000) return;
  deviceMapLoadedAt = Date.now();
  void sb
    .from("hardware")
    .select("id, station_id")
    .then(({ data }) => {
      for (const row of data ?? []) {
        if (row.station_id && row.id) deviceByStation.set(String(row.station_id), String(row.id));
      }
    });
}

// ── Column feature detection ────────────────────────────────────────────────
// If the live DB predates the extended columns (migration not applied yet),
// PostgREST rejects the extended row — fall back to the legacy shape so
// sessions keep persisting. The fallback self-heals: after a cooldown the
// next write tries the extended row again, so applying the migration does
// not require restarting the server.
const EXTENDED_RECHECK_MS = 60_000;
let extendedDisabledUntil = 0;

function shouldUseExtended(): boolean {
  return Date.now() >= extendedDisabledUntil;
}

function isMissingColumnError(msg: string | undefined): boolean {
  return Boolean(msg && (msg.includes("column") || msg.includes("schema cache")));
}

function warnThrottled(msg: string | undefined): void {
  const now = Date.now();
  if (now - lastWarnAt > WARN_INTERVAL_MS) {
    lastWarnAt = now;
    console.warn("[db] session upsert error:", msg);
  }
}

/** Upsert a session row — best effort, never throws. */
export function syncSessionToDb(s: SessionRecord): void {
  const supabase = getAdminSupabase();
  if (!supabase) return;
  const key = `${s.id}:${s.state}`;
  if (THROTTLED.has(key)) return;
  THROTTLED.add(key);
  setTimeout(() => THROTTLED.delete(key), 5000); // dedupe per state per session

  if (shouldUseExtended()) refreshDeviceMap();

  const now = Date.now();
  // Live energy estimate: watts × elapsed hours (final once completedAt lands).
  let deliveredKwh = 0;
  if (s.startedAt && s.watts) {
    const endMs = s.completedAt ?? Math.min(now, s.endsAt ?? now);
    deliveredKwh = Math.max(0, (s.watts * (endMs - s.startedAt)) / 3_600_000_000);
  }

  const baseRow = {
    id: s.id,
    station_id: s.stationId,
    plan_id: s.planId,
    state: s.state,
    started_at: s.startedAt ? new Date(s.startedAt).toISOString() : null,
    ends_at: s.endsAt ? new Date(s.endsAt).toISOString() : null,
    stopped_at: s.completedAt ? new Date(s.completedAt).toISOString() : null,
    power_kw: s.watts ? s.watts / 1000 : null,
    delivered_kwh: Math.round(deliveredKwh * 1000) / 1000,
    client_did: null,
  };

  const extendedRow = {
    ...baseRow,
    device_id: deviceByStation.get(s.stationId) ?? null,
    amount_paise: PRICE_MAP.get(s.planId) ?? null,
    payment_intent_id: s.intentId,
    paid_at: s.paidAt ? new Date(s.paidAt).toISOString() : null,
  };

  const useExtended = shouldUseExtended();
  const row = useExtended ? extendedRow : baseRow;

  void supabase
    .from("sessions")
    .upsert(row, { onConflict: "id" })
    .then(({ error }) => {
      if (!error) {
        extendedDisabledUntil = 0; // extended path healthy
        return;
      }
      // Migration not applied yet → degrade to legacy columns and retry once.
      if (useExtended && isMissingColumnError(error.message)) {
        extendedDisabledUntil = Date.now() + EXTENDED_RECHECK_MS;
        void supabase
          .from("sessions")
          .upsert(baseRow, { onConflict: "id" })
          .then(({ error: retryErr }) => {
            if (retryErr) warnThrottled(retryErr.message);
          });
        return;
      }
      warnThrottled(error.message);
    });
}
