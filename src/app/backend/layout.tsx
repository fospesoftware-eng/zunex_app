"use client";

import { useAdminAuth } from "@/lib/client/backendAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/backend/AdminShell";

/**
 * Root admin layout. Verifies the admin token client-side; if missing it
 * redirects to /admin (the login gate). When auth is present, renders the
 * shell wrapping all child pages.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, isLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace("/backend");
    }
  }, [authenticated, isLoading, router]);

  if (isLoading || !authenticated) {
    return (
      <div className="min-h-screen bg-[#0b1024] flex items-center justify-center">
        <div className="text-paper-dim text-sm">Loading…</div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
