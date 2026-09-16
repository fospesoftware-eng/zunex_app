"use client";

import { useAdminAuth } from "@/lib/client/backendAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/backend/AdminShell";

/**
 * Root admin layout. Verifies the admin token client-side; if a token IS
 * configured and we're not authenticated, bounces to `/backend` (the login
 * gate). If NO token is configured (open mode) or the user IS authenticated,
 * renders the shell wrapping all child pages.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, isLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !authenticated) {
      // Only redirect if a token was actually configured. If no env token
      // is set, useAdminAuth returns authenticated=true on its own, so this
      // branch should never fire in open mode. Guard anyway.
      router.replace("/backend");
    }
  }, [authenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1024] flex items-center justify-center">
        <div className="text-paper-dim text-sm">Loading…</div>
      </div>
    );
  }

  if (!authenticated) {
    // Not loading but not authenticated AND a token must be configured —
    // show loading while the redirect effect runs. Never hang forever here.
    return (
      <div className="min-h-screen bg-[#0b1024] flex items-center justify-center">
        <div className="text-paper-dim text-sm">Redirecting…</div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
