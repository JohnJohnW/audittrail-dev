"use client";

import { useEffect, useState } from "react";
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
import { format, subDays } from "date-fns";

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

  useEffect(() => {
    fetchTrends();
  }, [days]);

  const fetchTrends = async () => {
    try {
      const response = await fetch(`/api/trends?days=${days}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading trends...</div>
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trends & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Historical compliance and activity trends
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
        </select>
      </div>

      {/* Activity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Commit Activity
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="commits" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pull Request Activity
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="pullRequests" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compliance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Compliance Score Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="complianceScore"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Compliance Score (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Evidence Collection
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="evidenceCount"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Evidence Items"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Commits</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.commits.reduce((a, b) => a + b, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Pull Requests</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.pullRequests.reduce((a, b) => a + b, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Compliance Score</p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(
                data.complianceScores.reduce((a, b) => a + b, 0) /
                  data.complianceScores.filter((s) => s > 0).length || 0
              )}
              %
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Evidence Items</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.evidenceCounts.reduce((a, b) => a + b, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
