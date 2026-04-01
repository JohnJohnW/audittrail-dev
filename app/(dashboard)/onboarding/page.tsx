"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeInOnLoad } from "@/components/ui/Motion";
import { trackEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  pushedAt: string | null;
  isTracked: boolean;
  isActive: boolean;
}

interface Framework {
  id: string;
  name: string;
  description: string | null;
  version: string | null;
}

type Step = "welcome" | "connect" | "repos" | "frameworks" | "sync";

const STEPS: Step[] = ["welcome", "connect", "repos", "frameworks", "sync"];

const STEP_LABELS: Record<Step, string> = {
  welcome: "Welcome",
  connect: "Connect GitHub",
  repos: "Select Repos",
  frameworks: "Frameworks",
  sync: "First Sync",
};

const GITHUB_APP_SLUG = "audit-trail-app";
const GITHUB_APP_INSTALL_URL = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin w-5 h-5", className)}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: Step }) {
  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300",
                i < stepIndex
                  ? "bg-accent text-white"
                  : i === stepIndex
                    ? "bg-accent text-white ring-4 ring-accent/20"
                    : "bg-gray-100 text-gray-400"
              )}
            >
              {i < stepIndex ? <CheckIcon className="w-4 h-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-16 md:w-24 mx-1 transition-all duration-500",
                  i < stepIndex ? "bg-accent" : "bg-gray-200"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 px-0">
        {STEPS.map((step) => (
          <span
            key={step}
            className={cn(
              "hidden sm:block transition-colors",
              step === currentStep ? "text-accent font-medium" : ""
            )}
          >
            {STEP_LABELS[step]}
          </span>
        ))}
      </div>
      <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-accent h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span className="sm:hidden">{STEP_LABELS[currentStep]}</span>
        <span className="ml-auto">
          {stepIndex + 1} / {STEPS.length}
        </span>
      </div>
    </div>
  );
}

// ─── Step: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <FadeInOnLoad>
      <Card variant="elevated" padding="lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-8 h-8 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Welcome to Audit <span className="text-accent">Trail</span>
          </h2>
          <p className="text-gray-600 max-w-md mx-auto text-sm sm:text-base">
            Let&apos;s get you set up in about 2 minutes. You&apos;ll connect your GitHub repos and
            see your first compliance score before you know it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: "🔗",
              title: "Connect repos",
              desc: "Link your GitHub repositories in one click",
            },
            {
              icon: "📊",
              title: "Pick frameworks",
              desc: "Choose the compliance standards that matter to you",
            },
            {
              icon: "✅",
              title: "See your score",
              desc: "Get your first compliance score instantly",
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-semibold text-gray-900 text-sm mb-1">{item.title}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="accent" size="lg" onClick={onNext}>
            Get started →
          </Button>
        </div>
      </Card>
    </FadeInOnLoad>
  );
}

// ─── Step: Connect GitHub ────────────────────────────────────────────────────

function ConnectStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [githubAccount, setGithubAccount] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/github/repositories");
      const data = await res.json();
      setConnected(data.connected === true);
      setGithubAccount(data.githubAccount ?? null);
    } catch (err) {
      logger.error("Failed to check GitHub connection", err);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <FadeInOnLoad>
      <Card variant="elevated" padding="lg">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Connect GitHub</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Audit Trail needs read access to your repositories to collect compliance evidence from
            commits, pull requests, and branch settings.
          </p>
        </div>

        {checking ? (
          <div className="flex items-center gap-3 p-6 bg-gray-50 rounded-xl mb-6">
            <SpinnerIcon className="text-accent" />
            <span className="text-gray-600 text-sm">Checking GitHub connection…</span>
          </div>
        ) : connected ? (
          <div className="flex items-center gap-4 p-5 bg-green-50 border border-green-200 rounded-xl mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <CheckIcon className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">GitHub connected</p>
              {githubAccount && (
                <p className="text-sm text-gray-500">
                  Signed in as <span className="font-medium text-gray-700">@{githubAccount}</span>
                </p>
              )}
            </div>
            <Badge variant="success" className="ml-auto">
              Connected
            </Badge>
          </div>
        ) : (
          <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">No GitHub connection found</p>
                <p className="text-sm text-gray-500 mb-4">
                  Install the Audit Trail GitHub App to grant access to your repositories. You
                  control exactly which repos are shared.
                </p>
                <Button variant="accent" href={GITHUB_APP_INSTALL_URL}>
                  Install GitHub App →
                </Button>
              </div>
            </div>
          </div>
        )}

        {!connected && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg mb-6">
            <svg
              className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-blue-700">
              After installing the GitHub App you&apos;ll be redirected back. Click{" "}
              <button
                className="font-semibold underline hover:no-underline"
                onClick={checkConnection}
              >
                Check again
              </button>{" "}
              once you return.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <div className="flex gap-3">
            {!connected && (
              <Button variant="secondary" onClick={checkConnection} loading={checking}>
                Check again
              </Button>
            )}
            <Button variant="accent" onClick={onNext} disabled={!connected}>
              Continue →
            </Button>
          </div>
        </div>
      </Card>
    </FadeInOnLoad>
  );
}

// ─── Step: Select Repositories ───────────────────────────────────────────────

function ReposStep({
  onNext,
  onBack,
}: {
  onNext: (selectedIds: number[]) => void;
  onBack: () => void;
}) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch("/api/github/repositories");
        const data = await res.json();
        setRepos(data.repositories ?? []);

        // Pre-select already-active repos
        const activeIds = (data.repositories ?? [])
          .filter((r: GithubRepo) => r.isActive)
          .map((r: GithubRepo) => r.id);
        if (activeIds.length > 0) setSelected(new Set(activeIds));
      } catch (err) {
        logger.error("Failed to fetch repos", err);
        setError("Failed to load repositories. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = async () => {
    if (selected.size === 0) {
      setError("Please select at least one repository to track.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/github/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save repositories");
      }
      trackEvent("repo_select", { count: selected.size });
      onNext(Array.from(selected));
    } catch (err) {
      logger.error("Failed to save repos", err);
      setError(err instanceof Error ? err.message : "Failed to save repositories.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FadeInOnLoad>
      <Card variant="elevated" padding="lg">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select Repositories</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Choose which repositories you want Audit Trail to track. You can change this anytime.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-10 text-gray-500 mb-6">
            <p className="font-medium mb-1">No repositories found</p>
            <p className="text-sm">
              Make sure the Audit Trail GitHub App has access to at least one repository.
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => toggle(repo.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
                  selected.has(repo.id)
                    ? "border-accent bg-accent/5"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    selected.has(repo.id) ? "bg-accent border-accent" : "bg-white border-gray-300"
                  )}
                >
                  {selected.has(repo.id) && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">{repo.name}</span>
                    {repo.private && (
                      <Badge variant="default" size="sm">
                        Private
                      </Badge>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{repo.description}</p>
                  )}
                </div>
                {selected.has(repo.id) && (
                  <Badge variant="accent" size="sm">
                    Selected
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <span className="text-sm text-gray-500">
                {selected.size} repo{selected.size !== 1 ? "s" : ""} selected
              </span>
            )}
            <Button
              variant="accent"
              onClick={handleNext}
              loading={saving}
              disabled={selected.size === 0 || loading}
            >
              Continue →
            </Button>
          </div>
        </div>
      </Card>
    </FadeInOnLoad>
  );
}

// ─── Step: Choose Frameworks ─────────────────────────────────────────────────

const FALLBACK_FRAMEWORKS: Framework[] = [
  {
    id: "soc2",
    name: "SOC 2",
    version: "2022",
    description: "Trust Services Criteria: change management, access control, monitoring",
  },
  {
    id: "iso27001-2022",
    name: "ISO 27001",
    version: "2022",
    description: "Annex A technological controls",
  },
  {
    id: "nist-csf",
    name: "NIST CSF",
    version: "2.0",
    description: "Govern, Protect, and Detect functions",
  },
  {
    id: "nist-800-53",
    name: "NIST SP 800-53",
    version: "Rev 5",
    description: "Selected SDLC controls: change management, monitoring, flaw remediation",
  },
  {
    id: "essential-eight-2023",
    name: "Essential Eight",
    version: "2023",
    description: "ACSC strategies: patching, access control, application security",
  },
  {
    id: "pci-dss",
    name: "PCI DSS",
    version: "4.0",
    description: "Requirements 6, 7, 8: secure development and access control",
  },
];

function FrameworksStep({
  isPro,
  onNext,
  onBack,
}: {
  isPro: boolean;
  onNext: (selected: string[]) => void;
  onBack: () => void;
}) {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const FREE_LIMIT = 2;
  const limit = isPro ? Infinity : FREE_LIMIT;

  useEffect(() => {
    const fetchFrameworks = async () => {
      try {
        const res = await fetch("/api/frameworks");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.frameworks) && data.frameworks.length > 0) {
            setFrameworks(data.frameworks);
            return;
          }
        }
      } catch (err) {
        logger.error("Failed to fetch frameworks", err);
      }
      // Fall back to static list
      setFrameworks(FALLBACK_FRAMEWORKS);
      setLoading(false);
    };
    fetchFrameworks().finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < limit) {
        next.add(id);
      }
      return next;
    });
  };

  const handleNext = () => {
    trackEvent("onboarding_complete", { step: "frameworks", count: selected.size });
    onNext(Array.from(selected));
  };

  return (
    <FadeInOnLoad>
      <Card variant="elevated" padding="lg">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Choose Frameworks
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Which compliance standards do you need to meet? Pick up to{" "}
                {isPro ? "all" : FREE_LIMIT} frameworks.
              </p>
            </div>
            {!isPro && (
              <Badge variant="default" size="md" className="shrink-0">
                Free: {selected.size}/{FREE_LIMIT}
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {frameworks.map((fw) => {
              const isSelected = selected.has(fw.id);
              const isDisabled = !isSelected && !isPro && selected.size >= FREE_LIMIT;
              return (
                <button
                  key={fw.id}
                  onClick={() => !isDisabled && toggle(fw.id)}
                  disabled={isDisabled}
                  className={cn(
                    "relative p-3 rounded-xl border-2 text-left transition-all duration-150",
                    isSelected
                      ? "border-accent bg-accent/5"
                      : isDisabled
                        ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 cursor-pointer"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <p className="font-semibold text-gray-900 text-sm pr-6">{fw.name}</p>
                  {fw.version && <p className="text-xs text-accent mt-0.5">v{fw.version}</p>}
                  {fw.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{fw.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!isPro && selected.size >= FREE_LIMIT && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <svg
              className="w-4 h-4 text-amber-600 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-amber-700">
              Free plan is limited to {FREE_LIMIT} frameworks.{" "}
              <a href="/settings/billing" className="font-semibold underline hover:no-underline">
                Upgrade to Pro
              </a>{" "}
              for all frameworks.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => handleNext()}>
              Skip for now
            </Button>
            <Button variant="accent" onClick={handleNext} disabled={selected.size === 0}>
              Continue →
            </Button>
          </div>
        </div>
      </Card>
    </FadeInOnLoad>
  );
}

// ─── Step: First Sync ────────────────────────────────────────────────────────

type SyncStatus = "idle" | "syncing" | "done" | "error";

function SyncStep({ onFinish, onBack }: { onFinish: () => void; onBack: () => void }) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const runSync = async () => {
    setStatus("syncing");
    setMessage(null);
    setProgress(10);

    // Animate progress bar
    const tick = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85));
    }, 800);

    try {
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      clearInterval(tick);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Sync failed");
      }
      setProgress(100);
      setStatus("done");
      trackEvent("repo_sync");
      // Mark onboarding completed in localStorage so dashboard doesn't re-redirect
      try {
        localStorage.setItem("audittrail_onboarding_done", "1");
      } catch (_e) {
        // ignore
      }
    } catch (err) {
      clearInterval(tick);
      logger.error("First sync failed", err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Sync failed. Please try again.");
      setProgress(0);
    }
  };

  return (
    <FadeInOnLoad>
      <Card variant="elevated" padding="lg">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Run First Sync</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Audit Trail will now pull your commit history, pull requests, and branch settings to
            generate your first compliance score.
          </p>
        </div>

        <div className="mb-8">
          {status === "idle" && (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <p className="text-gray-600 text-sm max-w-sm mx-auto">
                Ready to sync. This usually takes 30–90 seconds depending on your repo size.
              </p>
            </div>
          )}

          {status === "syncing" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                <SpinnerIcon className="text-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Syncing repositories…</p>
                  <p className="text-xs text-gray-500">
                    Fetching commits, PRs, and branch protections
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <CheckIcon className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Sync complete!</p>
                <p className="text-sm text-gray-600">
                  Your repositories have been synced. Head to the Evidence page to see your
                  compliance data.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-medium text-red-800 text-sm mb-1">Sync encountered an error</p>
              {message && <p className="text-xs text-red-700">{message}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onBack} disabled={status === "syncing"}>
            ← Back
          </Button>
          <div className="flex gap-3">
            {status === "idle" && (
              <Button variant="accent" onClick={runSync}>
                Start sync →
              </Button>
            )}
            {status === "syncing" && (
              <Button variant="accent" loading disabled>
                Syncing…
              </Button>
            )}
            {status === "done" && (
              <Button variant="accent" onClick={onFinish}>
                View Evidence →
              </Button>
            )}
            {status === "error" && (
              <>
                <Button variant="secondary" onClick={onFinish}>
                  Skip to Evidence
                </Button>
                <Button variant="accent" onClick={runSync}>
                  Retry sync
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </FadeInOnLoad>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [isPro, setIsPro] = useState(false);

  // Fetch subscription plan once
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setIsPro(data.subscription?.plan === "pro");
        }
      } catch (_e) {
        // ignore – default to free
      }
    };
    fetchPlan();
  }, []);

  const go = (s: Step) => setStep(s);

  const handleFinish = () => {
    try {
      localStorage.setItem("audittrail_onboarding_done", "1");
    } catch (_e) {
      // ignore
    }
    trackEvent("onboarding_complete");
    router.push("/evidence");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Audit <span className="font-semibold text-accent">Trail</span>
          </div>
          <button
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => {
              try {
                localStorage.setItem("audittrail_onboarding_done", "1");
              } catch (_e) {
                // ignore
              }
              router.push("/dashboard");
            }}
          >
            Skip setup →
          </button>
        </div>

        {/* Progress */}
        <ProgressBar currentStep={step} />

        {/* Steps */}
        {step === "welcome" && <WelcomeStep onNext={() => go("connect")} />}

        {step === "connect" && (
          <ConnectStep onNext={() => go("repos")} onBack={() => go("welcome")} />
        )}

        {step === "repos" && (
          <ReposStep onNext={() => go("frameworks")} onBack={() => go("connect")} />
        )}

        {step === "frameworks" && (
          <FrameworksStep isPro={isPro} onNext={() => go("sync")} onBack={() => go("repos")} />
        )}

        {step === "sync" && <SyncStep onFinish={handleFinish} onBack={() => go("frameworks")} />}
      </div>
    </div>
  );
}
