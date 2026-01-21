"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn("resend", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      setEmailSent(true);
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignIn = () => {
    signIn("github", { callbackUrl: "/dashboard" });
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-sm w-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Check your email
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              We sent a sign-in link to{" "}
              <span className="font-medium text-gray-900">{email}</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Click the link in your email to sign in. The link expires in 24 hours.
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              ← Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-8">
            <span className="text-lg font-semibold text-gray-900">
              AuditTrail<span className="text-accent">.dev</span>
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Sign in to your account
          </h1>
          <p className="text-sm text-gray-500">
            Access your compliance dashboard
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGitHubSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Continue with GitHub
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-gray-900 px-4 py-2.5 rounded-md text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send magic link"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            We&apos;ll email you a link to sign in. No password needed.
          </p>
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
