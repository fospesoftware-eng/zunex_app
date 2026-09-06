"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionSnapshot } from "@/lib/core/types";
import { ApiError, api } from "@/lib/client/api";

// ---------------------------------------------------------------------------
// Server-authoritative session sync.
//  - SSE stream is the primary channel (1 Hz snapshots from the server)
//  - polling fallback when SSE drops
//  - immediate refresh on visibility/focus/online
//  - server clock offset so the countdown survives backgrounding/refresh
// ---------------------------------------------------------------------------

export type ConnectionQuality = "live" | "polling" | "offline" | "lost";

export interface SessionSync {
  snapshot: SessionSnapshot | null;
  connection: ConnectionQuality;
  missing: boolean;
  refresh: () => Promise<void>;
  clockOffsetRef: React.MutableRefObject<number>;
}

export function useSessionSync(sessionId: string | null): SessionSync {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [connection, setConnection] = useState<ConnectionQuality>("polling");
  const [missing, setMissing] = useState(false);
  const clockOffsetRef = useRef(0);

  const applySnapshot = useCallback((s: SessionSnapshot) => {
    clockOffsetRef.current = s.serverTime - Date.now();
    setSnapshot(s);
  }, []);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { snapshot: s } = await api.getSnapshot(sessionId);
      applySnapshot(s);
      setMissing(false);
      setConnection((c) => (c === "offline" ? "polling" : c));
    } catch (err) {
      if (err instanceof ApiError && err.code === "session_not_found") {
        setMissing(true);
      } else if (err instanceof ApiError && err.code === "network") {
        setConnection("offline");
      }
    }
  }, [sessionId, applySnapshot]);

  useEffect(() => {
    if (!sessionId) {
      setSnapshot(null);
      setMissing(false);
      return;
    }

    let stopped = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let sseRetryTimer: ReturnType<typeof setTimeout> | null = null;

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };
    const startPolling = () => {
      if (stopped || pollTimer) return;
      pollTimer = setInterval(() => void refresh(), 2500);
      setConnection("polling");
    };
    const connectSSE = () => {
      if (stopped) return;
      es = new EventSource(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
      es.onopen = () => {
        if (stopped) return;
        stopPolling();
        setConnection("live");
        void refresh();
      };
      es.onmessage = (event) => {
        if (stopped) return;
        try {
          applySnapshot(JSON.parse(event.data) as SessionSnapshot);
          setConnection("live");
        } catch {
          /* malformed frame — polling covers us */
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (stopped) return;
        startPolling();
        sseRetryTimer = setTimeout(connectSSE, 8000);
      };
    };

    void refresh();
    connectSSE();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOnline = () => void refresh();
    const onOffline = () => setConnection("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      stopped = true;
      es?.close();
      stopPolling();
      if (sseRetryTimer) clearTimeout(sseRetryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sessionId, refresh, applySnapshot]);

  return { snapshot, connection, missing, refresh, clockOffsetRef };
}
