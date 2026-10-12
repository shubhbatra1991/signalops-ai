import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ApplicationShell } from "@/features/shell/ui/application-shell";
import { themeBootstrap } from "@/features/theme/theme-store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Overview · SignalOps-AI",
  description: "A workspace for evidence-led product decisions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-theme-mode="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head><script id="theme-init" dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body><ApplicationShell>{children}</ApplicationShell></body>
    </html>
  );
}
