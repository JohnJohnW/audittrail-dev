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
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";

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
          <p className="text-gray-500">Loading trends...</p>
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

  const tooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  };

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Trends & Analytics
            </h1>
            <p className="text-gray-500 mt-1">Historical compliance and activity trends</p>
          </div>
          <div className="flex gap-2">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="commits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pullRequests" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="complianceScore"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Compliance Score (%)"
                    dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="evidenceCount"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Evidence Items"
                    dot={{ fill: "#f59e0b", strokeWidth: 2 }}
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
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StaggerItem>
                <SummaryStatCard
                  label="Total Commits"
                  value={data.commits.reduce((a, b) => a + b, 0).toLocaleString()}
                  color="blue"
                />
              </StaggerItem>
              <StaggerItem>
                <SummaryStatCard
                  label="Total Pull Requests"
                  value={data.pullRequests.reduce((a, b) => a + b, 0).toLocaleString()}
                  color="green"
                />
              </StaggerItem>
              <StaggerItem>
                <SummaryStatCard
                  label="Avg Compliance Score"
                  value={`${Math.round(
                    data.complianceScores.reduce((a, b) => a + b, 0) /
                      data.complianceScores.filter((s) => s > 0).length || 0
                  )}%`}
                  color="purple"
                />
              </StaggerItem>
              <StaggerItem>
                <SummaryStatCard
                  label="Total Evidence Items"
                  value={data.evidenceCounts.reduce((a, b) => a + b, 0).toLocaleString()}
                  color="orange"
                />
              </StaggerItem>
            </StaggerContainer>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

function SummaryStatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "from-blue-50 to-blue-100/50 text-blue-600",
    green: "from-green-50 to-green-100/50 text-green-600",
    purple: "from-purple-50 to-purple-100/50 text-purple-600",
    orange: "from-orange-50 to-orange-100/50 text-orange-600",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-gradient-to-br ${colors[color].split(" ")[0]} ${colors[color].split(" ")[1]} rounded-xl p-5`}
    >
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color].split(" ")[2]}`}>{value}</p>
    </motion.div>
  );
}
