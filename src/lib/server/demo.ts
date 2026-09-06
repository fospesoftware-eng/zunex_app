import type { DemoScenario } from "@/lib/core/types";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Demo scenarios ride in on every request via a header set by the client
// (persisted in localStorage). Production simply never sends the header.
// ---------------------------------------------------------------------------

const SCENARIOS: DemoScenario[] = [
  "default",
  "station_offline",
  "payment_failed",
  "start_failed",
  "network",
];

export function scenarioFromRequest(req: NextRequest): DemoScenario {
  const raw = req.headers.get("x-zunex-demo") ?? "default";
  return (SCENARIOS as string[]).includes(raw) ? (raw as DemoScenario) : "default";
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
