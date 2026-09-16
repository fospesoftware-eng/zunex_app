"use client";

import { useAdminAuth } from "@/lib/client/backendAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Zap } from "lucide-react";

/**
 * Root `/admin` URL — if already logged in it bounces to dashboard;
 * otherwise renders a glass token gate.
 */
export default function AdminRootPage() {
  const { authenticated, isLoading, setToken } = useAdminAuth();
  const router = useRouter();
  const [token, setTokenLocal] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasEnvToken = !!process.env.NEXT_PUBLIC_ZUNEX_ADMIN_TOKEN || !!process.env.ZUNEX_ADMIN_TOKEN;

  // If no token configured at all (open mode — works in dev AND prod), skip
  // the gate entirely and go straight to dashboard. Done in an effect to
  // avoid the "update Router during render" React error.
  useEffect(() => {
    if (hasEnvToken) return; // token IS configured → gate applies
    // No token set anywhere → open mode, bounce straight to dashboard
    router.replace("/backend/dashboard");
  }, [hasEnvToken, router]);

  // Also redirect when already authenticated.
  useEffect(() => {
    if (!isLoading && authenticated) {
      router.replace("/backend/dashboard");
    }
  }, [authenticated, isLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected =
      process.env.NEXT_PUBLIC_ZUNEX_ADMIN_TOKEN ?? process.env.ZUNEX_ADMIN_TOKEN ?? "";
    if (expected && token !== expected) {
      setError("That token doesn't match our records.");
      return;
    }
    setToken(token);
    router.replace("/backend/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1024] flex items-center justify-center">
        <div className="text-paper-dim text-sm">Loading…</div>
      </div>
    );
  }

  // If no token configured at all + already handled by effect above, show loading.
  if (!hasEnvToken) {
    return (
      <div className="min-h-screen bg-[#0b1024] flex items-center justify-center">
        <div className="text-paper-dim text-sm">Redirecting…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1024] relative flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#2447ff]/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#4a63ff]/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 p-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]"
        style={{
          background:
            "linear-gradient(165deg, rgba(20,26,60,0.92) 0%, rgba(6,8,20,0.97) 100%)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4a63ff] to-[#2447ff] flex items-center justify-center shadow-[0_12px_30px_-8px_rgba(36,71,255,0.7)]">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-paper">ZUNEX Admin</h1>
            <p className="text-xs text-paper-dim">Restricted area</p>
          </div>
        </div>

        <p className="text-sm text-paper-dim mb-6 leading-relaxed">
          Enter your admin token to access the control panel. You can find it in your{" "}
          <code className="text-[#a9bcff] bg-white/5 px-1.5 py-0.5 rounded">ZUNEX_ADMIN_TOKEN</code>{" "}
          environment variable.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Admin token</span>
            <input
              type="password"
              autoFocus
              value={token}
              onChange={(e) => {
                setTokenLocal(e.target.value);
                setError(null);
              }}
              className="h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-paper placeholder:text-paper-dim/40 focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25 transition"
              placeholder="••••••••"
              required
            />
          </label>

          {error && (
            <div className="text-xs text-ember-400 bg-ember-500/10 border border-ember-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-11 rounded-xl font-medium text-white flex items-center justify-center gap-2 bg-gradient-to-br from-[#4a63ff] to-[#2447ff] border border-white/20 shadow-[0_14px_40px_-10px_rgba(36,71,255,0.65)] hover:brightness-110 active:brightness-95 transition"
          >
            Enter admin
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-paper-dim">
          <Zap size={12} />
          <span>Token-gated · open mode when no env var set</span>
        </div>
      </motion.div>
    </div>
  );
}
