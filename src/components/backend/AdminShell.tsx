"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ToastProvider } from "./Toast";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // The public app locks html/body to overflow:hidden. The admin needs
  // normal page scrolling — patch the body classes when mounting.
  useEffect(() => {
    const prevHtml = document.documentElement.style.cssText;
    const prevBody = document.body.style.cssText;
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    document.body.style.minHeight = "100vh";
    document.body.style.background = "#0b1024";
    document.body.style.maxWidth = "none";
    return () => {
      document.documentElement.style.cssText = prevHtml;
      document.body.style.cssText = prevBody;
    };
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0b1024] relative">
        {/* Ambient scene — subtle backdrop glow like the frontend */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#2447ff]/15 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#4a63ff]/10 blur-[120px]" />
        </div>

        <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="lg:pl-64 relative z-10">
          <TopBar onMenuClick={() => setMobileOpen(true)} />
          <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
