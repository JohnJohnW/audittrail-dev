"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { getLoadingPhrase } from "@/lib/utils/loading-phrases";
import { logger } from "@/lib/logger";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    href: string;
  };
}

export default function OnboardingPage() {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const allCompleted = steps.length > 0 && steps.every((s) => s.completed);

  // Auto-redirect to dashboard 3 seconds after all steps complete
  useEffect(() => {
    if (!allCompleted) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [allCompleted, router]);

  const fetchOnboardingStatus = async () => {
    try {
      const response = await fetch("/api/onboarding");
      const data = await response.json();
      setSteps(data.steps || []);
    } catch (error) {
      logger.error("Failed to fetch onboarding status", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (stepId: string) => {
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId }),
      });
      fetchOnboardingStatus();
      trackEvent("onboarding_complete", { step: stepId });
    } catch (error) {
      logger.error("Failed to update onboarding", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{getLoadingPhrase()}</div>
      </div>
    );
  }

  if (allCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h1>
            <p className="text-gray-600 mb-6">
              You&apos;re all set to start tracking compliance evidence. Head to your dashboard to
              get started.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-colors"
            >
              Go to Dashboard
            </Link>
            <p className="mt-4 text-sm text-gray-400">Redirecting in {countdown}s…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome to Audit <span className="text-accent">Trail</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Let&apos;s get you set up in just a few steps
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>
              {completedCount} of {steps.length} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`bg-white rounded-xl border-2 p-4 sm:p-6 ${
                step.completed
                  ? "border-green-200 bg-green-50"
                  : index === completedCount
                    ? "border-accent bg-accent-light"
                    : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${
                    step.completed
                      ? "bg-green-600 text-white"
                      : index === completedCount
                        ? "bg-accent text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step.completed ? (
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                    {step.description}
                  </p>
                  {step.action && !step.completed && (
                    <Link
                      href={step.action.href}
                      onClick={() => handleStepComplete(step.id)}
                      className="inline-flex items-center bg-accent text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-accent-hover transition-colors text-sm"
                    >
                      {step.action.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip to dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
