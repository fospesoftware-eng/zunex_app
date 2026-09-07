"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GhostButton, Icon, Sheet } from "@/components/ui/kit";
import { BrandWordmark } from "@/components/brand/Logo";
import AdPlayer from "@/components/visuals/AdPlayer";
import { api } from "@/lib/client/api";
import { useDemoStore } from "@/lib/client/demoStore";
import { formatINR } from "@/lib/core/format";
import type { ChargingPlan, PaymentIntentDTO, UpiAppTarget } from "@/lib/core/types";

// ---------------------------------------------------------------------------
// WiFiScreen — station WiFi portal. Two paths:
//   1. Free WiFi  — phone → OTP → 30s ad → connected
//   2. Paid data  — pick 1GB (₹10) or 2GB (₹20) → UPI payment simulator
//                   → connected immediately on payment success
// Paid plans reuse the same UPI payment simulator as the charging flow.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;
const AD_SECONDS = 30;
const WIFI_SSID = "ZUNEX-Free-WiFi";

const WIFI_PAID_PLANS: ChargingPlan[] = [
  { id: "wifi1", minutes: 0, pricePaise: 1000, label: "1GB", tagline: "1 GB data" },
  { id: "wifi2", minutes: 0, pricePaise: 2000, label: "2GB", tagline: "2 GB data" },
];

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

type Step = "choose" | "phone" | "otp" | "ad" | "paid-method" | "paid-wait" | "done";

export default function WiFiScreen({ onDone }: { onDone: () => void }) {
  const demoEnabled = useDemoStore((s) => s.enabled);
  const [step, setStep] = useState<Step>("choose");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  // Paid-plan payment state
  const [selectedPlan, setSelectedPlan] = useState<ChargingPlan | null>(null);
  const [intent, setIntent] = useState<PaymentIntentDTO | null>(null);
  const [intentFailed, setIntentFailed] = useState(false);
  const [waitingApp, setWaitingApp] = useState<UpiAppTarget | null>(null);
  const [confirmState, setConfirmState] = useState<"idle" | "verifying" | "failed">("idle");
  const confirmRequested = useRef(false);

  const phoneValid = useMemo(() => /^[6-9]\d{9}$/.test(phone), [phone]);

  const startOtp = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtp("");
    setOtpError(false);
    setStep("otp");
    setTimeout(() => otpRef.current?.focus(), 350);
  };

  const verifyOtp = (value: string) => {
    if (value === generatedOtp) {
      setStep("ad");
    } else {
      setOtpError(true);
    }
  };

  // ---- Paid WiFi flow -------------------------------------------------------
  const startPaidPlan = useCallback((plan: ChargingPlan) => {
    setSelectedPlan(plan);
    setIntentFailed(false);
    setIntent(null);
    setStep("paid-method");
  }, []);

  // Create the payment intent once we're on the paid-method step.
  useEffect(() => {
    if (step !== "paid-method" || !selectedPlan) return;
    let cancelled = false;
    api
      .wifiCreateIntent(selectedPlan.id)
      .then(({ intent: i }) => {
        if (!cancelled) setIntent(i);
      })
      .catch(() => {
        if (!cancelled) setIntentFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [step, selectedPlan]);

  const confirm = useCallback(async () => {
    if (!intent || confirmRequested.current) return;
    confirmRequested.current = true;
    setConfirmState("verifying");
    try {
      await api.wifiConfirmPayment(intent.intentId);
      setWaitingApp(null);
      setConfirmState("idle");
      setStep("done");
    } catch {
      setConfirmState("failed");
      setWaitingApp(null);
    } finally {
      confirmRequested.current = false;
    }
  }, [intent]);

  // Demo mode: auto-confirm a moment after "opening" the payment app.
  useEffect(() => {
    if (!waitingApp || !demoEnabled) return;
    const t = setTimeout(() => void confirm(), 3000);
    return () => clearTimeout(t);
  }, [waitingApp, demoEnabled, confirm]);

  const startPayment = (app: UpiAppTarget) => {
    setWaitingApp(app);
    if (confirmState === "failed") setConfirmState("idle");
    if (app.uri) {
      try {
        window.location.href = app.uri;
      } catch {
        /* scheme navigation is best-effort */
      }
    }
  };

  const chooseMethod = (app: UpiAppTarget) => {
    if (!intent || confirmState === "verifying") return;
    const target = intent.apps.find((a) => a.id === app.id) ?? app;
    startPayment(target);
  };

  const retryIntent = () => {
    setIntentFailed(false);
    if (selectedPlan) {
      api
        .wifiCreateIntent(selectedPlan.id)
        .then(({ intent: i }) => setIntent(i))
        .catch(() => setIntentFailed(true));
    }
  };

  const apps: UpiAppTarget[] =
    intent?.apps ?? METHOD_IDS.map((id) => ({ id, name: LABELS[id], uri: "" }));

  const verifying = confirmState === "verifying";

  return (
    <div className="app-viewport safe-x safe-top safe-bottom">
      <motion.header
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <button
          type="button"
          className="back-btn"
          aria-label="Back"
          onClick={() => (step === "ad" ? undefined : setStep("choose"))}
          disabled={step === "ad"}
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <div className="relative flex items-center justify-center">
          <span
            className="absolute -inset-x-8 -inset-y-3 rounded-full bg-[rgba(157,180,255,0.16)] blur-xl pointer-events-none"
            aria-hidden="true"
          />
          <BrandWordmark className="h-4 relative" />
        </div>
        <span className="w-10" aria-hidden="true" />
      </motion.header>

      <main className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.section
              key="choose"
              initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <span className="relative flex items-center justify-center">
                    <span
                      className="absolute w-24 h-24 rounded-full bg-[rgba(125,151,255,0.2)] blur-2xl"
                      aria-hidden="true"
                    />
                    <Icon
                      name="wifi"
                      size={46}
                      strokeWidth={1.4}
                      className="relative text-[#aebdff] drop-shadow-[0_0_18px_rgba(125,151,255,0.55)]"
                    />
                  </span>
                </div>
                <h1 className="flow-title font-display">ZUNEX WiFi</h1>
                <p className="flow-sub">
                  Pick how you want to connect — free with a short ad, or grab a
                  data pack for faster browsing.
                </p>
              </div>

              {/* Free WiFi (ad-sponsored) */}
              <motion.button
                type="button"
                className="offer-card mb-3"
                onClick={() => setStep("phone")}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1, ease }}
                whileTap={{ scale: 0.975 }}
              >
                <span className="offer-ad font-display">
                  <Icon name="timer" size={14} />
                  {AD_SECONDS}s ad
                </span>
                <span className="offer-mins font-display">
                  Free
                  <em> WiFi</em>
                </span>
                <span className="offer-blurb">Unlimited data for this session</span>
                <span className="offer-cta font-display">
                  Watch ad
                  <Icon name="chevron-left" size={13} className="rotate-180" />
                </span>
              </motion.button>

              {/* Paid data plans — underneath the ad option */}
              <div className="flex flex-col gap-3 mt-1">
                {WIFI_PAID_PLANS.map((plan, i) => (
                  <motion.button
                    key={plan.id}
                    type="button"
                    className="offer-card"
                    onClick={() => startPaidPlan(plan)}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.2 + i * 0.09, ease }}
                    whileTap={{ scale: 0.975 }}
                  >
                    <span className="offer-ad font-display">
                      <Icon name="wifi" size={14} />
                      Data pack
                    </span>
                    <span className="offer-mins font-display">
                      {plan.label}
                      <em> data</em>
                    </span>
                    <span className="offer-blurb">{plan.tagline}</span>
                    <span className="offer-cta font-display">
                      {formatINR(plan.pricePaise)}
                      <Icon name="chevron-left" size={13} className="rotate-180" />
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}

          {step === "phone" && (
            <motion.section
              key="phone"
              initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.5, ease }}
              className="flow-card"
            >
              <div className="flow-glyph">
                <Icon name="phone" size={26} />
              </div>
              <h1 className="flow-title font-display">Enter your phone number</h1>
              <p className="flow-sub">
                We&apos;ll text you a one-time code to verify it&apos;s really you.
              </p>

              <div className="phone-field">
                <span className="phone-cc font-display">+91</span>
                <input
                  className="phone-input font-display"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(digits);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && phoneValid) startOtp();
                  }}
                  aria-label="Phone number"
                />
              </div>

              <button
                type="button"
                className="btn-glow w-full mt-6"
                disabled={!phoneValid}
                onClick={startOtp}
              >
                Send code
              </button>
            </motion.section>
          )}

          {step === "otp" && (
            <motion.section
              key="otp"
              initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.5, ease }}
              className="flow-card"
            >
              <div className="flow-glyph">
                <Icon name="shield" size={26} />
              </div>
              <h1 className="flow-title font-display">Enter the 6-digit code</h1>
              <p className="flow-sub">
                Sent to +91 {phone.slice(0, 5)} {phone.slice(5)}
              </p>

              <div className="otp-hint glass-chip" aria-label="SMS preview">
                <Icon name="info" size={12} />
                Demo SMS · your code is <b className="font-display">{generatedOtp}</b>
              </div>

              <motion.input
                ref={otpRef}
                className={`otp-input font-display ${otpError ? "otp-input-error" : ""}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="······"
                value={otp}
                animate={otpError ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
                transition={{ duration: 0.4 }}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpError(false);
                  setOtp(digits);
                  if (digits.length === 6) verifyOtp(digits);
                }}
                aria-label="One-time code"
              />
              {otpError && (
                <p className="otp-error">That code doesn&apos;t match — try again.</p>
              )}

              <button
                type="button"
                className="btn-ghost w-full mt-6"
                onClick={() => setStep("phone")}
              >
                Change number
              </button>
            </motion.section>
          )}

          {step === "ad" && (
            <motion.section
              key="ad"
              className="flex-1 flex flex-col justify-center"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease }}
            >
              <AdPlayer
                seconds={AD_SECONDS}
                perk="30 seconds · then free internet"
                onComplete={(skipped) =>
                  skipped ? setStep("phone") : setStep("done")
                }
              />
            </motion.section>
          )}

          {step === "paid-method" && selectedPlan && (
            <motion.section
              key="paid-method"
              initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="text-center mb-5">
                <div className="flex justify-center mb-3">
                  <span className="relative flex items-center justify-center">
                    <span
                      className="absolute w-20 h-20 rounded-full bg-[rgba(125,151,255,0.2)] blur-2xl"
                      aria-hidden="true"
                    />
                    <Icon
                      name="wifi"
                      size={38}
                      strokeWidth={1.4}
                      className="relative text-[#aebdff]"
                    />
                  </span>
                </div>
                <h1 className="font-display text-[1.5rem] font-semibold leading-tight">
                  {selectedPlan.label} data pack
                </h1>
                <p className="text-paper-dim text-sm mt-1">
                  Pay {formatINR(selectedPlan.pricePaise)} to unlock {selectedPlan.label} of
                  high-speed data
                </p>
              </div>

              {intentFailed ? (
                <div className="glass-soft rounded-[1.25rem] p-4 text-center space-y-3">
                  <Icon name="info" size={22} className="text-ember-400 mx-auto" />
                  <p className="font-display font-semibold">Could not reach ZUNEX Pay</p>
                  <p className="text-paper-dim text-xs">
                    Check your connection and try again. Nothing has been charged.
                  </p>
                  <GhostButton onClick={retryIntent} className="!py-3 !text-sm w-full">
                    Try again
                  </GhostButton>
                </div>
              ) : (
                <>
                  <p className="eyebrow mb-2.5">
                    {intent ? `Pay ${formatINR(intent.amountPaise)} with` : "Preparing payment…"}
                  </p>
                  <div className="pay-strip" role="group" aria-label="Payment methods">
                    {apps.map((app, i) => (
                      <motion.button
                        key={app.id}
                        type="button"
                        onClick={() => chooseMethod(app)}
                        disabled={!intent || verifying}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.06 }}
                        whileTap={verifying ? undefined : { scale: 0.96 }}
                        className={`pay-cell ${i > 0 ? "pay-cell-divided" : ""}`}
                        aria-label={`Pay with ${LABELS[app.id]}`}
                      >
                        <AppGlyph id={app.id} />
                        <span className="pay-cell-label font-display">{LABELS[app.id]}</span>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              <AnimatePresence>
                {confirmState === "failed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 rounded-[1.25rem] p-4 flex items-start gap-3"
                    style={{
                      background:
                        "linear-gradient(160deg, rgba(255,106,77,0.12), rgba(255,255,255,0.03))",
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
          )}

          {step === "done" && (
            <motion.section
              key="done"
              initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.5, ease }}
              className="flow-card"
            >
              <motion.div
                className="flow-glyph flow-glyph-mint mx-auto"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              >
                <Icon name="check" size={26} />
              </motion.div>
              <h1 className="flow-title font-display mt-3">WiFi connected</h1>
              <p className="flow-sub">
                {WIFI_SSID} joined automatically — internet is now unlocked on your
                phone. Enjoy!
              </p>

              <button type="button" className="btn-glow w-full mt-7" onClick={onDone}>
                Done
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Waiting for the payment app to confirm */}
      <Sheet open={!!waitingApp} labelledBy="wifi-pay-wait-title">
        {waitingApp && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <AppGlyph id={waitingApp.id} />
            <div>
              <p id="wifi-pay-wait-title" className="font-display font-semibold">
                Complete payment in {waitingApp.name}
              </p>
              <p className="text-paper-dim text-xs mt-1.5 leading-relaxed">
                Approve {selectedPlan ? formatINR(selectedPlan.pricePaise) : ""} in the app.
                <br />
                We will confirm automatically.
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
    </div>
  );
}
