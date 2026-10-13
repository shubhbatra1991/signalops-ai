import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { guidePreferenceBootstrap } from "@/features/demo-guide/domain/guide";
import { themeBootstrap } from "@/features/theme/theme-store";
import { readCspNonce } from "@/server/security/security-headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SignalOps-AI · Evidence-led product intelligence",
    template: "%s · SignalOps-AI",
  },
  description: "A source-available, self-hostable product intelligence application for turning customer signals into evidence-led product work.",
  applicationName: "SignalOps-AI",
  keywords: ["product analytics", "customer feedback", "BYOK AI", "self-hosted product intelligence"],
  icons: {
    icon: [
      { url: "/brand/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/brand/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/brand/favicon.ico",
    apple: [{ url: "/brand/android-chrome-192x192.png", type: "image/png", sizes: "192x192" }],
  },
  openGraph: {
    title: "SignalOps-AI · From customer signals to product impact",
    description: "Explore deterministic product analytics, evidence-grounded AI research, missions and impact measurement in a self-hostable demonstration.",
    type: "website",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = readCspNonce((await headers()).get("x-nonce"));
  return (
    <html
      lang="en"
      data-theme="light"
      data-theme-mode="light"
      data-demo-guide="available"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script id="theme-init" nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <script id="guide-init" nonce={nonce} dangerouslySetInnerHTML={{ __html: guidePreferenceBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
