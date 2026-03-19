import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/Toaster";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PostHogPageView } from "@/components/PostHogPageView";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vigil Sec - Compliance Infrastructure for Engineering Teams",
  description:
    "Vigil Sec connects to GitHub once and silently maps every commit, PR, branch protection, and deployment across 10 frameworks. Built for GRC teams, CISOs, and audit readiness.",
  keywords: [
    "compliance",
    "audit",
    "ISO 27001",
    "NIST CSF",
    "SOC 2",
    "GDPR",
    "Essential Eight",
    "PCI DSS",
    "SOCI Act",
    "GitHub",
    "security",
    "GRC",
    "CISO",
    "compliance infrastructure",
    "vigil sec",
    "audit trail",
    "risk management",
  ],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Vigil Sec - Compliance Infrastructure for Engineering Teams",
    description:
      "Compliance that works in the background. Surfaces when it counts. Ten frameworks, zero manual work.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vigil Sec - Compliance Infrastructure for Engineering Teams",
    description:
      "Compliance that works in the background. Surfaces when it counts. Ten frameworks, zero manual work.",
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
        <PostHogProvider>
          <ErrorBoundary>
            <SessionProvider>
              <Suspense fallback={null}>
                <PostHogPageView />
              </Suspense>
              {children}
              <Analytics />
              <Toaster />
            </SessionProvider>
          </ErrorBoundary>
        </PostHogProvider>
      </body>
    </html>
  );
}
