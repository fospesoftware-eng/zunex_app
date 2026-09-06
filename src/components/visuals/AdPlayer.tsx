"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useDemoStore } from "@/lib/client/demoStore";
import { Icon } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// AdPlayer — the sponsored "video" slot. A simulated premium ad creative with
// a hard countdown; free perks unlock only when it reaches zero. Demo mode
// exposes a skip so the journey stays testable.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

const TAGLINES = [
  "Power up your day",
  "Fast. Clean. Effortless.",
  "ZUNEX partners · Curated for you",
  "A little energy, on the house",
];

export default function AdPlayer({
  seconds,
  perk,
  onComplete,
}: {
  seconds: number;
  /** What the watcher earns — shown under the countdown. */
  perk: string;
  onComplete: () => void;
}) {
  const demoEnabled = useDemoStore((s) => s.enabled);
  const [remaining, setRemaining] = useState(seconds);
  const [tagline, setTagline] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !doneRef.current) {
      doneRef.current = true;
      onComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  useEffect(() => {
    const id = setInterval(() => setTagline((t) => (t + 1) % TAGLINES.length), 2600);
    return () => clearInterval(id);
  }, []);

  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  const progress = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="ad-shell" role="region" aria-label="Sponsored advertisement">
      <div className="ad-stage" aria-hidden="true">
        <div className="ad-aurora" />
        <div className="ad-beam" />
        <motion.div
          className="ad-orb"
          animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="ad-orb-core" />
          <div className="ad-orb-ring" />
        </motion.div>

        <div className="ad-copy">
          <motion.p
            key={tagline}
            className="ad-tagline font-display"
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            {TAGLINES[tagline]}
          </motion.p>
        </div>
      </div>

      <div className="ad-chrome">
        <div className="ad-meta">
          <span className="ad-badge font-display">AD</span>
          <span className="ad-perk">{perk}</span>
        </div>

        <div className="ad-timer font-display" aria-live="off">
          <Icon name="timer" size={13} className="opacity-70" />
          {remaining}s
        </div>

        {demoEnabled && remaining > 0 && (
          <button type="button" className="ad-skip font-display" onClick={skip}>
            Skip
          </button>
        )}
      </div>

      <div className="ad-progress" aria-hidden="true">
        <div className="ad-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
