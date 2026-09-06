"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/kit";
import { BrandWordmark } from "@/components/brand/Logo";
import AdPlayer from "@/components/visuals/AdPlayer";

// ---------------------------------------------------------------------------
// WiFiScreen — free station WiFi portal. Users arrive already connected to
// the station's network, so the flow goes straight to phone verification,
// then a short ad; internet access unlocks on their device automatically.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;
const AD_SECONDS = 30;
const WIFI_SSID = "ZUNEX-Free-WiFi";

type Step = "phone" | "otp" | "ad" | "done";

export default function WiFiScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

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
          onClick={onDone}
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
                className="flow-glyph flow-glyph-mint"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              >
                <Icon name="check" size={26} />
              </motion.div>
              <h1 className="flow-title font-display">WiFi connected</h1>
              <p className="flow-sub">
                {WIFI_SSID} joined automatically — no password, internet is now
                unlocked on your phone. Enjoy!
              </p>

              <button type="button" className="btn-glow w-full mt-7" onClick={onDone}>
                Done
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
