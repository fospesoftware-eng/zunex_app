"use client";

import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Screen Wake Lock — keeps the display on during an active charging session.
// Re-acquires automatically when the tab becomes visible again; no-ops
// gracefully on unsupported browsers (e.g. Safari < 16.4).
// ---------------------------------------------------------------------------

type WakeLockSentinelLike = {
  released: boolean;
  addEventListener: (type: "release", listener: () => void) => void;
  release: () => Promise<void>;
};

type WakeLockApi = {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
};

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let released = false;

    const requestLock = async () => {
      if (released || sentinel || document.visibilityState !== "visible") return;
      try {
        const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
        if (!wakeLock) return;
        sentinel = await wakeLock.request("screen");
        sentinel.addEventListener("release", () => {
          sentinel = null;
        });
      } catch {
        /* unsupported or denied — fail silently, session keeps running */
      }
    };

    void requestLock();
    const onVisible = () => {
      if (document.visibilityState === "visible") void requestLock();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      const s = sentinel;
      sentinel = null;
      if (s && !s.released) {
        s.release().catch(() => {
          /* ignore */
        });
      }
    };
  }, [active]);
}
