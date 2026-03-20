"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function SignInPage() {
  const handleGitHubSignIn = () => {
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <Image src="/icon.svg" alt="" width={32} height={32} />
            </div>
            <span className="text-lg font-semibold text-gray-900">Audit Trail</span>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign in to your account</h1>
          <p className="text-sm text-gray-500">Connect your GitHub to access compliance evidence</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGitHubSignIn}
            aria-label="Sign in with GitHub"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Continue with GitHub
          </button>

          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500">
              We request read-only access to your repositories to extract compliance evidence. We
              never modify your code.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-gray-600 hover:text-gray-900">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
            Privacy Policy
          </Link>
        </p>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
