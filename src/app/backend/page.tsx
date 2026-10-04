"use client";

import { useAdminAuth } from "@/lib/client/backendAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Zap, Eye, EyeOff, Mail, Lock } from "lucide-react";

/**
 * Admin login page. Uses Supabase Auth (email/password).
 * Once authenticated, bounces to /backend/dashboard.
 */
export default function AdminLoginPage() {
  const { user, isLoading, error, signIn } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace("/backend/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok && result.error) {
      setFormError(result.error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1024] flex items-center justify-center">
        <div className="text-paper-dim text-sm">Loading…</div>
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
          background: "linear-gradient(165deg, rgba(20,26,60,0.92) 0%, rgba(6,8,20,0.97) 100%)",
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
            <p className="text-xs text-paper-dim">Sign in to access the control panel</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Email</span>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim/50" />
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl bg-black/40 border border-white/10 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim/40 focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25 transition"
                placeholder="admin@zunexglobal.com"
                required
                disabled={submitting}
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Password</span>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim/50" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl bg-black/40 border border-white/10 pl-9 pr-10 text-sm text-paper placeholder:text-paper-dim/40 focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25 transition"
                placeholder="••••••••"
                required
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-paper-dim/50 hover:text-paper-dim transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {(formError || error) && (
            <div className="text-xs text-ember-400 bg-ember-500/10 border border-ember-500/20 rounded-lg px-3 py-2">
              {formError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-xl font-medium text-white flex items-center justify-center gap-2 bg-gradient-to-br from-[#4a63ff] to-[#2447ff] border border-white/20 shadow-[0_14px_40px_-10px_rgba(36,71,255,0.65)] hover:brightness-110 active:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="text-sm">Signing in…</span>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-paper-dim">
          <Zap size={12} />
          <span>Supabase Auth · Role-based access</span>
        </div>
      </motion.div>
    </div>
  );
}
