"use client";

import Link from "next/link";
import { FadeIn } from "@/components/ui/Motion";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 py-10 px-6 bg-gray-50">
      <FadeIn direction="up" className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-900 hover:text-accent transition-colors"
          >
            Audit <span className="text-accent">Trail</span>
          </Link>

          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">
              Product
            </a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">
              Pricing
            </a>
            <Link href="/status" className="hover:text-gray-900 transition-colors">
              Status
            </Link>
            <Link href="/changelog" className="hover:text-gray-900 transition-colors">
              Changelog
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Audit Trail</p>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              Privacy
            </Link>
            <a
              href="https://github.com/JohnJohnW/audittrail-dev/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </FadeIn>
    </footer>
  );
}
