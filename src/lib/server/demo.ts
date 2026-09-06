import type { DemoScenario } from "@/lib/core/types";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Demo scenarios ride in on every request via a header set by the client
// (persisted in localStorage). Production simply never sends the header.
// In production, non-default scenarios also require the demo token so an
// attacker can't force failures (station offline, payment failed, etc.).
// ---------------------------------------------------------------------------

const SCENARIOS: DemoScenario[] = [
  "default",
  "station_offline",
  "payment_failed",
  "start_failed",
  "network",
  "network_complete",
];

function hasDemoToken(req: NextRequest): boolean {
  const token = process.env.ZUNEX_DEMO_TOKEN;
  if (!token) return false;
  const provided = req.headers.get("x-zunex-demo-token");
  if (!provided || provided.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) mismatch |= provided.charCodeAt(i) ^ token.charCodeAt(i);
  return mismatch === 0;
}

export function scenarioFromRequest(req: NextRequest): DemoScenario {
  const raw = req.headers.get("x-zunex-demo") ?? "default";
  const scenario = (SCENARIOS as string[]).includes(raw) ? (raw as DemoScenario) : "default";
  // In production, only honor non-default scenarios when the demo token is
  // present. This prevents an attacker from forcing station_offline /
  // payment_failed / start_failed on arbitrary requests.
  if (process.env.NODE_ENV === "production" && scenario !== "default" && !hasDemoToken(req)) {
    return "default";
  }
  return scenario;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
