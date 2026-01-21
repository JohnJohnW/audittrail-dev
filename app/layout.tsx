import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AuditTrail.dev - GitHub to Compliance Evidence for Australian Businesses",
  description:
    "Turn GitHub activity into audit-ready compliance evidence for ISO 27001 and Essential Eight. Built for Australian businesses.",
  keywords: [
    "compliance",
    "audit",
    "ISO 27001",
    "Essential Eight",
    "GitHub",
    "security",
    "GRC",
    "Australia",
    "ACSC",
  ],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "AuditTrail.dev - GitHub to Compliance Evidence for Australian Businesses",
    description:
      "Turn GitHub activity into audit-ready compliance evidence for ISO 27001 and Essential Eight.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AuditTrail.dev",
    description:
      "Turn GitHub activity into audit-ready compliance evidence for ISO 27001 and Essential Eight.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden w-full`}>
        <ErrorBoundary>
          <SessionProvider>
            {children}
            <Analytics />
            <Toaster />
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
