"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, Sheet, GhostButton } from "@/components/ui/kit";
import { BrandWordmark } from "@/components/brand/Logo";
import AdPlayer from "@/components/visuals/AdPlayer";
import { useDemoStore } from "@/lib/client/demoStore";

// ---------------------------------------------------------------------------
// FreeChargeScreen — watch an ad, charge free. The phone must already be
// connected to the station's cable (Battery API); no cable, no charge.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

const OFFERS: {
  planId: string;
  adSeconds: number;
  minutes: number;
  blurb: string;
}[] = [
  { planId: "free5", adSeconds: 30, minutes: 5, blurb: "Quick splash of energy" },
  { planId: "free10", adSeconds: 60, minutes: 10, blurb: "A proper breather" },
];

/** Cable detection: demo override first, then the Battery Status API. */
async function isCableConnected(): Promise<boolean> {
  const demo = useDemoStore.getState();
  if (demo.enabled) return demo.cableConnected;
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{ charging: boolean }>;
  };
  if (!nav.getBattery) return true; // undetectable — give the benefit of the doubt
  try {
    const battery = await nav.getBattery();
    return battery.charging;
  } catch {
    return true;
  }
}

export default function FreeChargeScreen({
  submitting,
  onSelect,
  onBack,
}: {
  submitting: boolean;
  onSelect: (planId: string) => void;
  onBack: () => void;
}) {
  const [watching, setWatching] = useState<(typeof OFFERS)[number] | null>(null);
  const [cableAlert, setCableAlert] = useState(false);

  const choose = async (offer: (typeof OFFERS)[number]) => {
    const connected = await isCableConnected();
    if (!connected) {
      setCableAlert(true);
      return;
    }
    setWatching(offer);
  };

  return (
    <div className="app-viewport safe-x safe-top safe-bottom">
      <motion.header
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <button type="button" className="back-btn" aria-label="Back" onClick={onBack}>
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
          {!watching ? (
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
                      name="bolt"
                      size={46}
                      strokeWidth={1.4}
                      className="relative text-[#aebdff] drop-shadow-[0_0_18px_rgba(125,151,255,0.55)]"
                    />
                  </span>
                </div>
                <h1 className="flow-title font-display">Watch. Charge. Free.</h1>
                <p className="flow-sub">
                  Sit through a short sponsored video and the station powers your
                  phone — on the house.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {OFFERS.map((offer, i) => (
                  <motion.button
                    key={offer.planId}
                    type="button"
                    className="offer-card"
                    onClick={() => void choose(offer)}
                    disabled={submitting}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.12 + i * 0.09, ease }}
                    whileTap={submitting ? undefined : { scale: 0.975 }}
                  >
                    <span className="offer-ad font-display">
                      <Icon name="timer" size={14} />
                      {offer.adSeconds}s ad
                    </span>
                    <span className="offer-mins font-display">
                      {offer.minutes}
                      <em> min</em>
                    </span>
                    <span className="offer-blurb">{offer.blurb}</span>
                    <span className="offer-cta font-display">
                      {submitting ? "Starting…" : "Watch ad"}
                      <Icon name="chevron-left" size={13} className="rotate-180" />
                    </span>
                  </motion.button>
                ))}
              </div>

              <p className="cable-note">
                <Icon name="info" size={13} />
                Your phone must be connected to the Zunex cable before charging can begin.
              </p>
            </motion.section>
          ) : (
            <motion.section
              key="ad"
              className="flex-1 flex flex-col justify-center"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease }}
            >
              <AdPlayer
                seconds={watching.adSeconds}
                perk={`${watching.adSeconds}s ad · ${watching.minutes} min free`}
                onComplete={() => onSelect(watching.planId)}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <Sheet open={cableAlert} onClose={() => setCableAlert(false)} labelledBy="cable-alert-title">
        <div className="text-center py-2">
          <div className="flow-glyph flow-glyph-ember mx-auto">
            <Icon name="power" size={24} />
          </div>
          <p id="cable-alert-title" className="font-display font-semibold text-lg mt-3">
            Cable not connected
          </p>
          <p className="text-paper-dim text-sm leading-relaxed mt-2">
            You can&apos;t charge yet. Plug your phone into the Zunex station&apos;s
            charging cable first, then watch the ad to start.
          </p>
          <GhostButton className="w-full mt-5" onClick={() => setCableAlert(false)}>
            Got it
          </GhostButton>
        </div>
      </Sheet>
    </div>
  );
}
