"use client";

import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import Backdrop from "@/components/visuals/Backdrop";
import DeviceGate from "@/components/screens/DeviceGate";
import Experience from "@/components/Experience";
import DemoPanel from "@/components/DemoPanel";
import InstallPrompt from "@/components/visuals/InstallPrompt";
import { useDemoStore } from "@/lib/client/demoStore";

// ---------------------------------------------------------------------------
// Error boundary — surfaces any client-side crash instead of a blank screen.
// ---------------------------------------------------------------------------

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-viewport safe-x safe-top safe-bottom flex flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-display text-paper">Something went wrong</h1>
          <p className="text-sm text-paper-dim">{this.state.message}</p>
          <button
            onClick={() => location.reload()}
            className="btn-glow px-6 py-3 text-sm"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// App shell — ambient scene + device gate + the experience + demo controls.
// ---------------------------------------------------------------------------

export default function App({
  stationId,
  demo,
  preview,
}: {
  stationId?: string;
  demo?: boolean;
  preview?: boolean;
}) {
  const hydrate = useDemoStore((s) => s.hydrate);

  useEffect(() => {
    hydrate({ demo });
    if (preview) {
      try {
        localStorage.setItem("zunex:preview", "1");
      } catch {
        /* ignore */
      }
    }

    // Register the PWA service worker in production — this makes the app
    // installable so it opens edge-to-edge (fullscreen) from the home screen.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* offline/PWA nicety — never block the app on it */
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ErrorBoundary>
      <Backdrop />
      <div className="relative z-10">
        <DeviceGate>
          <Experience stationId={stationId} />
        </DeviceGate>
      </div>
      <InstallPrompt />
      <DemoPanel />
    </ErrorBoundary>
  );
}
