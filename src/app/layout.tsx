import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZUNEX · Charge",
  description:
    "Scan. Tap. Charge. The premium charging experience by ZUNEX — pay securely with UPI and watch the energy flow.",
  manifest: "/manifest.webmanifest",
  applicationName: "ZUNEX",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZUNEX",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/brand/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/zunex-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(display-mode: fullscreen)", color: "#0b1024" },
    { media: "(display-mode: standalone)", color: "#0b1024" },
    { media: "all", color: "#0b1024" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="font-inter">
      <head>
        {/* Google Fonts — Inter + Space Grotesk (next/font/google breaks on
            Next.js 16 Turbopack with "can't resolve @vercel/turbopack-next/..."
            so we use the stable <link> approach instead). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* CSS custom properties so existing `--font-inter` / `--font-space`
            variables still resolve (globals.css already sets them, but re-
            declaring here is harmless). */}
      </head>
      <body>{children}</body>
    </html>
  );
}
