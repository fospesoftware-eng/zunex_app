"use client";

import { useEffect, useRef, useState } from "react";
import { useDemoStore } from "@/lib/client/demoStore";
import { Icon } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// AdPlayer — the sponsored slot. A real ad video plays as a full-screen
// overlay with autoplay; a gradient progress bar tracks the watch window.
// Free perks unlock only when it reaches zero. Demo mode exposes a skip so
// the journey stays testable.
// ---------------------------------------------------------------------------

export default function AdPlayer({
  seconds,
  perk,
  onComplete,
}: {
  seconds: number;
  /** What the watcher earns — shown under the countdown. */
  perk: string;
  /** Called when the ad finishes. `skipped` is true if the user tapped Skip. */
  onComplete: (skipped: boolean) => void;
}) {
  const demoEnabled = useDemoStore((s) => s.enabled);
  const [remaining, setRemaining] = useState(seconds);
  const doneRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !doneRef.current) {
      doneRef.current = true;
      onComplete(false); // full ad watched
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(true); // user skipped — no free perk
  };

  // Kick playback explicitly too — some browsers ignore the autoplay attribute.
  useEffect(() => {
    videoRef.current?.play().catch(() => {
      /* autoplay blocked — the timer still runs, so the flow never stalls */
    });
  }, []);

  const progress = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="ad-overlay" role="region" aria-label="Sponsored advertisement">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src="/ads/demo-ad.mp4"
        className="ad-video"
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="ad-scrim" aria-hidden="true" />

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
