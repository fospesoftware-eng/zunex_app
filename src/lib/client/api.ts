"use client";

import type {
  ApiEnvelope,
  FriendlyError,
  PaymentIntentDTO,
  SessionSnapshot,
  StationPayload,
} from "@/lib/core/types";
import { useDemoStore } from "@/lib/client/demoStore";

// ---------------------------------------------------------------------------
// Thin API client. Attaches demo headers, simulates the "network" demo
// scenario, and unwraps the envelope into typed data or an ApiError.
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  code: string;
  status: number;
  friendly?: FriendlyError;
  constructor(code: string, message: string, status: number, friendly?: FriendlyError) {
    super(message);
    this.code = code;
    this.status = status;
    this.friendly = friendly;
  }
}

// Simulated outage state for the `network` / `network_complete` demo scenarios.
let outageStart = 0;
let outageUntil = 0;

function armOutage(delayMs: number, durationMs: number): void {
  outageStart = Date.now() + delayMs;
  outageUntil = outageStart + durationMs;
}

function maybeSimulateOutage(): void {
  const { scenario } = useDemoStore.getState();
  if (scenario === "network" && !outageUntil) {
    armOutage(0, 8000);
  }
  // `network_complete` is armed by startCharging — the outage begins a few
  // seconds into the charge while the server finishes it behind the blackout.
  if (outageUntil && Date.now() >= outageStart && Date.now() < outageUntil) {
    throw new ApiError("network", "You appear to be offline.", 0);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  maybeSimulateOutage();
  const { scenario, enabled } = useDemoStore.getState();
  const headers = new Headers(init?.headers);
  // Presence of the header marks demo mode; its value selects the scenario.
  if (enabled) headers.set("x-zunex-demo", scenario);
  // Demo endpoints require a shared secret in production. NEXT_PUBLIC_ var is
  // only set when the operator wants the demo panel active in production.
  const demoToken = process.env.NEXT_PUBLIC_ZUNEX_DEMO_TOKEN;
  if (enabled && demoToken) headers.set("x-zunex-demo-token", demoToken);
  if (init?.body) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError("network", "You appear to be offline.", 0);
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("network", "Unexpected response from the cloud.", res.status);
  }

  if (!envelope.ok) {
    throw new ApiError(envelope.code, envelope.message, res.status, envelope.friendly);
  }
  return envelope.data;
}

export const api = {
  getStation: (stationId: string) =>
    request<StationPayload>(`/api/station/${encodeURIComponent(stationId)}`),

  createSession: (input: { stationId: string; planId: string; idempotencyKey: string }) =>
    request<{ snapshot: SessionSnapshot }>(
      `/api/sessions`,
      {
        method: "POST",
        body: JSON.stringify({
          stationId: input.stationId,
          planId: input.planId,
        }),
        headers: { "x-idempotency-key": input.idempotencyKey },
      },
    ),

  getSnapshot: (sessionId: string) =>
    request<{ snapshot: SessionSnapshot }>(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    ),

  createPaymentIntent: (sessionId: string) =>
    request<{ intent: PaymentIntentDTO }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/payment`,
      { method: "POST" },
    ),

  confirmPayment: (sessionId: string) =>
    request<{ snapshot: SessionSnapshot }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/payment/confirm`,
      { method: "POST" },
    ),

  startCharging: async (sessionId: string, retry = false) => {
    const res = await request<{ snapshot: SessionSnapshot }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/start${retry ? "?retry=1" : ""}`,
      { method: "POST" },
    );
    // Arm the blackout a few seconds into the charge — the server completes
    // the session (12s end) while the client is cut off.
    const { scenario } = useDemoStore.getState();
    if (scenario === "network_complete") armOutage(4000, 12000);
    return res;
  },

  cancelSession: (sessionId: string) =>
    request<{ snapshot: SessionSnapshot }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/cancel`,
      { method: "POST" },
    ),

  /** Demo-only fast-forward: collapse remaining charging time. */
  demoFinish: (sessionId: string) =>
    request<{ snapshot: SessionSnapshot }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/demo/finish`,
      { method: "POST" },
    ),

  /** Demo-only: force a payment outcome from the demo panel. */
  demoPaySimulate: (sessionId: string, outcome: "succeed" | "fail") =>
    request<{ ok: boolean }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/demo/payment`,
      { method: "POST", body: JSON.stringify({ outcome }) },
    ),
};
