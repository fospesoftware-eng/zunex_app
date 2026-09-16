"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ToastProvider } from "./Toast";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

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

        {/* Main column — fixed header lives above; content sits below with 64px top padding */}
        <div className="lg:pl-64 relative z-10 pt-[64px]">
          <TopBar onMenuClick={() => setMobileOpen(true)} />

          {/* Main content with ambient glow blobs */}
          <main className="relative p-4 sm:p-6 lg:p-8 max-w-[1400px] min-h-[calc(100vh-64px)]">
            {/* Ambient glow blobs behind content */}
            <div
              className="absolute top-[20%] left-[15%] w-[400px] h-[400px] rounded-full opacity-30 pointer-events-none z-0"
              style={{
                filter: "blur(80px)",
                background: "radial-gradient(circle, rgba(36,71,255,0.35), transparent 65%)",
              }}
            />
            <div
              className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] rounded-full opacity-25 pointer-events-none z-0"
              style={{
                filter: "blur(80px)",
                background: "radial-gradient(circle, rgba(125,151,255,0.28), transparent 65%)",
              }}
            />

            {/* Page transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 page-enter"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
