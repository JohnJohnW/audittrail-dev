"use client";

import Link from "next/link";
import { FadeIn } from "@/components/ui/Motion";

export function CTA() {
  return (
    <section className="py-20 px-6 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-light/50 via-white to-gray-50 pointer-events-none" />

      <FadeIn direction="up" className="max-w-2xl mx-auto text-center relative">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Your compliance posture, running in the background.
        </h2>
        <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
          Connect your repositories and see your compliance score in under 10 minutes. Free to start
          No credit card required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/signin"
            className="bg-accent text-white px-6 py-2.5 text-sm font-medium hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20 transition-all duration-200 rounded-md"
          >
            Get started free
          </Link>
          <a
            href="https://github.com/JohnJohnW/audittrail-dev/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-accent transition-colors"
          >
            Questions? Open an issue
          </a>
        </div>
      </FadeIn>
    </section>
  );
}
