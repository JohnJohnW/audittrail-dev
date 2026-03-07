"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const [homeHref, setHomeHref] = useState("/");

  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  useEffect(() => {
    // Check if we're in a dashboard route
    const isDashboardRoute =
      pathname?.startsWith("/dashboard") ||
      pathname?.startsWith("/repositories") ||
      pathname?.startsWith("/evidence") ||
      pathname?.startsWith("/compliance") ||
      pathname?.startsWith("/exports") ||
      pathname?.startsWith("/trends") ||
      pathname?.startsWith("/settings") ||
      pathname?.startsWith("/onboarding");

    // Check for session cookie (only in browser)
    let hasSession = false;
    if (typeof document !== "undefined") {
      hasSession =
        document.cookie.includes("authjs.session-token") ||
        document.cookie.includes("__Secure-authjs.session-token");
    }

    // If in dashboard route or has session, go to dashboard, otherwise landing page
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHomeHref(isDashboardRoute || hasSession ? "/dashboard" : "/");
  }, [pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
          <Link
            href={homeHref}
            className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
