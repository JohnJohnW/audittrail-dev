"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getLoadingPhrase } from "@/lib/utils/loading-phrases";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; message: string }> = {
    Configuration: {
      title: "Configuration Error",
      message:
        "There's a problem with the server configuration. Please try again or contact support.",
    },
    AccessDenied: {
      title: "Access Denied",
      message: "You don't have permission to access this resource.",
    },
    Verification: {
      title: "Link Expired",
      message:
        "This verification link has expired or has already been used. Please request a new one.",
    },
    OAuthSignin: {
      title: "Sign In Error",
      message: "Could not start the sign-in process. Please try again.",
    },
    OAuthCallback: {
      title: "Connection Error",
      message: "Could not complete the GitHub connection. Please try again.",
    },
    Default: {
      title: "Authentication Error",
      message: "Something went wrong during authentication. Please try again.",
    },
  };

  const { title, message } = errorMessages[error || ""] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">{message}</p>

        <Link
          href="/auth/signin"
          className="inline-block bg-gray-900 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Try again
        </Link>

        <div className="mt-6">
          <a
            href="/contact"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-sm text-gray-400">{getLoadingPhrase()}</div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
