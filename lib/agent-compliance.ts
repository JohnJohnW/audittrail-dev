/**
 * Agent Event to Compliance Control Mapper
 *
 * Maps agent events to ISO 27001, Essential Eight, and
 * Australian Privacy Principles controls with relevance scoring.
 */

import type { AgentEventCategory, AgentRiskLevel } from "@/lib/constants";

export interface ControlMapping {
  frameworkName: string;
  controlCode: string;
  controlTitle: string;
  relevance: "high" | "medium" | "low";
}

/**
 * Control mapping definitions by event category.
 * Each category maps to multiple controls across frameworks.
 */
const CONTROL_MAP: Record<AgentEventCategory, ControlMapping[]> = {
  shell_exec: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.9", controlTitle: "Configuration Management", relevance: "high" },
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.15", controlTitle: "Logging", relevance: "high" },
    { frameworkName: "Essential Eight", controlCode: "E8-AC", controlTitle: "Application Control", relevance: "high" },
    { frameworkName: "Essential Eight", controlCode: "E8-RAP", controlTitle: "Restrict Administrative Privileges", relevance: "medium" },
  ],
  file_write: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.4", controlTitle: "Access to Source Code", relevance: "high" },
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.32", controlTitle: "Change Management", relevance: "high" },
    { frameworkName: "Essential Eight", controlCode: "E8-AC", controlTitle: "Application Control", relevance: "medium" },
    { frameworkName: "Australian Privacy Principles", controlCode: "APP-11", controlTitle: "Security of Personal Information", relevance: "medium" },
  ],
  file_read: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.4", controlTitle: "Access to Source Code", relevance: "medium" },
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.15", controlTitle: "Logging", relevance: "low" },
    { frameworkName: "Australian Privacy Principles", controlCode: "APP-12", controlTitle: "Access to Personal Information", relevance: "medium" },
  ],
  network_request: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.16", controlTitle: "Monitoring Activities", relevance: "high" },
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.28", controlTitle: "Secure Coding", relevance: "medium" },
    { frameworkName: "Essential Eight", controlCode: "E8-UAH", controlTitle: "User Application Hardening", relevance: "medium" },
    { frameworkName: "Australian Privacy Principles", controlCode: "APP-8", controlTitle: "Cross-border Disclosure", relevance: "high" },
  ],
  browser_action: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.16", controlTitle: "Monitoring Activities", relevance: "medium" },
    { frameworkName: "Essential Eight", controlCode: "E8-UAH", controlTitle: "User Application Hardening", relevance: "medium" },
    { frameworkName: "Australian Privacy Principles", controlCode: "APP-8", controlTitle: "Cross-border Disclosure", relevance: "medium" },
  ],
  credential_access: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.5.17", controlTitle: "Authentication Information", relevance: "high" },
    { frameworkName: "ISO 27001:2022", controlCode: "A.5.15", controlTitle: "Access Control", relevance: "high" },
    { frameworkName: "Essential Eight", controlCode: "E8-MFA", controlTitle: "Multi-factor Authentication", relevance: "high" },
    { frameworkName: "Essential Eight", controlCode: "E8-RAP", controlTitle: "Restrict Administrative Privileges", relevance: "high" },
    { frameworkName: "Australian Privacy Principles", controlCode: "APP-11", controlTitle: "Security of Personal Information", relevance: "high" },
  ],
  session_management: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.15", controlTitle: "Logging", relevance: "low" },
  ],
  agent_routing: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.5.15", controlTitle: "Access Control", relevance: "medium" },
    { frameworkName: "Essential Eight", controlCode: "E8-RAP", controlTitle: "Restrict Administrative Privileges", relevance: "medium" },
    { frameworkName: "Australian Privacy Principles", controlCode: "APP-6", controlTitle: "Use or Disclosure of Personal Information", relevance: "medium" },
  ],
  system_config: [
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.9", controlTitle: "Configuration Management", relevance: "high" },
    { frameworkName: "ISO 27001:2022", controlCode: "A.8.31", controlTitle: "Separation of Environments", relevance: "medium" },
    { frameworkName: "Essential Eight", controlCode: "E8-AC", controlTitle: "Application Control", relevance: "high" },
    { frameworkName: "Essential Eight", controlCode: "E8-RAP", controlTitle: "Restrict Administrative Privileges", relevance: "high" },
  ],
};

/**
 * Get control mappings for an agent event.
 * Adjusts relevance based on the event's risk level.
 */
export function getControlMappings(
  category: AgentEventCategory,
  riskLevel: AgentRiskLevel
): ControlMapping[] {
  const baseMappings = CONTROL_MAP[category] || [];

  // Boost relevance for high/critical risk events
  if (riskLevel === "critical" || riskLevel === "high") {
    return baseMappings.map((m) => ({
      ...m,
      relevance: m.relevance === "low" ? "medium" : m.relevance === "medium" ? "high" : "high",
    }));
  }

  return baseMappings;
}

/**
 * Get all unique control codes that an event maps to.
 */
export function getControlCodes(category: AgentEventCategory): string[] {
  const mappings = CONTROL_MAP[category] || [];
  return Array.from(new Set(mappings.map((m) => m.controlCode)).values());
}

/**
 * Get a summary of all frameworks relevant to a set of event categories.
 */
export function getFrameworkSummary(
  categories: AgentEventCategory[]
): { frameworkName: string; controlCount: number; controls: string[] }[] {
  const frameworkMap = new Map<string, Set<string>>();

  for (const cat of categories) {
    const mappings = CONTROL_MAP[cat] || [];
    for (const m of mappings) {
      if (!frameworkMap.has(m.frameworkName)) {
        frameworkMap.set(m.frameworkName, new Set());
      }
      frameworkMap.get(m.frameworkName)!.add(m.controlCode);
    }
  }

  return Array.from(frameworkMap.entries()).map(([frameworkName, controlsSet]) => ({
    frameworkName,
    controlCount: controlsSet.size,
    controls: Array.from(controlsSet),
  }));
}
