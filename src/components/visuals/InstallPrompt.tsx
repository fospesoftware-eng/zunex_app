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
// (installed); dismissal is remembered for the current browsing session only,
// so every new visit gets the nudge again within 15s of charging.
// ---------------------------------------------------------------------------

const DISMISS_KEY = "zunex:install-dismissed";

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
    // Session-scoped: dismissed for this tab session only, so a new visit
    // (or reload) gets the banner again. Never blocks future sessions.
    return sessionStorage.getItem(DISMISS_KEY) === "1";
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
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (deferred) {
      // Android / Chrome native install prompt.
      await deferred.prompt();
      try {
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setVisible(false);
      } catch {
        /* user closed the native sheet */
      }
      deferredPrompt = null;
      setDeferred(null);
    } else if (ios) {
      // iOS Safari has no beforeinstallprompt — but navigator.share() opens
      // the native share sheet, which is where "Add to Home Screen" lives.
      try {
        if (navigator.share) {
          await navigator.share({
            title: "ZUNEX",
            text: "Install ZUNEX — premium charging at your station",
            url: window.location.href,
          });
          setVisible(false);
        } else {
          // Older iOS without Web Share API — just dismiss after the user
          // has seen the hint text.
          dismiss();
        }
      } catch {
        // User cancelled the share sheet — keep the banner visible, they
        // may change their mind.
      }
    } else {
      // No native event and not iOS — browser is unsupported.
      dismiss();
    }
  };

  const handleBannerTap = (e: React.MouseEvent) => {
    // Don't trigger install when clicking the close button or the Install
    // button itself — they have their own handlers.
    const target = e.target as HTMLElement;
    if (target.closest(".install-close") || target.closest(".install-btn")) return;
    // Only make the banner body clickable when there's no deferred prompt
    // (iOS path, or unsupported browsers). On Android with deferred, the
    // Install button is the right call — banner tap would be ambiguous.
    if (!deferred) void install();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="install-banner"
          onClick={handleBannerTap}
          initial={{ y: "-110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          role="dialog"
          aria-label="Install the ZUNEX app"
          style={!deferred ? { cursor: "pointer" } : undefined}
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

          {(deferred || ios) && (
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
