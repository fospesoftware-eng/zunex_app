import type { ChargingPlan, PaymentIntentDTO } from "@/lib/core/types";
import { paymentProvider } from "@/lib/server/payments";
import { WIFI_PLANS, store, type IntentRecord } from "@/lib/server/store";

// ---------------------------------------------------------------------------
// WiFi data add-on service. Reuses the same UPI payment provider as charging
// but does NOT create a charging session — payment success directly unlocks
// the data allowance on the station's captive portal.
// ---------------------------------------------------------------------------

function planOf(id: string): ChargingPlan | null {
  return WIFI_PLANS.find((p) => p.id === id) ?? null;
}

function newWifiId(): string {
  return `wifi_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export const wifiService = {
  /** Create a payment intent for a WiFi data plan. */
  async createPaymentIntent(planId: string, scenario: string) {
    const plan = planOf(planId);
    if (!plan) return { ok: false as const, code: "invalid_request" };

    const wifiId = newWifiId();
    const intent = await paymentProvider.createIntent({
      sessionId: wifiId,
      amountPaise: plan.pricePaise,
      note: `ZUNEX WiFi ${plan.label}`,
    });
    return { ok: true as const, intent, plan, wifiId };
  },

  /** Verify the WiFi payment and unlock data if successful. */
  async confirmPayment(intentId: string, scenario: string) {
    const intent = store.intents.get(intentId);
    if (!intent) return { ok: false as const, code: "intent_not_found" };

    const result = await paymentProvider.verifyIntent(intent, scenario);
    if (!result.ok) return { ok: false as const, code: result.code };

    // In production this would provision the data allowance on the station's
    // RADIUS/captive portal. For the demo we just report success.
    return { ok: true as const };
  },

  plans(): ChargingPlan[] {
    return WIFI_PLANS;
  },
};

export type { IntentRecord };
