"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function SignOutPage() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    // Auto sign out after a brief delay to show the page
    const timer = setTimeout(() => {
      setIsSigningOut(true);
      signOut({ callbackUrl: "/" });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = () => {
    setIsSigningOut(true);
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <Image src="/icon.svg" alt="Audit Trail" width={32} height={32} />
            </div>
            <span className="text-lg font-semibold text-gray-900">
              Audit <span className="text-accent">Trail</span>
            </span>
          </Link>
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Signing out</h1>
          <p className="text-sm text-gray-500">You&apos;re being signed out of your account</p>
        </div>

        <div className="space-y-4">
          {isSigningOut ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign out now
              </button>

              <Link
                href="/dashboard"
                className="block w-full text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
