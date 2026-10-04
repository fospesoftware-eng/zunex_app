"use client";

import { useAdminAuth } from "@/lib/client/backendAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/backend/AdminShell";

/**
 * Root admin layout. Wraps all /backend/* routes.
 * - `/backend` itself is the login page — renders without the shell.
 * - All other routes require an authenticated Supabase admin user.
 *   Unauthenticated users are bounced to `/backend`.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/backend";

  useEffect(() => {
    if (isLoading) return;
    // Not on login page and no user → redirect to login
    if (!isLoginPage && !user) {
      router.replace("/backend");
    }
    // On login page but already signed in → redirect to dashboard
    if (isLoginPage && user) {
      router.replace("/backend/dashboard");
    }
  }, [user, isLoading, isLoginPage, router]);

  // Login page renders bare (no shell)
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1024] flex items-center justify-center">
        <div className="text-paper-dim text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b1024] flex items-center justify-center">
        <div className="text-paper-dim text-sm">Redirecting…</div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
