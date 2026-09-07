"use client";

import { DEMO_SCENARIOS, useDemoStore } from "@/lib/client/demoStore";
import { api } from "@/lib/client/api";
import { GhostButton, Sheet } from "@/components/ui/kit";
import type { DemoScenario } from "@/lib/core/types";

// ---------------------------------------------------------------------------
// DemoPanel — scenario switcher for the full demo journey. Hidden unless
// demo mode is enabled (?demo=1).
// ---------------------------------------------------------------------------

function findActiveSessionId(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("zunex:session:")) {
        const v = localStorage.getItem(key);
        if (v) return v;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function DemoPanel() {
  const enabled = useDemoStore((s) => s.enabled);
  const open = useDemoStore((s) => s.panelOpen);
  const setPanelOpen = useDemoStore((s) => s.setPanelOpen);
  const setScenario = useDemoStore((s) => s.setScenario);
  const scenario = useDemoStore((s) => s.scenario);
  const cableConnected = useDemoStore((s) => s.cableConnected);
  const setCableConnected = useDemoStore((s) => s.setCableConnected);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        aria-label="Open demo controls"
        className="fixed z-30 right-4 font-display font-bold text-[1.05rem] leading-none select-none demo-d"
        style={{ top: "calc(var(--safe-top) + 12px)" }}
      >
        D
        {scenario !== "default" && (
          <span
            className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400"
            style={{ boxShadow: "0 0 8px 1px rgba(255,194,77,0.8)" }}
          />
        )}
      </button>

      <Sheet open={open} onClose={() => setPanelOpen(false)} labelledBy="demo-title">
        <div className="py-1">
          <p id="demo-title" className="font-display font-semibold text-center mb-1">
            Demo scenarios
          </p>
          <p className="text-paper-dim text-xs text-center leading-relaxed mb-4">
            Simulate real-world conditions from QR entry to charge completion.
            Choosing a scenario stops any live charging and restarts fresh.
          </p>
          <div className="flex flex-col gap-2">
            {DEMO_SCENARIOS.map((s) => {
              const active = scenario === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenario(s.id as DemoScenario)}
                  aria-pressed={active}
                  className={`w-full text-left rounded-2xl px-4 py-3 transition-all ${
                    active ? "glass" : "glass-soft"
                  }`}
                  style={
                    active
                      ? {
                          borderColor: "rgba(125,151,255,0.5)",
                          boxShadow: "0 0 0 1px rgba(74,99,255,0.4), 0 12px 34px -14px rgba(36,71,255,0.6)",
                        }
                      : undefined
                  }
                >
                  <span className="font-display text-sm font-medium">{s.label}</span>
                  <span className="block text-paper-dim text-xs mt-0.5">{s.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <p className="eyebrow !text-[0.5625rem]">Free-charge simulation</p>
            <button
              type="button"
              role="switch"
              aria-checked={cableConnected}
              onClick={() => setCableConnected(!cableConnected)}
              className="w-full text-left glass-soft rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <span>
                <span className="font-display text-sm font-medium">Cable connected</span>
                <span className="block text-paper-dim text-xs mt-0.5">
                  Off = &ldquo;cannot charge&rdquo; alert on free charge
                </span>
              </span>
              <span
                className={`demo-switch ${cableConnected ? "demo-switch-on" : ""}`}
                aria-hidden="true"
              >
                <span className="demo-switch-knob" />
              </span>
            </button>
          </div>

          {(() => {
            const sid = findActiveSessionId();
            if (!sid) return null;
            return (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <p className="eyebrow !text-[0.5625rem]">Payment simulation</p>
                <div className="grid grid-cols-2 gap-2">
                  <GhostButton
                    onClick={() => void api.demoPaySimulate(sid, "succeed").catch(() => {})}
                    className="!py-2.5 !text-xs"
                    ariaLabel="Simulate payment success"
                  >
                    Payment success
                  </GhostButton>
                  <GhostButton
                    onClick={() => void api.demoPaySimulate(sid, "fail").catch(() => {})}
                    className="!py-2.5 !text-xs"
                    ariaLabel="Simulate payment failure"
                  >
                    Payment failed
                  </GhostButton>
                </div>
                <p className="text-paper-dim text-[0.6875rem] leading-relaxed">
                  Works while the session is awaiting payment — success moves to
                  charging, failed shows the payment error screen.
                </p>
              </div>
            );
          })()}

          {(() => {
            const sid = findActiveSessionId();
            if (!sid) return null;
            return (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <p className="eyebrow !text-[0.5625rem]">Session controls</p>
                <GhostButton
                  onClick={() => void api.demoFinish(sid).catch(() => {})}
                  className="!py-2.5 !text-xs"
                >
                  Fast-forward to completion
                </GhostButton>
              </div>
            );
          })()}
        </div>
      </Sheet>
    </>
  );
}
