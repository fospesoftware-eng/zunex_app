"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// InstallPrompt — a slim banner that slides in from the top inviting mobile
// users to install the app (Add to Home Screen). It is mounted ONLY on the
// charging screen and appears `delayMs` after the charge timer starts.
// Android/Chrome gets the native beforeinstallprompt flow; iOS Safari gets
// manual share-sheet steps. Never shows when already running standalone
// (installed); dismissal is remembered for a few days so it doesn't nag.
// ---------------------------------------------------------------------------

const DISMISS_KEY = "zunex:install-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// The beforeinstallprompt event can fire on load — before the charging
// screen (and this component) exists. Capture it at module scope so it's
// ready whenever the banner mounts.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia?.("(display-mode: fullscreen)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mq || fullscreen || iosStandalone);
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac but has touch — check maxTouchPoints.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    return Boolean(at) && Date.now() - at < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export default function InstallPrompt({ delayMs = 15000 }: { delayMs?: number }) {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios] = useState(isIos);

  useEffect(() => {
    // Already installed as an app — never nag.
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    // Pick up the install event if it already fired.
    setDeferred(deferredPrompt);

    // Show only after the charging session has been running for delayMs.
    const timer = setTimeout(() => {
      setDeferred(deferredPrompt);
      setVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      try {
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setVisible(false);
      } catch {
        /* user closed the native sheet */
      }
      deferredPrompt = null;
      setDeferred(null);
    } else if (!ios) {
      // No native event (unsupported browser) — keep the hint, dismiss on tap.
      dismiss();
    }
    // iOS: the banner itself contains the steps; its close button dismisses.
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="install-banner"
          initial={{ y: "-110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          role="dialog"
          aria-label="Install the ZUNEX app"
        >
          <div className="install-icon" aria-hidden="true">
            <Icon name="download" size={18} />
          </div>

          <div className="install-copy">
            <p className="install-title font-display">Install ZUNEX</p>
            {ios ? (
              <p className="install-hint">
                Tap <Icon name="share" size={12} className="inline align-text-bottom" /> Share
                then “Add to Home Screen”
              </p>
            ) : deferred ? (
              <p className="install-hint">Add to home screen for one-tap charging</p>
            ) : (
              <p className="install-hint">Use your browser menu → Add to Home screen</p>
            )}
          </div>

          {deferred && !ios && (
            <button type="button" className="install-btn font-display" onClick={install}>
              Install
            </button>
          )}

          <button
            type="button"
            className="install-close"
            aria-label="Dismiss"
            onClick={dismiss}
          >
            <Icon name="close" size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
