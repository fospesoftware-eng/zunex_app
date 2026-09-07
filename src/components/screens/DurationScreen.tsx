"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  ChargingPlan,
  PaymentIntentDTO,
  SessionSnapshot,
  Station,
  UpiAppTarget,
} from "@/lib/core/types";
import { formatINR, formatPlanMinutes } from "@/lib/core/format";
import { api } from "@/lib/client/api";
import { useDemoStore } from "@/lib/client/demoStore";
import { BrandHeader } from "@/components/brand/Logo";
import { GhostButton, Icon, Sheet } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// DurationScreen — one page for the whole transaction. Choose a duration,
// then tap a payment method on the single-line strip: PhonePe, GPay, UPI or
// Card. The strip replaces the old continue button — picking a method IS the
// continue action.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

const APP_LOGOS: Partial<Record<UpiAppTarget["id"], string>> = {
  phonepe: "/brand/logo-phonepe.svg",
  gpay: "/brand/logo-gpay.svg",
  upi: "/brand/logo-upi.svg",
  card: "/brand/logo-card.svg",
};

const LABELS: Record<UpiAppTarget["id"], string> = {
  phonepe: "PhonePe",
  gpay: "GPay",
  upi: "UPI",
  card: "Card",
};

const METHOD_IDS: UpiAppTarget["id"][] = ["phonepe", "gpay", "upi", "card"];

function AppGlyph({ id }: { id: UpiAppTarget["id"] }) {
  const logo = APP_LOGOS[id];
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        width={34}
        height={34}
        className="shrink-0"
        style={{ borderRadius: 34 * 0.23 }}
        aria-hidden="true"
      />
    );
  }
  if (id === "upi") {
    return (
      <span
        className="pay-glyph font-display"
        style={{
          background: "linear-gradient(140deg,#4a63ff,#2447ff)",
          color: "#fff",
          fontSize: "0.5625rem",
          letterSpacing: "0.04em",
          boxShadow: "0 6px 16px -6px rgba(36,71,255,0.8)",
        }}
        aria-hidden="true"
      >
        UPI
      </span>
    );
  }
  return (
    <span
      className="pay-glyph text-paper-dim"
      style={{
        background: "linear-gradient(150deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))",
        border: "1px solid rgba(255,255,255,0.14)",
      }}
      aria-hidden="true"
    >
      <Icon name="card" size={16} />
    </span>
  );
}

export default function DurationScreen({
  station,
  snapshot,
  submitting,
  onSelect,
  onSessionCancelled,
  onBack,
  applySnapshot,
}: {
  station: Station;
  /** Present while the session is awaiting payment — the page then runs the payment inline. */
  snapshot: SessionSnapshot | null;
  submitting: boolean;
  onSelect: (plan: ChargingPlan) => void;
  onSessionCancelled: () => void;
  onBack: () => void;
  /** Apply a snapshot returned from a mutation so the UI transitions instantly. */
  applySnapshot: (s: SessionSnapshot) => void;
}) {
  const demoEnabled = useDemoStore((s) => s.enabled);
  const [selected, setSelected] = useState<string | null>(null);
  const [method, setMethod] = useState<UpiAppTarget | null>(null);
  const [intent, setIntent] = useState<PaymentIntentDTO | null>(null);
  const [intentFailed, setIntentFailed] = useState(false);
  const [confirmState, setConfirmState] = useState<"idle" | "verifying" | "failed">("idle");
  const [waitingApp, setWaitingApp] = useState<UpiAppTarget | null>(null);
  const confirmRequested = useRef(false);

  const pending = snapshot?.state === "payment_pending";
  const sessionId = snapshot?.sessionId ?? null;
  const activePlan =
    snapshot?.plan ?? station.plans.find((p) => p.id === selected) ?? null;
  const amountPaise =
    intent?.amountPaise ?? snapshot?.amountPaise ?? activePlan?.pricePaise ?? 0;
  const verifying = confirmState === "verifying";

  // Create (or fetch) the payment intent once the session exists.
  useEffect(() => {
    if (!pending || !sessionId) return;
    let cancelled = false;
    api
      .createPaymentIntent(sessionId)
      .then(({ intent: i }) => {
        if (!cancelled) setIntent(i);
      })
      .catch(() => {
        if (!cancelled) setIntentFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pending, sessionId]);

  const confirm = useCallback(async () => {
    if (!sessionId || confirmRequested.current) return;
    confirmRequested.current = true;
    setConfirmState("verifying");
    try {
      const { snapshot: snap } = await api.confirmPayment(sessionId);
      // Apply the payment_successful snapshot immediately so the UI flips
      // to the activation screen without waiting for the next SSE push
      // (which can be delayed/buffered on production proxies).
      applySnapshot(snap);
      setWaitingApp(null);
      setMethod(null);
      setConfirmState("idle");
    } catch {
      setConfirmState("failed");
      setWaitingApp(null);
    } finally {
      confirmRequested.current = false;
    }
  }, [sessionId, applySnapshot]);

  // Demo mode: auto-confirm a moment after "opening" the payment app.
  useEffect(() => {
    if (!waitingApp || !demoEnabled) return;
    const t = setTimeout(() => void confirm(), 3000);
    return () => clearTimeout(t);
  }, [waitingApp, demoEnabled, confirm]);

  const startPayment = useCallback(
    (app: UpiAppTarget) => {
      setMethod(null); // the pending choice is consumed
      setWaitingApp(app);
      if (confirmState === "failed") setConfirmState("idle");
      if (app.uri && !demoEnabled) {
        // Use a hidden iframe to trigger the UPI scheme without navigating
        // the whole page away. On phones with a UPI app installed this opens
        // the app; if no app is installed the page stays intact (no blank
        // "Go Back" error screen).
        const iframe = document.createElement("iframe");
        iframe.style.cssText = "display:none;border:0;width:0;height:0;";
        iframe.src = app.uri;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 1500);
      }
    },
    [confirmState, demoEnabled],
  );

  // A method chosen before the session existed starts as soon as it lands —
  // but only once the payment intent is loaded, since that's where the real
  // UPI URIs live. On a slow network the intent can lag behind the snapshot;
  // firing startPayment before it arrives leaves us with empty URIs and a
  // waiting sheet that never navigates.
  useEffect(() => {
    if (!pending || !method || waitingApp || !intent) return;
    const target = intent?.apps.find((a) => a.id === method.id) ?? method;
    startPayment(target);
  }, [pending, method, waitingApp, intent, startPayment]);

  const chooseMethod = (app: UpiAppTarget) => {
    if (!activePlan || submitting || verifying) return;
    if (!sessionId) {
      // No session yet — remember the choice; payment starts once the
      // session is created and the snapshot arrives.
      setMethod(app);
      onSelect(activePlan);
      return;
    }
    if (!intent) {
      // Session exists but intent hasn't loaded yet — queue the choice and
      // let the effect fire startPayment once intent arrives with real URIs.
      setMethod(app);
      return;
    }
    const target = intent?.apps.find((a) => a.id === app.id) ?? app;
    startPayment(target);
  };

  const cancelSession = async () => {
    if (sessionId) {
      try {
        await api.cancelSession(sessionId);
      } catch {
        /* ignore */
      }
    }
    onSessionCancelled();
  };

  const retryIntent = () => {
    setIntentFailed(false);
    if (!sessionId) return;
    api
      .createPaymentIntent(sessionId)
      .then(({ intent: i }) => setIntent(i))
      .catch(() => setIntentFailed(true));
  };

  const apps: UpiAppTarget[] =
    intent?.apps ?? METHOD_IDS.map((id) => ({ id, name: LABELS[id], uri: "" }));

  return (
    <div className="app-viewport safe-x safe-top safe-bottom">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <BrandHeader
          left={
            <button
              type="button"
              onClick={() => void (sessionId ? cancelSession() : onBack())}
              aria-label="Back"
              className="glass-chip w-10 h-10 justify-center"
            >
              <Icon name="chevron-left" size={18} />
            </button>
          }
        />
      </motion.header>

      <main className="flex-1 flex flex-col justify-center gap-2 max-w-sm w-full mx-auto">
        <motion.h1
          className="font-display text-[1.65rem] font-semibold leading-snug mt-4 mb-4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          How long
          <br />
          do you need power?
        </motion.h1>

        <div className="flex flex-col gap-3">
          {station.plans.map((plan, i) => {
            const isSelected = activePlan?.id === plan.id;
            return (
              <motion.button
                key={plan.id}
                type="button"
                onClick={() => {
                  if (!pending) setSelected(plan.id);
                }}
                disabled={pending || submitting}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 + i * 0.09, ease }}
                whileTap={pending ? undefined : { scale: 0.975 }}
                aria-pressed={isSelected}
                className={`relative w-full text-left rounded-[1.25rem] px-5 py-4 transition-all duration-300 ${
                  isSelected ? "glass" : "glass-soft"
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: "rgba(125,151,255,0.55)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(74,99,255,0.35), 0 18px 50px -18px rgba(36,71,255,0.55)",
                        background:
                          "linear-gradient(165deg, rgba(36,71,255,0.16), rgba(255,255,255,0.03) 55%, rgba(255,176,32,0.05))",
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-baseline gap-1.5">
                      {(() => {
                        const dur = formatPlanMinutes(plan.minutes);
                        return (
                          <>
                            <span className="numeral text-[2.1rem] font-semibold leading-none">
                              {dur.value}
                            </span>
                            <span className="eyebrow !text-[0.5625rem] !tracking-[0.22em]">{dur.unit}</span>
                          </>
                        );
                      })()}
                    </div>
                  <div className="text-right flex-1">
                    <p className="numeral text-xl font-medium">{formatINR(plan.pricePaise)}</p>
                    <p className="text-paper-dim text-xs mt-0.5">{plan.tagline}</p>
                  </div>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: 0.25 }}
                        className="font-display text-[0.5625rem] tracking-[0.22em] uppercase text-signal-300"
                      >
                        Selected
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Pay in one tap — the method strip replaces the continue button */}
        <motion.section
          className="mt-5"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease }}
        >
          <p className="eyebrow mb-2.5">
            {activePlan ? `Pay ${formatINR(amountPaise)} with` : "Select a duration to pay"}
          </p>
          <div className="pay-strip" role="group" aria-label="Payment methods">
            {apps.map((app, i) => (
              <motion.button
                key={app.id}
                type="button"
                onClick={() => chooseMethod(app)}
                disabled={!activePlan || submitting || verifying || intentFailed}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 + i * 0.06 }}
                whileTap={!activePlan || verifying ? undefined : { scale: 0.96 }}
                className={`pay-cell ${i > 0 ? "pay-cell-divided" : ""}`}
                aria-label={`Pay with ${LABELS[app.id]}`}
              >
                <AppGlyph id={app.id} />
                <span className="pay-cell-label font-display">{LABELS[app.id]}</span>
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {confirmState === "failed" && (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 rounded-[1.25rem] p-4 flex items-start gap-3"
                style={{
                  background: "linear-gradient(160deg, rgba(255,106,77,0.12), rgba(255,255,255,0.03))",
                  border: "1px solid rgba(255,138,112,0.3)",
                }}
                role="alert"
              >
                <Icon name="info" size={18} className="text-ember-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-display text-sm font-medium">Payment did not go through</p>
                  <p className="text-paper-dim text-xs mt-1 leading-relaxed">
                    Nothing was charged. Tap a method above to retry safely.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </main>

      <motion.footer
        className="pt-5 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.55 }}
      >
        <p className="flex items-center gap-1.5 text-[0.6875rem] text-paper-dim/70 font-display tracking-[0.14em] uppercase">
          <Icon name="lock" size={13} />
          Encrypted · Verified by ZUNEX Pay
        </p>
      </motion.footer>

      {/* Waiting for the payment app to confirm */}
      <Sheet open={!!waitingApp} labelledBy="upi-wait-title">
        {waitingApp && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <AppGlyph id={waitingApp.id} />
            <div>
              <p id="upi-wait-title" className="font-display font-semibold">
                Complete payment in {waitingApp.name}
              </p>
              <p className="text-paper-dim text-xs mt-1.5 leading-relaxed">
                Approve {formatINR(amountPaise)} in the app.
                <br />
                We will confirm automatically — never from this screen alone.
              </p>
            </div>
            <div className="flex items-center gap-2 text-signal-300">
              <span className="pulse-dot" style={{ ["--pulse-color" as string]: "#7d97ff" }} />
              <span className="text-xs font-display tracking-[0.14em] uppercase">
                Awaiting confirmation
              </span>
            </div>
            {demoEnabled && (
              <div className="w-full mt-2 pt-4 border-t border-white/10 space-y-2">
                <p className="eyebrow !text-[0.5625rem]">Demo controls</p>
                <div className="flex gap-2">
                  <GhostButton
                    onClick={() => {
                      setWaitingApp(null);
                      void confirm();
                    }}
                    className="!py-2.5 !text-xs"
                  >
                    Simulate success
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      setWaitingApp(null);
                      setConfirmState("failed");
                    }}
                    className="!py-2.5 !text-xs"
                  >
                    Simulate failure
                  </GhostButton>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setWaitingApp(null)}
              className="text-paper-dim/70 text-xs mt-1"
            >
              Close
            </button>
          </div>
        )}
      </Sheet>

      {/* Intent failure */}
      <Sheet open={intentFailed}>
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <Icon name="info" size={26} className="text-ember-400" />
          <p className="font-display font-semibold">Could not reach ZUNEX Pay</p>
          <p className="text-paper-dim text-xs leading-relaxed">
            Check your connection and try again. Nothing has been charged.
          </p>
          <div className="w-full pt-2">
            <GhostButton onClick={retryIntent} className="!py-3 !text-sm">
              Try again
            </GhostButton>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
