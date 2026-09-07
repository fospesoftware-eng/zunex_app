import type { DemoScenario } from "@/lib/core/types";
import type { NextRequest } from "next/server";
import { isDemoAuthorized } from "@/lib/server/security";

// ---------------------------------------------------------------------------
// Demo scenarios ride in on every request via a header set by the client
// (persisted in localStorage). Production never sends the header for normal
// users; the demo panel sends it. This is a demo build (mock payments + mock
// hardware), so non-default scenarios are honored when demo is authorized —
// in production that means the header is present and, IF ZUNEX_DEMO_TOKEN is
// configured, the token matches (set ZUNEX_DEMO_ENABLED=0 to force-disable).
// ---------------------------------------------------------------------------

const SCENARIOS: DemoScenario[] = [
  "default",
  "station_offline",
  "payment_failed",
  "start_failed",
  "network",
  "network_complete",
];

export function scenarioFromRequest(req: NextRequest): DemoScenario {
  const raw = req.headers.get("x-zunex-demo") ?? "default";
  const scenario = (SCENARIOS as string[]).includes(raw) ? (raw as DemoScenario) : "default";
  // In production, only honor non-default scenarios when demo is authorized
  // (token matches if configured; otherwise the demo-build default allows it).
  if (process.env.NODE_ENV === "production" && scenario !== "default" && !isDemoAuthorized(req)) {
    return "default";
  }
  return scenario;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
