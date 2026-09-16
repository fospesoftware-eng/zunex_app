// ---------------------------------------------------------------------------
// Lightweight heartbeat scheduler — spawns a single setInterval at module
// load that drives simulateHeartbeats() from the hardware store.
// Wrapped in a global-this guard so Next.js hot-reload doesn't leak timers.
// ---------------------------------------------------------------------------

import { simulateHeartbeats } from "./hardwareStore";

const g = globalThis as unknown as { __zunexHeartbeat?: NodeJS.Timeout };

if (!g.__zunexHeartbeat) {
  const isDev = process.env.NODE_ENV === "development";
  const intervalMs = isDev ? 15_000 : 30_000;
  g.__zunexHeartbeat = setInterval(() => {
    try {
      simulateHeartbeats();
    } catch {
      // Never let the scheduler die from a single failure.
    }
  }, intervalMs);
  if (typeof g.__zunexHeartbeat.unref === "function") {
    g.__zunexHeartbeat.unref();
  }
}
