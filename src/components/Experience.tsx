"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FriendlyError, Station } from "@/lib/core/types";
import { FRIENDLY_ERRORS, friendlyError } from "@/lib/core/types";
import { api, ApiError } from "@/lib/client/api";
import { useSessionSync } from "@/lib/client/useSessionSync";
import { useCountdown } from "@/lib/client/useServerCountdown";
import { useWakeLock } from "@/lib/client/useWakeLock";
import { playComplete } from "@/lib/client/sound";
import { BrandHeader } from "@/components/brand/Logo";
import EnergyOrb from "@/components/visuals/EnergyOrb";
import WelcomeScreen from "@/components/screens/WelcomeScreen";
import DurationScreen from "@/components/screens/DurationScreen";
import WiFiScreen from "@/components/screens/WiFiScreen";
import FreeChargeScreen from "@/components/screens/FreeChargeScreen";
import ActivationScreen from "@/components/screens/ActivationScreen";
import ChargingScreen from "@/components/screens/ChargingScreen";
import CompleteScreen from "@/components/screens/CompleteScreen";
import ErrorScreen, { type ErrorAction } from "@/components/screens/ErrorScreen";

// ---------------------------------------------------------------------------
// Experience — the orchestrator. Maps the server-authoritative session state
// onto screens and owns every mutation call. The UI is a pure reflection of
// backend truth.
// ---------------------------------------------------------------------------

type Screen =
  | "boot"
  | "welcome"
  | "select"
  | "wifi"
  | "free"
  | "activation"
  | "charging"
  | "complete"
  | "error"
  | "stationError";

const ease = [0.22, 1, 0.36, 1] as const;

function BootScreen({ label }: { label: string }) {
  return (
    <div className="app-viewport safe-x safe-top safe-bottom items-center justify-center gap-10">
      <header className="flex justify-center pt-1">
        <BrandHeader />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <EnergyOrb size="min(46vw, 190px)" intensity={0.8} />
        <p className="eyebrow">{label}</p>
      </div>
    </div>
  );
}

export default function Experience({ stationId }: { stationId?: string }) {
  const normalizedId = stationId?.trim().toUpperCase();

  const [station, setStation] = useState<Station | null>(null);
  const [bootErrorCode, setBootErrorCode] = useState<string | null>(
    normalizedId ? null : "station_not_found",
  );
  const [phase, setPhase] = useState<"boot" | "welcome" | "select" | "wifi" | "free">("boot");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const startRequestedRef = useRef(false);

  const { snapshot, connection, missing, refresh, clockOffsetRef } =
    useSessionSync(sessionId);
  const { remainingMs } = useCountdown(snapshot, clockOffsetRef);
  useWakeLock(snapshot?.state === "charging_active");

  // Safety net: when the local countdown hits zero, the server-side tick may
  // not have transitioned to charging_completed yet (SSE pushes every 1s,
  // hardware.stop takes ~800ms). Force a refresh so the completion state is
  // picked up immediately instead of lingering on 0:00.
  const lastRefreshRef = useRef(0);
  useEffect(() => {
    if (
      remainingMs <= 0 &&
      snapshot &&
      (snapshot.state === "charging_active" || snapshot.state === "stopping")
    ) {
      const now = Date.now();
      if (now - lastRefreshRef.current > 1500) {
        lastRefreshRef.current = now;
        void refresh();
      }
    }
  }, [remainingMs, snapshot, refresh]);

  // ---- Boot: resolve the station from the QR identifier --------------------
  useEffect(() => {
    if (!normalizedId) {
      setPhase("boot");
      return;
    }
    let cancelled = false;
    setPhase("boot");
    setBootErrorCode(null);
    api
      .getStation(normalizedId)
      .then(({ station: s }) => {
        if (cancelled) return;
        setStation(s);
        if (s.status === "available") setPhase("welcome");
        else
          setBootErrorCode(
            s.status === "maintenance"
              ? "station_maintenance"
              : s.status === "busy"
                ? "station_busy"
                : "station_offline",
          );
      })
      .catch((err) => {
        if (!cancelled) setBootErrorCode(err instanceof ApiError ? err.code : "network");
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedId]);

  // ---- Session persistence helpers -----------------------------------------
  const storageKey = normalizedId ? `zunex:session:${normalizedId}` : "zunex:session";

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    startRequestedRef.current = false;
    // A boot error recorded while our own session held the station "busy"
    // is stale once the session goes away — never surface it afterwards.
    setBootErrorCode(null);
    setSessionId(null);
  }, [storageKey]);

  const adoptSession = useCallback(
    (id: string) => {
      startRequestedRef.current = false;
      setSessionId(id);
      try {
        localStorage.setItem(storageKey, id);
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  // ---- Resume after refresh / browser restart ------------------------------
  useEffect(() => {
    if (!normalizedId || sessionId) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setSessionId(saved);
    } catch {
      /* ignore */
    }
  }, [normalizedId, sessionId, storageKey]);

  // ---- Auto-start charging once payment is verified ------------------------
  useEffect(() => {
    if (snapshot?.state !== "payment_successful" || !sessionId) return;
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;
    const timer = setTimeout(() => {
      api.startCharging(sessionId).catch(() => {
        // Hardware layer will report failure through the session state.
      });
    }, 1700); // let the unlock burst land first
    return () => clearTimeout(timer);
  }, [snapshot?.state, sessionId]);

  // ---- Derive the active screen from backend truth --------------------------
  const state = snapshot?.state;

  useEffect(() => {
    if (state === "cancelled") clearSession();
  }, [state, clearSession]);

  // ---- Play the completion chime exactly once when the session transitions ----
  // to charging_completed (not on every re-render while already completed).
  const prevStateRef = useRef(state);
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (state === "charging_completed" && prev !== "charging_completed") {
      playComplete();
    }
  }, [state]);

  useEffect(() => {
    if (missing) clearSession();
  }, [missing, clearSession]);

  // Discard a stale session that belongs to a different station.
  useEffect(() => {
    if (snapshot && normalizedId && snapshot.stationId !== normalizedId) clearSession();
  }, [snapshot, normalizedId, clearSession]);

  let screen: Screen;
  let bootLabel = "Locating station";

  if (!normalizedId) {
    screen = "stationError";
  } else if (bootErrorCode && !sessionId) {
    screen = "stationError";
  } else if (phase === "boot" && !sessionId) {
    screen = "boot";
  } else if (!sessionId) {
    screen = phase; // welcome | select | wifi | free
  } else if (!snapshot) {
    // We have a sessionId but the snapshot hasn't arrived yet (network
    // latency — production vs instant localhost). If we just created this
    // session from the select/payment flow, stay on the current phase so
    // DurationScreen doesn't unmount and lose its local state (selected
    // method). Only go to boot when truly restoring a persisted session
    // on initial load.
    if (phase === "boot") {
      screen = "boot";
      bootLabel = "Restoring your session";
    } else {
      screen = phase; // stay on welcome | select | wifi | free
    }
  } else if (snapshot.stationId !== normalizedId) {
    // Stale session from another station — discard (effect below clears it).
    screen = "boot";
  } else {
    switch (state) {
      case "payment_pending":
        // Payment lives on the duration screen now (merged flow).
        screen = "select";
        break;
      case "payment_successful":
      case "starting":
        screen = "activation";
        break;
      case "charging_active":
      case "stopping":
        screen = "charging";
        break;
      case "charging_completed":
        screen = "complete";
        break;
      case "error":
        screen = "error";
        break;
      case "cancelled":
        screen = "welcome";
        break;
      default:
        screen = "boot";
        bootLabel = "Syncing";
    }
  }

  // ---- Actions ---------------------------------------------------------------
  const choosePlan = useCallback(
    async (planId: string) => {
      if (!normalizedId || creating) return;
      setCreating(true);
      try {
        const { snapshot: snap } = await api.createSession({
          stationId: normalizedId,
          planId,
          idempotencyKey: crypto.randomUUID(),
        });
        adoptSession(snap.sessionId);
      } catch (err) {
        if (err instanceof ApiError && err.friendly) {
          setBootErrorCode(err.code);
          setSessionId(null);
        }
      } finally {
        setCreating(false);
      }
    },
    [normalizedId, creating, adoptSession],
  );

  const retryStart = useCallback(async () => {
    if (!sessionId) return;
    try {
      await api.startCharging(sessionId, true);
    } catch {
      /* session state will surface the failure */
    }
  }, [sessionId]);

  const releaseAndRefund = useCallback(async () => {
    if (!sessionId) return;
    try {
      await api.cancelSession(sessionId);
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  const backToWelcome = useCallback(() => {
    clearSession();
    setPhase("welcome");
    // Re-resolve the station — it may have been busy when we first booted
    // (e.g. our own session held it). The bubble renders the disabled state
    // gracefully if it is still unavailable.
    if (normalizedId) {
      api
        .getStation(normalizedId)
        .then(({ station: s }) => {
          setStation(s);
          if (s.status === "available") setPhase("welcome");
        })
        .catch(() => {
          /* keep the current station rather than erroring the welcome away */
        });
    }
    void refresh();
  }, [clearSession, refresh, normalizedId]);

  // ---- Error wiring -----------------------------------------------------------
  let stationError: FriendlyError | null = null;
  let sessionError: FriendlyError | null = null;

  if (screen === "stationError") {
    stationError = friendlyError(bootErrorCode) ?? FRIENDLY_ERRORS.station_not_found;
  }
  if (screen === "error" && snapshot) {
    sessionError =
      snapshot.error ?? FRIENDLY_ERRORS.charging_start_failed;
  }

  const errorActions: ErrorAction[] =
    screen === "error" && sessionError?.code === "charging_start_failed"
      ? [
          { label: "Retry starting", onClick: () => void retryStart(), primary: true },
          { label: "Release & refund", onClick: () => void releaseAndRefund() },
        ]
      : screen === "stationError" && normalizedId
        ? [
            {
              label: "Try again",
              onClick: () => window.location.reload(),
              primary: true,
            },
          ]
        : screen === "stationError"
          ? [{ label: "Open demo station", onClick: () => { window.location.href = "/?s=ZNX-A1&demo=1"; }, primary: true }]
          : [{ label: "Back to station", onClick: backToWelcome, primary: true }];

  // ---- Render ------------------------------------------------------------------
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={
          screen === "error" || screen === "stationError"
            ? `${screen}:${sessionError?.code ?? stationError?.code ?? ""}`
            : screen
        }
        initial={{ opacity: 0, y: 26, scale: 0.985, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -20, scale: 0.985, filter: "blur(8px)" }}
        transition={{ duration: 0.5, ease }}
      >
        {screen === "boot" && <BootScreen label={bootLabel} />}

        {screen === "welcome" && station && (
          <WelcomeScreen
            station={station}
            onStart={() => setPhase("select")}
            onWiFi={() => setPhase("wifi")}
            onFreeCharge={() => setPhase("free")}
          />
        )}

        {screen === "welcome" && !station && (
          <BootScreen label="Locating station" />
        )}

        {screen === "select" && station && (
          <DurationScreen
            station={station}
            snapshot={snapshot?.state === "payment_pending" ? snapshot : null}
            submitting={creating}
            onSelect={(plan) => void choosePlan(plan.id)}
            onSessionCancelled={backToWelcome}
            onBack={() => setPhase("welcome")}
          />
        )}

        {screen === "wifi" && station && (
          <WiFiScreen onDone={() => setPhase("welcome")} />
        )}

        {screen === "free" && station && (
          <FreeChargeScreen
            submitting={creating}
            onSelect={(planId) => void choosePlan(planId)}
            onSkip={() => setPhase("select")}
            onBack={() => setPhase("welcome")}
          />
        )}

        {screen === "activation" && snapshot && (
          <ActivationScreen
            state={snapshot.state === "starting" ? "starting" : "payment_successful"}
          />
        )}

        {screen === "charging" && snapshot && (
          <ChargingScreen snapshot={snapshot} remainingMs={remainingMs} connection={connection} />
        )}

        {screen === "complete" && snapshot && (
          <CompleteScreen
            snapshot={snapshot}
            stationName={station?.name}
            onDone={backToWelcome}
          />
        )}

        {screen === "error" && sessionError && (
          <ErrorScreen error={sessionError} actions={errorActions} />
        )}

        {screen === "stationError" && stationError && (
          <ErrorScreen error={stationError} actions={errorActions} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
