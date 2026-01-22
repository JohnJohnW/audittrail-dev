"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { FadeIn } from "@/components/ui/Motion";
import { chart, chartStyles } from "@/lib/design-tokens";
import { getContextualLoadingPhrase } from "@/lib/utils/loading-phrases";

interface TrendData {
  dates: string[];
  commits: number[];
  pullRequests: number[];
  complianceScores: number[];
  evidenceCounts: number[];
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/trends?days=${days}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">{getContextualLoadingPhrase("trends")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load trends data</p>
      </div>
    );
  }

  const chartData = data.dates.map((date, index) => ({
    date: format(new Date(date), "MMM dd"),
    commits: data.commits[index] || 0,
    pullRequests: data.pullRequests[index] || 0,
    complianceScore: data.complianceScores[index] || 0,
    evidenceCount: data.evidenceCounts[index] || 0,
  }));

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Trends & Analytics
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Historical compliance and activity trends</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 7, label: "7d" },
              { value: 30, label: "30d" },
              { value: 90, label: "90d" },
              { value: 180, label: "6m" },
            ].map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDays(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  days === option.value
                    ? "bg-accent text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FadeIn delay={0.1}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Commit Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid {...chartStyles.grid} />
                  <XAxis dataKey="date" tick={chartStyles.axis.tick} />
                  <YAxis tick={chartStyles.axis.tick} />
                  <Tooltip contentStyle={chartStyles.tooltip.contentStyle} />
                  <Bar dataKey="commits" fill={chart.primary} radius={chartStyles.bar.radius} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Pull Request Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid {...chartStyles.grid} />
                  <XAxis dataKey="date" tick={chartStyles.axis.tick} />
                  <YAxis tick={chartStyles.axis.tick} />
                  <Tooltip contentStyle={chartStyles.tooltip.contentStyle} />
                  <Bar dataKey="pullRequests" fill={chart.secondary} radius={chartStyles.bar.radius} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Compliance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FadeIn delay={0.3}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Compliance Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid {...chartStyles.grid} />
                  <XAxis dataKey="date" tick={chartStyles.axis.tick} />
                  <YAxis domain={[0, 100]} tick={chartStyles.axis.tick} />
                  <Tooltip contentStyle={chartStyles.tooltip.contentStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="complianceScore"
                    stroke={chart.primary}
                    strokeWidth={2}
                    name="Compliance Score (%)"
                    dot={{ fill: chart.primary, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.4}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Evidence Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid {...chartStyles.grid} />
                  <XAxis dataKey="date" tick={chartStyles.axis.tick} />
                  <YAxis tick={chartStyles.axis.tick} />
                  <Tooltip contentStyle={chartStyles.tooltip.contentStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="evidenceCount"
                    stroke={chart.secondary}
                    strokeWidth={2}
                    name="Evidence Items"
                    dot={{ fill: chart.secondary, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Summary Stats */}
      <FadeIn delay={0.5}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <StatCardGrid columns={{ default: 2, md: 4 }}>
              <StatCard
                label="Total Commits"
                value={data.commits.reduce((a, b) => a + b, 0).toLocaleString()}
              />
              <StatCard
                label="Total Pull Requests"
                value={data.pullRequests.reduce((a, b) => a + b, 0).toLocaleString()}
              />
              <StatCard
                label="Avg Compliance Score"
                value={`${Math.round(
                  data.complianceScores.reduce((a, b) => a + b, 0) /
                    data.complianceScores.filter((s) => s > 0).length || 0
                )}%`}
              />
              <StatCard
                label="Total Evidence Items"
                value={data.evidenceCounts.reduce((a, b) => a + b, 0).toLocaleString()}
              />
            </StatCardGrid>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
