"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionSnapshot } from "@/lib/core/types";

/**
 * Smooth local countdown anchored to the server-provided `endsAt` (backend
 * truth) plus the measured clock offset — accurate across backgrounding,
 * tab switches and full page refreshes. Callers pass their existing session
 * sync so only ONE realtime channel is ever open.
 */
export function useCountdown(
  snapshot: SessionSnapshot | null,
  clockOffsetRef: { readonly current: number },
): { remainingMs: number; totalMs: number } {
  const totalMs = snapshot?.plan ? snapshot.plan.minutes * 60_000 : 0;
  const endsAt = snapshot?.charging?.endsAt ?? null;

  const compute = useCallback((): number => {
    if (!endsAt) return 0;
    const now = Date.now() + clockOffsetRef.current;
    return Math.max(0, endsAt - now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setRemainingMs(0);
      return;
    }
    setRemainingMs(compute());
    const timer = setInterval(() => setRemainingMs(compute()), 250);
    return () => clearInterval(timer);
  }, [endsAt, compute]);

  return { remainingMs, totalMs };
}
