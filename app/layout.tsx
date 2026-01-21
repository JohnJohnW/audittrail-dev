import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AuditTrail.dev - GitHub Activity to Compliance Evidence",
  description:
    "Turn GitHub activity into audit-ready compliance evidence automatically. ISO 27001, Essential Eight, and more.",
  keywords: [
    "compliance",
    "audit",
    "ISO 27001",
    "Essential Eight",
    "GitHub",
    "security",
    "GRC",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
