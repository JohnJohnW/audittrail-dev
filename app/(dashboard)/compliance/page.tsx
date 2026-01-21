"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";

interface PieLabelProps {
  name?: string;
  percent?: number;
}

interface ComplianceScore {
  overall: number;
  byFramework: { framework: string; score: number; total: number; withEvidence: number }[];
  byCategory: { category: string; score: number }[];
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading compliance score...</p>
        </div>
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

  const pieData = [
    {
      name: "With Evidence",
      value: score.byFramework.reduce((sum, f) => sum + f.withEvidence, 0),
    },
    {
      name: "Missing",
      value: score.byFramework.reduce((sum, f) => sum + (f.total - f.withEvidence), 0),
    },
  ];

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Compliance Score</h1>
          <p className="text-gray-500 mt-1">Overall compliance status and framework breakdown</p>
        </div>
      </FadeIn>

      {/* Overall Score */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" className="mb-8">
          <CardContent className="py-10">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-36 h-36 rounded-full bg-gradient-to-br from-accent-light to-accent/10 mb-6 shadow-lg shadow-accent/10"
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-5xl font-bold text-accent"
                >
                  {score.overall}%
                </motion.span>
              </motion.div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Overall Compliance Score</h2>
              <p className="text-gray-500">Based on evidence coverage across all frameworks</p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <FadeIn delay={0.2}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>By Framework</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={score.byFramework}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="framework" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="score" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Evidence Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: PieLabelProps) => {
                      const { name, percent } = props;
                      return `${name || ""} ${percent ? (percent * 100).toFixed(0) : 0}%`;
                    }}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Framework Details */}
      <FadeIn delay={0.4}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Framework Details</CardTitle>
          </CardHeader>
          <CardContent>
            <StaggerContainer className="space-y-4">
              {score.byFramework.map((framework, index) => (
                <StaggerItem key={framework.framework}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">{framework.framework}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {framework.withEvidence} of {framework.total} controls with evidence
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{framework.score}%</div>
                      <div className="w-36 bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${framework.score}%` }}
                          transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                          className={cn(
                            "h-2.5 rounded-full",
                            framework.score >= 70
                              ? "bg-green-500"
                              : framework.score >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
