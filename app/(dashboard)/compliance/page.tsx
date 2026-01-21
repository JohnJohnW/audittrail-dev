"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ComplianceScore {
  overall: number;
  byFramework: { framework: string; score: number; total: number; withEvidence: number }[];
  byCategory: { category: string; score: number }[];
}

export default function CompliancePage() {
  const [score, setScore] = useState<ComplianceScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScore();
  }, []);

  const fetchScore = async () => {
    try {
      const response = await fetch("/api/compliance/score");
      const data = await response.json();
      setScore(data);
    } catch (error) {
      console.error("Failed to fetch compliance score:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading compliance score...</div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load compliance score</p>
      </div>
    );
  }

  const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

  const pieData = [
    { name: "With Evidence", value: score.byFramework.reduce((sum, f) => sum + f.withEvidence, 0) },
    { name: "Partial", value: score.byFramework.reduce((sum, f) => sum + (f.total - f.withEvidence - (f.total - f.total)), 0) },
    { name: "Missing", value: score.byFramework.reduce((sum, f) => sum + (f.total - f.withEvidence), 0) },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Score</h1>
        <p className="text-gray-600 mt-1">
          Overall compliance status and framework breakdown
        </p>
      </div>

      {/* Overall Score */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary-50 mb-4">
            <span className="text-5xl font-bold text-primary-600">
              {score.overall}%
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Overall Compliance Score
          </h2>
          <p className="text-gray-600">
            Based on evidence coverage across all frameworks
          </p>
        </div>
      </div>

      {/* Framework Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            By Framework
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={score.byFramework}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="framework" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Evidence Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const { name, percent } = props;
                  return `${name || ""} ${percent ? (percent * 100).toFixed(0) : 0}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Framework Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Framework Details
        </h2>
        <div className="space-y-4">
          {score.byFramework.map((framework) => (
            <div
              key={framework.framework}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <h3 className="font-medium text-gray-900">{framework.framework}</h3>
                <p className="text-sm text-gray-600">
                  {framework.withEvidence} of {framework.total} controls with evidence
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {framework.score}%
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${framework.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
