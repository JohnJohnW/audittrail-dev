"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Motion";

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

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    fetchData();
  }, []);

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
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your organization and subscription</p>
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
            <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
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
                <p className="text-gray-500 mt-1">
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

              {subscription?.plan === "pro" ? (
                <Button
                  variant="secondary"
                  onClick={handleManageBilling}
                  loading={managingBilling}
                  disabled={managingBilling}
                >
                  {managingBilling ? "Opening..." : "Manage Billing"}
                </Button>
              ) : (
                <Button
                  variant="accent"
                  onClick={handleUpgrade}
                  loading={upgrading}
                  disabled={upgrading}
                >
                  {upgrading ? "Processing..." : "Upgrade to Pro"}
                </Button>
              )}
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
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
