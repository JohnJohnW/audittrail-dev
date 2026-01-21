"use client";

import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <nav
        className="max-w-5xl mx-auto px-6"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            className="text-lg font-semibold text-gray-900 tracking-tight"
            aria-label="AuditTrail home"
          >
            AuditTrail<span className="text-accent">.dev</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signin"
              className="bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors rounded-md"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <a
                href="#how-it-works"
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </a>
              <a
                href="#pricing"
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <Link
                href="/auth/signin"
                className="text-sm text-gray-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/auth/signin"
                className="bg-gray-900 text-white px-4 py-2 text-sm font-medium text-center rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
