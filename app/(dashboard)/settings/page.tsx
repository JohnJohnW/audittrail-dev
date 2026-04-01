"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { logger } from "@/lib/logger";
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

interface NotificationPrefsData {
  syncFailures: boolean;
  weeklyDigest: boolean;
  exportReady: boolean;
  subscriptionUpdates: boolean;
}

interface AuditorSessionData {
  id: string;
  auditorEmail: string;
  auditorName: string | null;
  frameworkFilter: string | null;
  expiresAt: string;
  createdAt: string;
  lastActiveAt: string | null;
  token: string;
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
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefsData>({
    syncFailures: true,
    weeklyDigest: true,
    exportReady: true,
    subscriptionUpdates: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Org profile state
  const [orgIndustry, setOrgIndustry] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Auditor session state
  const [auditorSessions, setAuditorSessions] = useState<AuditorSessionData[]>([]);
  const [newAuditorEmail, setNewAuditorEmail] = useState("");
  const [newAuditorName, setNewAuditorName] = useState("");
  const [newAuditorDays, setNewAuditorDays] = useState("30");
  const [creatingSession, setCreatingSession] = useState(false);
  const [newSessionLink, setNewSessionLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

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

  const fetchAuditorSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/auditor/sessions");
      if (res.ok) {
        const data = await res.json();
        setAuditorSessions(data.sessions ?? []);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchOrgProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/org/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setOrgIndustry(data.profile.industry ?? "");
          setOrgSize(data.profile.companySize ?? "");
        }
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchApiKeys();
    fetchAuditorSessions();
    fetchOrgProfile();
  }, [fetchApiKeys, fetchAuditorSessions, fetchOrgProfile]);

  const saveOrgProfile = async () => {
    setSavingProfile(true);
    try {
      await fetch("/api/org/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: orgIndustry || null,
          companySize: orgSize || null,
        }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      setSubscription(data.subscription);
      setOrg(data.organization);
      if (data.notificationPreferences) {
        setNotifPrefs(data.notificationPreferences);
      }
    } catch (error) {
      logger.error("Failed to fetch settings", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePref = async (key: keyof NotificationPrefsData) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated); // optimistic update
    setSavingPrefs(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: updated }),
      });
    } catch {
      setNotifPrefs(notifPrefs); // revert on error
    } finally {
      setSavingPrefs(false);
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
      logger.error("Upgrade error", error);
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
      logger.error("Billing portal error", error);
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setManagingBilling(false);
    }
  };

  const createAuditorSession = async () => {
    if (!newAuditorEmail.trim()) return;
    setCreatingSession(true);
    try {
      const res = await fetch("/api/auditor/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditorEmail: newAuditorEmail.trim(),
          auditorName: newAuditorName.trim() || null,
          expiresInDays: parseInt(newAuditorDays, 10) || 30,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSessionLink(data.portalLink);
        setNewAuditorEmail("");
        setNewAuditorName("");
        setNewAuditorDays("30");
        fetchAuditorSessions();
      }
    } finally {
      setCreatingSession(false);
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
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Manage your organization and subscription
          </p>
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
                Successfully upgraded to Pro! Unlimited repositories, all 6 frameworks, and exports
                are now unlocked.
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
              <p className="text-gray-900 font-medium">{org?.name || "-"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Organization Slug
              </label>
              <p className="text-gray-600 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg inline-block">
                {org?.slug || "-"}
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
                    ? "Unlimited repositories, all 6 frameworks, and exports"
                    : "2 repositories, 2 frameworks. No exports or auditor portal."}
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
                    <FeatureItem included>Up to 2 repositories</FeatureItem>
                    <FeatureItem included>3 compliance frameworks</FeatureItem>
                    <FeatureItem included>Evidence dashboard & gap analysis</FeatureItem>
                    <FeatureItem included>Basic compliance alerts</FeatureItem>
                    <FeatureItem included>Control notes & exceptions</FeatureItem>
                    <FeatureItem>Exports or auditor portal</FeatureItem>
                  </ul>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="bg-gradient-to-br from-accent-light/50 to-orange-50 rounded-xl p-5 border-2 border-accent/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-gray-900">Pro</p>
                    <span className="text-accent font-semibold">$5/month</span>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <FeatureItem included>Unlimited repositories</FeatureItem>
                    <FeatureItem included>All 6 compliance frameworks</FeatureItem>
                    <FeatureItem included>PDF & CSV exports</FeatureItem>
                    <FeatureItem included>Auditor portal (comments, sign-offs)</FeatureItem>
                    <FeatureItem included>Shareable read-only reports</FeatureItem>
                    <FeatureItem included>Security posture trends</FeatureItem>
                    <FeatureItem included>Control effectiveness analysis</FeatureItem>
                    <FeatureItem included>Advanced alerts</FeatureItem>
                  </ul>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Notification Preferences */}
      <FadeIn delay={0.3}>
        <Card variant="elevated" className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Email Notifications</CardTitle>
              {savingPrefs && <span className="text-xs text-gray-400">Saving…</span>}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-2">
              Choose which events trigger email notifications.
            </p>
            <div className="divide-y divide-gray-100">
              {(
                [
                  {
                    key: "syncFailures" as const,
                    label: "Sync failures",
                    description: "When a repository sync fails",
                  },
                  {
                    key: "weeklyDigest" as const,
                    label: "Weekly digest",
                    description: "Weekly summary of commits, PRs, and compliance score",
                  },
                  {
                    key: "exportReady" as const,
                    label: "Export ready",
                    description: "When a PDF or CSV export completes",
                  },
                  {
                    key: "subscriptionUpdates" as const,
                    label: "Subscription updates",
                    description: "Billing and plan change notifications",
                  },
                ] as { key: keyof NotificationPrefsData; label: string; description: string }[]
              ).map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between py-3.5">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                  </div>
                  <button
                    onClick={() => togglePref(key)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                      notifPrefs[key] ? "bg-accent" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={notifPrefs[key]}
                    aria-label={label}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        notifPrefs[key] ? "translate-x-[18px]" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* API Keys */}
      <FadeIn delay={0.4}>
        <Card variant="elevated" className="mt-6">
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Create API keys for programmatic access to Audit Trail.
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
                    API key created. Copy it now - it won&apos;t be shown again.
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
                          <Badge variant="error" size="sm">
                            Revoked
                          </Badge>
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
              <p className="text-sm text-gray-400 text-center py-4">No API keys yet.</p>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Org Profile - used for benchmark segmentation */}
      <FadeIn delay={0.45}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-5">
              Help us show you how your compliance compares to similar companies. This data is never
              shared. It&apos;s only used to segment anonymised benchmarks.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
                <select
                  value={orgIndustry}
                  onChange={(e) => setOrgIndustry(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                >
                  <option value="">Select industry</option>
                  <option value="saas">SaaS</option>
                  <option value="fintech">Fintech</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="government">Government</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Team Size</label>
                <select
                  value={orgSize}
                  onChange={(e) => setOrgSize(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1–10 people</option>
                  <option value="11-50">11–50 people</option>
                  <option value="51-200">51–200 people</option>
                  <option value="201-1000">201–1,000 people</option>
                  <option value="1000+">1,000+ people</option>
                </select>
              </div>
            </div>
            <Button
              variant="accent"
              onClick={saveOrgProfile}
              loading={savingProfile}
              disabled={savingProfile}
              size="sm"
            >
              {profileSaved ? "Saved!" : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Auditor Access */}
      <FadeIn delay={0.5}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Auditor Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-5">
              Create time-limited, token-gated links for external auditors. No account required.
              auditors can view evidence, add comments, sign off controls, and download evidence
              packages.
            </p>

            {/* Pro gate */}
            {subscription?.plan !== "pro" && (
              <div className="mb-5 rounded-xl border border-yellow-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
                <p className="font-semibold text-yellow-800 text-sm">Pro feature</p>
                <p className="text-sm text-yellow-700 mt-1">
                  The auditor portal is available on the Pro plan. Upgrade to invite external
                  auditors and share evidence packages.
                </p>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 transition-colors"
                >
                  {upgrading ? "Processing…" : "Upgrade to Pro →"}
                </button>
              </div>
            )}

            {/* New link shown after creation */}
            <AnimatePresence>
              {newSessionLink && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    ✓ Auditor link created. Share this with your auditor:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white border border-blue-200 px-3 py-2 rounded font-mono break-all">
                      {newSessionLink}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newSessionLink);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="shrink-0 px-3 py-2 text-xs font-medium bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    >
                      {copiedLink ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <button
                    onClick={() => setNewSessionLink(null)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invite form - Pro only */}
            {subscription?.plan === "pro" && (
              <>
                <div className="flex flex-col sm:flex-row gap-2 mb-5">
                  <input
                    type="email"
                    value={newAuditorEmail}
                    onChange={(e) => setNewAuditorEmail(e.target.value)}
                    placeholder="auditor@example.com"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <input
                    type="text"
                    value={newAuditorName}
                    onChange={(e) => setNewAuditorName(e.target.value)}
                    placeholder="Name (optional)"
                    className="sm:w-40 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <select
                    value={newAuditorDays}
                    onChange={(e) => setNewAuditorDays(e.target.value)}
                    className="sm:w-32 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                  <Button
                    variant="accent"
                    onClick={createAuditorSession}
                    loading={creatingSession}
                    disabled={creatingSession || !newAuditorEmail.trim()}
                    className="shrink-0"
                  >
                    Invite Auditor
                  </Button>
                </div>

                {/* Active sessions list */}
                {auditorSessions.length > 0 ? (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                    {auditorSessions.map((s) => {
                      const isExpired = new Date(s.expiresAt) < new Date();
                      return (
                        <div key={s.id} className="flex items-center justify-between px-4 py-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {s.auditorName ?? s.auditorEmail}
                              </span>
                              {isExpired ? (
                                <Badge variant="error" size="sm">
                                  Expired
                                </Badge>
                              ) : (
                                <Badge variant="success" size="sm">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {s.auditorEmail}
                              {" · "}
                              {isExpired
                                ? `Expired ${new Date(s.expiresAt).toLocaleDateString()}`
                                : `Expires ${new Date(s.expiresAt).toLocaleDateString()}`}
                              {s.lastActiveAt &&
                                ` · Last active ${new Date(s.lastActiveAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              if (
                                !confirm(
                                  "Revoke this auditor's access? They will no longer be able to view evidence."
                                )
                              )
                                return;
                              await fetch(`/api/auditor/sessions/${s.id}`, { method: "DELETE" });
                              fetchAuditorSessions();
                            }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium ml-4 shrink-0"
                          >
                            Revoke
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No auditor sessions yet.</p>
                )}
              </>
            )}
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
