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

// Simulated outage state for the `network` demo scenario.
let outageStarted = false;
let outageUntil = 0;

function maybeSimulateOutage(): void {
  const { scenario } = useDemoStore.getState();
  if (scenario !== "network") return;
  if (!outageStarted) {
    outageStarted = true;
    outageUntil = Date.now() + 8000;
  }
  if (Date.now() < outageUntil) {
    throw new ApiError("network", "You appear to be offline.", 0);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  maybeSimulateOutage();
  const { scenario, enabled } = useDemoStore.getState();
  const headers = new Headers(init?.headers);
  // Presence of the header marks demo mode; its value selects the scenario.
  if (enabled) headers.set("x-zunex-demo", scenario);
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

  startCharging: (sessionId: string, retry = false) =>
    request<{ snapshot: SessionSnapshot }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/start${retry ? "?retry=1" : ""}`,
      { method: "POST" },
    ),

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
};
