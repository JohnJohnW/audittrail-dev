"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Motion";
import { getContextualLoadingPhrase } from "@/lib/utils/loading-phrases";

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
}

interface OrgData {
  name: string;
  slug: string;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch {
      // Silently fail - keys section is supplementary
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchApiKeys();
  }, [fetchApiKeys]);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      setSubscription(data.subscription);
      setOrg(data.organization);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start upgrade. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Billing portal error:", error);
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setManagingBilling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">{getContextualLoadingPhrase("settings")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage your organization and subscription</p>
        </div>
      </FadeIn>

      {/* Success/Cancel Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-green-700 font-medium">
                Successfully upgraded to Pro! Enjoy unlimited exports.
              </p>
            </div>
          </motion.div>
        )}

        {canceled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4"
          >
            <p className="text-yellow-700">Upgrade was canceled. You can upgrade anytime.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Organization Settings */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Organization Name
              </label>
              <p className="text-gray-900 font-medium">{org?.name || "—"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Organization Slug
              </label>
              <p className="text-gray-600 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg inline-block">
                {org?.slug || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Subscription Settings */}
      <FadeIn delay={0.2}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-lg font-semibold ${
                      subscription?.plan === "pro" ? "text-accent" : "text-gray-900"
                    }`}
                  >
                    {subscription?.plan === "pro" ? "Pro Plan" : "Free Plan"}
                  </span>
                  {subscription?.status === "active" && (
                    <Badge variant="success" size="sm">
                      Active
                    </Badge>
                  )}
                  {subscription?.status === "past_due" && (
                    <Badge variant="error" size="sm">
                      Past Due
                    </Badge>
                  )}
                </div>
                <p className="text-sm sm:text-base text-gray-500 mt-1">
                  {subscription?.plan === "pro"
                    ? "Unlimited repositories and exports"
                    : "3 repositories, no exports"}
                </p>
                {subscription?.currentPeriodEnd && (
                  <p className="text-sm text-gray-500 mt-2">
                    {subscription.cancelAtPeriodEnd
                      ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {subscription?.plan === "pro" ? (
                  <Button
                    variant="secondary"
                    onClick={handleManageBilling}
                    loading={managingBilling}
                    disabled={managingBilling}
                    className="w-full sm:w-auto"
                  >
                    {managingBilling ? "Opening..." : "Manage Billing"}
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    onClick={handleUpgrade}
                    loading={upgrading}
                    disabled={upgrading}
                    className="w-full sm:w-auto"
                  >
                    {upgrading ? "Processing..." : "Upgrade to Pro"}
                  </Button>
                )}
              </div>
            </div>

            {/* Plan Comparison */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Features</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="bg-gray-50 rounded-xl p-5 border border-gray-100"
                >
                  <p className="font-semibold text-gray-900 mb-4">Free</p>
                  <ul className="space-y-3 text-sm">
                    <FeatureItem included>Up to 3 repositories</FeatureItem>
                    <FeatureItem included>View compliance evidence</FeatureItem>
                    <FeatureItem>No PDF/CSV exports</FeatureItem>
                  </ul>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="bg-gradient-to-br from-accent-light/50 to-orange-50 rounded-xl p-5 border-2 border-accent/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-gray-900">Pro</p>
                    <span className="text-accent font-semibold">$49/month</span>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <FeatureItem included>Unlimited repositories</FeatureItem>
                    <FeatureItem included>View compliance evidence</FeatureItem>
                    <FeatureItem included>Unlimited PDF exports</FeatureItem>
                    <FeatureItem included>Unlimited CSV exports</FeatureItem>
                    <FeatureItem included>Priority support</FeatureItem>
                  </ul>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* API Keys for Agent Connector */}
      <FadeIn delay={0.3}>
        <Card variant="elevated" className="mt-6">
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Create API keys to connect the OpenClaw agent connector to AuditTrail.dev.
            </p>

            {/* Create new key */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Key name (e.g., Production)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              <Button
                variant="accent"
                size="sm"
                loading={creatingKey}
                disabled={creatingKey || !newKeyName.trim()}
                onClick={async () => {
                  setCreatingKey(true);
                  try {
                    const res = await fetch("/api/keys", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: newKeyName.trim() }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setNewlyCreatedKey(data.key);
                      setNewKeyName("");
                      fetchApiKeys();
                    }
                  } finally {
                    setCreatingKey(false);
                  }
                }}
              >
                Create Key
              </Button>
            </div>

            {/* Newly created key (show once) */}
            <AnimatePresence>
              {newlyCreatedKey && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4"
                >
                  <p className="text-sm font-medium text-green-800 mb-2">
                    API key created. Copy it now — it won't be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 font-mono text-green-900 break-all">
                      {newlyCreatedKey}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newlyCreatedKey);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-3 py-2 text-xs font-medium bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <button
                    onClick={() => setNewlyCreatedKey(null)}
                    className="text-xs text-green-600 hover:text-green-800 mt-2"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Existing keys */}
            {apiKeys.length > 0 ? (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{key.name}</span>
                        {key.revokedAt && (
                          <Badge variant="error" size="sm">Revoked</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        <span className="font-mono">{key.keyPrefix}</span>
                        {" · Created "}
                        {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && (
                          <> · Last used {new Date(key.lastUsedAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    {!key.revokedAt && (
                      <button
                        onClick={async () => {
                          if (!confirm("Revoke this API key? This cannot be undone.")) return;
                          await fetch(`/api/keys/${key.id}`, { method: "DELETE" });
                          fetchApiKeys();
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium ml-4"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                No API keys yet. Create one to connect the agent connector.
              </p>
            )}

            {/* Quick start hint */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Quick Start</p>
              <p className="text-xs font-mono text-gray-500">
                $ npm install -g @audittrail/openclaw-connector
              </p>
              <p className="text-xs font-mono text-gray-500">
                $ audittrail-connect --api-key &lt;your-key&gt;
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

function FeatureItem({
  children,
  included = false,
}: {
  children: React.ReactNode;
  included?: boolean;
}) {
  return (
    <li className={`flex items-center ${included ? "text-gray-700" : "text-gray-400"}`}>
      {included ? (
        <CheckIcon className="w-4 h-4 text-green-500 mr-2.5 flex-shrink-0" />
      ) : (
        <XIcon className="w-4 h-4 text-gray-300 mr-2.5 flex-shrink-0" />
      )}
      {children}
    </li>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
            <p className="text-gray-500">{getContextualLoadingPhrase("settings")}</p>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
