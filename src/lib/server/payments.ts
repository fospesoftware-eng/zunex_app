import type { PaymentIntentDTO, UpiAppTarget } from "@/lib/core/types";
import { randBetween, sleep } from "@/lib/server/demo";
import { store, type IntentRecord } from "@/lib/server/store";

// ---------------------------------------------------------------------------
// Payment abstraction. The UI only ever speaks to this interface.
// MockUpiProvider simulates a PSP (e.g. Razorpay/Cashfree UPI flow).
// A real provider implements the same two calls:
//   createIntent -> returns UPI intent URI + app targets
//   verifyIntent -> server-to-server verification with the provider
// The frontend NEVER decides whether payment succeeded.
// ---------------------------------------------------------------------------

const MERCHANT_VPA = "zunex@ybl";
const MERCHANT_NAME = "ZUNEX";

export interface CreateIntentInput {
  sessionId: string;
  amountPaise: number;
  note: string;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; code: "payment_failed" | "intent_not_found" | "invalid_state" };

export interface PaymentProvider {
  createIntent(input: CreateIntentInput): Promise<PaymentIntentDTO>;
  verifyIntent(intent: IntentRecord, scenario: string): Promise<VerifyResult>;
}

function buildUpiUri(amountPaise: number, ref: string, note: string): string {
  const params = new URLSearchParams({
    pa: MERCHANT_VPA,
    pn: MERCHANT_NAME,
    am: (amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: note,
    tr: ref,
    mc: "5732",
  });
  return `upi://pay?${params.toString()}`;
}

function appTargets(upiUri: string): UpiAppTarget[] {
  const query = upiUri.split("?")[1] ?? "";
  return [
    { id: "phonepe", name: "PhonePe", uri: `phonepe://pay?${query}` },
    { id: "gpay", name: "Google Pay", uri: `tez://upi/pay?${query}` },
    { id: "upi", name: "Any UPI App", uri: upiUri },
    // Cards are authorized through the PSP's hosted page in production; the
    // demo flow treats them like any other method (no scheme navigation).
    { id: "card", name: "Card", uri: "" },
  ];
}

export class MockUpiProvider implements PaymentProvider {
  async createIntent(input: CreateIntentInput): Promise<PaymentIntentDTO> {
    await sleep(450); // simulate PSP round-trip
    const existing = [...store.intents.values()].find((i) => i.sessionId === input.sessionId);
    if (existing) {
      const uri = buildUpiUri(existing.amountPaise, existing.upiRef, input.note);
      return { intentId: existing.id, amountPaise: existing.amountPaise, upiUri: uri, apps: appTargets(uri) };
    }
    const id = `pi_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
    const ref = `ZX${Date.now().toString(36).toUpperCase()}`;
    const record: IntentRecord = {
      id,
      sessionId: input.sessionId,
      amountPaise: input.amountPaise,
      upiRef: ref,
      status: "created",
      createdAt: Date.now(),
    };
    store.intents.set(id, record);
    const uri = buildUpiUri(input.amountPaise, ref, input.note);
    return { intentId: id, amountPaise: input.amountPaise, upiUri: uri, apps: appTargets(uri) };
  }

  async verifyIntent(intent: IntentRecord, scenario: string): Promise<VerifyResult> {
    // Simulate the PSP confirming the collect request server-to-server.
    await sleep(randBetween(1400, 2100));
    if (intent.status === "verified") return { ok: true };
    if (scenario === "payment_failed") {
      intent.status = "failed";
      return { ok: false, code: "payment_failed" };
    }
    intent.status = "verified";
    return { ok: true };
  }
}

export const paymentProvider: PaymentProvider = new MockUpiProvider();
