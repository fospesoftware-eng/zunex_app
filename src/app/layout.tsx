import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

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
    icon: "/brand/zunex-icon.svg",
    apple: "/brand/zunex-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(display-mode: fullscreen)", color: "#04050a" },
    { media: "(display-mode: standalone)", color: "#04050a" },
    { media: "all", color: "#04050a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
