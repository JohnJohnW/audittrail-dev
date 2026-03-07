/**
 * Agent Event Classifier & Risk Scorer
 *
 * Classifies agent events by category and assigns risk scores
 * based on the action type and content analysis.
 */

import type { AgentEventCategory, AgentRiskLevel } from "@/lib/constants";

/** Base risk scores by event category */
const BASE_RISK_SCORES: Record<AgentEventCategory, number> = {
  file_read: 1,
  session_management: 1,
  file_write: 3,
  network_request: 3,
  browser_action: 3,
  agent_routing: 4,
  shell_exec: 5,
  system_config: 7,
  credential_access: 8,
};

/** Sensitive file paths that increase risk */
const SENSITIVE_PATHS = [
  "/etc/",
  ".env",
  ".ssh/",
  ".aws/",
  ".gnupg/",
  "credentials",
  "secrets",
  "private",
  ".key",
  ".pem",
  ".p12",
  "id_rsa",
  "id_ed25519",
  "shadow",
  "passwd",
];

/** Patterns indicating privileged operations */
const PRIVILEGED_PATTERNS = [
  "sudo ",
  "su ",
  "chmod 777",
  "chown root",
  "rm -rf /",
  "dd if=",
  "mkfs",
  "fdisk",
  "iptables",
  "systemctl",
  "launchctl",
];

/** Patterns indicating secret/credential exposure */
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]/i,
  /(?:secret|token|password|passwd|pwd)\s*[:=]/i,
  /(?:bearer|authorization)\s*[:=]/i,
  /(?:aws_access_key|aws_secret)/i,
  /(?:ghp_|sk-|pk_|rk_|atk_)/,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
];

export interface RiskAssessment {
  riskScore: number;
  riskLevel: AgentRiskLevel;
  factors: string[];
}

/**
 * Assess the risk of a single agent event.
 */
export function assessEventRisk(
  category: AgentEventCategory,
  action: string,
  input?: Record<string, unknown> | null,
  output?: Record<string, unknown> | null,
  metadata?: Record<string, unknown> | null
): RiskAssessment {
  const factors: string[] = [];
  let score = BASE_RISK_SCORES[category] ?? 3;

  const inputStr = input ? JSON.stringify(input).toLowerCase() : "";
  const outputStr = output ? JSON.stringify(output).slice(0, 5000).toLowerCase() : "";
  const combined = `${inputStr} ${outputStr}`;

  // Check for privileged operations
  if (category === "shell_exec") {
    const command = (input?.command as string) || "";
    for (const pattern of PRIVILEGED_PATTERNS) {
      if (command.toLowerCase().includes(pattern.toLowerCase())) {
        score += 5;
        factors.push(`Privileged command: ${pattern.trim()}`);
        break;
      }
    }
  }

  // Check for sensitive file paths
  if (category === "file_write" || category === "file_read") {
    const path = (input?.path as string) || (input?.file as string) || "";
    for (const sensitive of SENSITIVE_PATHS) {
      if (path.toLowerCase().includes(sensitive.toLowerCase())) {
        score += 5;
        factors.push(`Sensitive path: ${sensitive}`);
        break;
      }
    }
  }

  // Check for network requests to non-HTTPS or unknown domains
  if (category === "network_request") {
    const url = (input?.url as string) || "";
    if (url && !url.startsWith("https://")) {
      score += 3;
      factors.push("Non-HTTPS network request");
    }
  }

  // Check for secret patterns in input/output
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(combined)) {
      score += 3;
      factors.push("Potential secret/credential in payload");
      break;
    }
  }

  // Check for bulk operations
  const fileCount = (metadata?.fileCount as number) || 0;
  if (fileCount > 10) {
    score += 2;
    factors.push(`Bulk operation: ${fileCount} files`);
  }

  // Check for elevated/admin mode
  const elevated = (input?.elevated as boolean) || (metadata?.elevated as boolean);
  if (elevated) {
    score += 4;
    factors.push("Elevated/admin mode");
  }

  return {
    riskScore: Math.min(score, 15), // Cap at 15
    riskLevel: scoreToLevel(score),
    factors,
  };
}

/**
 * Assess the aggregate risk of an entire session.
 */
export function assessSessionRisk(eventRisks: { riskScore: number; riskLevel: AgentRiskLevel }[]): {
  riskScore: number;
  riskLevel: AgentRiskLevel;
} {
  if (eventRisks.length === 0) {
    return { riskScore: 0, riskLevel: "low" };
  }

  const maxScore = Math.max(...eventRisks.map((e) => e.riskScore));
  const avgScore = eventRisks.reduce((sum, e) => sum + e.riskScore, 0) / eventRisks.length;

  // Session risk: 60% max event + 40% average
  const sessionScore = Math.round(maxScore * 0.6 + avgScore * 0.4);

  return {
    riskScore: sessionScore,
    riskLevel: scoreToLevel(sessionScore),
  };
}

/**
 * Convert a numeric risk score to a risk level.
 */
export function scoreToLevel(score: number): AgentRiskLevel {
  if (score >= 10) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}
