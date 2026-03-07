import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Audit Trail - GitHub to Compliance Evidence",
  description:
    "Automatically map GitHub activity to compliance controls for ISO 27001, NIST CSF, SOC 2, GDPR, Essential Eight and more. Audit-ready evidence in minutes.",
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
    "compliance evidence",
    "audit trail",
  ],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Audit Trail - GitHub to Compliance Evidence",
    description:
      "Automatically map GitHub activity to compliance controls for ISO 27001, NIST CSF, SOC 2, GDPR and more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Audit Trail",
    description:
      "Automatically map GitHub activity to compliance controls for ISO 27001, NIST CSF, SOC 2, GDPR and more.",
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
