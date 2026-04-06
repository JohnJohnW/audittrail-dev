import type { ControlDefinition } from "./types";

// ============================================
// All 39 compliance control definitions
// ============================================

export const CONTROL_DEFINITIONS: ControlDefinition[] = [
  // ──────────────────────────────────────────
  // ISO 27001:2022 (10 controls)
  // ──────────────────────────────────────────
  {
    code: "A.8.9",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Configuration Management",
    description:
      "Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.",
    relevantTools: ["get_evidence_for_control", "get_branch_protections", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "repository_config"],
  },
  {
    code: "A.8.32",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Change Management",
    description:
      "Changes to information processing facilities and information systems shall be subject to change management procedures.",
    relevantTools: [
      "get_evidence_for_control",
      "get_pr_review_quality_signals",
      "get_deployment_approval_rate",
    ],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "deployment_approval"],
  },
  {
    code: "A.8.4",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Access to Source Code",
    description:
      "Read and write access to source code, development tools and software libraries shall be appropriately managed.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "access_control"],
  },
  {
    code: "A.8.25",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Secure Development Life Cycle",
    description:
      "Rules for the secure development of software and systems shall be established and applied.",
    relevantTools: [
      "get_evidence_for_control",
      "get_pr_review_quality_signals",
      "get_repository_config",
    ],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "repository_config"],
  },
  {
    code: "A.8.26",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Application Security Requirements",
    description:
      "Information security requirements shall be identified, specified and approved when developing or acquiring applications.",
    relevantTools: ["get_evidence_for_control", "get_pr_review_quality_signals"],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals"],
  },
  {
    code: "A.8.27",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Secure System Architecture and Engineering Principles",
    description:
      "Principles for engineering secure systems shall be established, documented, maintained and applied to any information system development activities.",
    relevantTools: ["get_evidence_for_control", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "repository_config"],
  },
  {
    code: "A.8.28",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Secure Coding",
    description: "Secure coding principles shall be applied to software development.",
    relevantTools: ["get_evidence_for_control", "get_pr_review_quality_signals"],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "pr_review"],
  },
  {
    code: "A.8.29",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Security Testing in Development and Acceptance",
    description:
      "Security testing processes shall be defined and implemented in the development life cycle.",
    relevantTools: [
      "get_evidence_for_control",
      "get_pr_review_quality_signals",
      "get_repository_config",
    ],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "repository_config"],
  },
  {
    code: "A.8.31",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Separation of Development, Test and Production Environments",
    description: "Development, testing and production environments shall be separated and secured.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_deployment_approval_rate",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "deployment_approval"],
  },
  {
    code: "A.5.17",
    framework: "ISO 27001",
    frameworkName: "ISO 27001",
    name: "Authentication Information",
    description:
      "Allocation and management of authentication information shall be controlled by a management process.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "access_control"],
  },

  // ──────────────────────────────────────────
  // Essential Eight (5 controls)
  // ──────────────────────────────────────────
  {
    code: "E8-1",
    framework: "Essential Eight",
    frameworkName: "Essential Eight",
    name: "Application Control",
    description:
      "Application control to prevent execution of unapproved/malicious programs including .exe, DLL, scripts and installers. Evidenced through branch protection rules limiting who can deploy.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_deployment_approval_rate",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "deployment_approval"],
  },
  {
    code: "E8-2",
    framework: "Essential Eight",
    frameworkName: "Essential Eight",
    name: "Patch Applications",
    description:
      "Patch applications (e.g. Flash, web browsers, Microsoft Office, Java, PDF viewers) within 48 hours if a security vulnerability is assessed as extreme risk, or within two weeks otherwise.",
    relevantTools: ["get_evidence_for_control", "get_dependabot_patch_lag"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "dependency_patches"],
  },
  {
    code: "E8-4",
    framework: "Essential Eight",
    frameworkName: "Essential Eight",
    name: "Restrict Administrative Privileges",
    description:
      "Restrict administrative privileges to operating systems and applications based on user duties. Regularly revalidate the need for privileges.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "access_control"],
  },
  {
    code: "E8-5",
    framework: "Essential Eight",
    frameworkName: "Essential Eight",
    name: "Patch Operating Systems",
    description:
      "Patch operating systems within 48 hours if a security vulnerability is assessed as extreme risk, or within two weeks otherwise.",
    relevantTools: ["get_evidence_for_control", "get_dependabot_patch_lag"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "dependency_patches"],
  },
  {
    code: "E8-8",
    framework: "Essential Eight",
    frameworkName: "Essential Eight",
    name: "Regular Backups",
    description:
      "Perform regular backups of important data, software and configuration settings. Test restoration of backups.",
    relevantTools: ["get_evidence_for_control", "get_repository_config"],
    requiresHumanAction: true,
    humanTaskType: "dr_test",
    evidenceSources: ["commit_history", "repository_config"],
  },

  // ──────────────────────────────────────────
  // NIST CSF 2.0 (7 controls)
  // ──────────────────────────────────────────
  {
    code: "CSF-GV.OC-03",
    framework: "NIST CSF",
    frameworkName: "NIST CSF 2.0",
    name: "Legal & Regulatory Requirements",
    description:
      "Legal, regulatory, and contractual cybersecurity requirements are understood and managed. Pull request reviews and approvals provide evidence that changes are reviewed for compliance.",
    relevantTools: ["get_evidence_for_control", "get_pr_review_quality_signals"],
    requiresHumanAction: true,
    humanTaskType: "policy_approval",
    evidenceSources: ["pr_approvals", "pr_review"],
  },
  {
    code: "CSF-PR.AA-05",
    framework: "NIST CSF",
    frameworkName: "NIST CSF 2.0",
    name: "Access Permissions Management",
    description:
      "Access permissions, entitlements, and authorisations are defined in a policy, managed, enforced, and reviewed. Branch protection rules restrict who can push and merge code.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "access_control"],
  },
  {
    code: "CSF-PR.PS-01",
    framework: "NIST CSF",
    frameworkName: "NIST CSF 2.0",
    name: "Configuration Management",
    description:
      "Configuration management practices are established and applied. Branch protection policies enforce configuration governance across repositories.",
    relevantTools: ["get_evidence_for_control", "get_branch_protections", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "repository_config"],
  },
  {
    code: "CSF-PR.PS-02",
    framework: "NIST CSF",
    frameworkName: "NIST CSF 2.0",
    name: "Software Development Security Practices",
    description:
      "Software development security practices are integrated into the SDLC. Pull request approvals and review processes demonstrate secure development practices.",
    relevantTools: ["get_evidence_for_control", "get_pr_review_quality_signals"],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "pr_review"],
  },
  {
    code: "CSF-PR.PS-04",
    framework: "NIST CSF",
    frameworkName: "NIST CSF 2.0",
    name: "Log Records",
    description:
      "Log records are created, protected, analysed, and retained. Commit history provides an immutable audit log of all code changes.",
    relevantTools: ["get_evidence_for_control", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "repository_config"],
  },
  {
    code: "CSF-PR.PS-05",
    framework: "NIST CSF",
    frameworkName: "NIST CSF 2.0",
    name: "Software & Dependency Management",
    description:
      "Installed software and firmware are managed. Dependency update commits and automated patching tools provide evidence of software lifecycle management.",
    relevantTools: ["get_evidence_for_control", "get_dependabot_patch_lag"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "dependency_patches"],
  },
  {
    code: "CSF-DE.CM-09",
    framework: "NIST CSF",
    frameworkName: "NIST CSF 2.0",
    name: "Computing Systems Monitored",
    description:
      "Computing hardware and software are monitored to find potentially adverse events. CI/CD pipeline commits and infrastructure-as-code changes evidence continuous monitoring.",
    relevantTools: ["get_evidence_for_control", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "repository_config"],
  },

  // ──────────────────────────────────────────
  // NIST SP 800-53 Rev 5 (7 controls)
  // ──────────────────────────────────────────
  {
    code: "800-53-SA-10",
    framework: "NIST SP 800-53",
    frameworkName: "NIST SP 800-53 Rev 5",
    name: "Developer Configuration Management",
    description:
      "The organisation requires the developer to perform configuration management during system, component, or service development. Branch protection and required reviews enforce configuration control.",
    relevantTools: ["get_evidence_for_control", "get_branch_protections", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "repository_config"],
  },
  {
    code: "800-53-SA-11",
    framework: "NIST SP 800-53",
    frameworkName: "NIST SP 800-53 Rev 5",
    name: "Developer Testing and Evaluation",
    description:
      "The organisation requires the developer to implement a security and privacy assessment plan. Pull request reviews with security checks provide evidence of developer testing.",
    relevantTools: [
      "get_evidence_for_control",
      "get_pr_review_quality_signals",
      "get_repository_config",
    ],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "repository_config"],
  },
  {
    code: "800-53-CM-3",
    framework: "NIST SP 800-53",
    frameworkName: "NIST SP 800-53 Rev 5",
    name: "Configuration Change Control",
    description:
      "The organisation documents, manages, and controls changes to the system. Pull request approvals with required reviews enforce a formal change control process.",
    relevantTools: [
      "get_evidence_for_control",
      "get_pr_review_quality_signals",
      "get_deployment_approval_rate",
    ],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "deployment_approval"],
  },
  {
    code: "800-53-CM-4",
    framework: "NIST SP 800-53",
    frameworkName: "NIST SP 800-53 Rev 5",
    name: "Security and Privacy Impact Analysis",
    description:
      "The organisation analyses changes to the system to determine potential security and privacy impacts. PR review processes provide a mechanism for security impact analysis.",
    relevantTools: ["get_evidence_for_control", "get_pr_review_quality_signals"],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "pr_review"],
  },
  {
    code: "800-53-AC-2",
    framework: "NIST SP 800-53",
    frameworkName: "NIST SP 800-53 Rev 5",
    name: "Account Management",
    description:
      "The organisation manages system accounts including establishing, activating, modifying, reviewing, disabling, and removing accounts. Branch protection restricts repository access by role.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: true,
    humanTaskType: "access_review",
    evidenceSources: ["branch_protection", "access_control"],
  },
  {
    code: "800-53-SI-2",
    framework: "NIST SP 800-53",
    frameworkName: "NIST SP 800-53 Rev 5",
    name: "Flaw Remediation",
    description:
      "The organisation identifies, reports, and corrects information system flaws. Dependency update commits and security patch PRs provide evidence of flaw remediation.",
    relevantTools: ["get_evidence_for_control", "get_dependabot_patch_lag"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "dependency_patches"],
  },
  {
    code: "800-53-CA-7",
    framework: "NIST SP 800-53",
    frameworkName: "NIST SP 800-53 Rev 5",
    name: "Continuous Monitoring",
    description:
      "The organisation develops a continuous monitoring strategy. CI/CD security scans and automated test commits provide evidence of ongoing monitoring.",
    relevantTools: ["get_evidence_for_control", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "repository_config"],
  },

  // ──────────────────────────────────────────
  // SOC 2 (5 controls)
  // ──────────────────────────────────────────
  {
    code: "SOC2-CC8.1",
    framework: "SOC 2",
    frameworkName: "SOC 2",
    name: "Change Management",
    description:
      "The entity authorises, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures. PR approvals enforce this process.",
    relevantTools: [
      "get_evidence_for_control",
      "get_pr_review_quality_signals",
      "get_deployment_approval_rate",
    ],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "deployment_approval"],
  },
  {
    code: "SOC2-CC6.1",
    framework: "SOC 2",
    frameworkName: "SOC 2",
    name: "Logical and Physical Access Controls",
    description:
      "The entity implements logical access security software, infrastructure, and architectures over protected information assets. Branch protection rules restrict access to production code.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "access_control"],
  },
  {
    code: "SOC2-CC6.6",
    framework: "SOC 2",
    frameworkName: "SOC 2",
    name: "Logical Access Security",
    description:
      "The entity implements logical access security measures to protect against threats from sources outside its system boundaries. Repository access controls and required reviews evidence this.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "access_control"],
  },
  {
    code: "SOC2-CC7.1",
    framework: "SOC 2",
    frameworkName: "SOC 2",
    name: "System Component Detection",
    description:
      "The entity uses detection and monitoring procedures to identify changes to configurations that result in the introduction of new vulnerabilities. CI/CD and infrastructure commits provide evidence.",
    relevantTools: [
      "get_evidence_for_control",
      "get_repository_config",
      "get_dependabot_patch_lag",
    ],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "repository_config", "dependency_patches"],
  },
  {
    code: "SOC2-CC7.2",
    framework: "SOC 2",
    frameworkName: "SOC 2",
    name: "Anomaly and Threat Monitoring",
    description:
      "The entity monitors system components and the operation of those components for anomalies indicative of malicious acts, natural disasters, and errors affecting the entity's ability to meet its objectives.",
    relevantTools: ["get_evidence_for_control", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "repository_config"],
  },

  // ──────────────────────────────────────────
  // PCI DSS 4.0 (5 controls)
  // ──────────────────────────────────────────
  {
    code: "PCI-6.2",
    framework: "PCI DSS",
    frameworkName: "PCI DSS 4.0",
    name: "Security Vulnerabilities Identified and Managed",
    description:
      "Bespoke and custom software are developed securely. Dependency update commits, CVE patches, and security scanning tool commits provide evidence of vulnerability management.",
    relevantTools: ["get_evidence_for_control", "get_dependabot_patch_lag"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "dependency_patches"],
  },
  {
    code: "PCI-6.3",
    framework: "PCI DSS",
    frameworkName: "PCI DSS 4.0",
    name: "Security Vulnerabilities Addressed",
    description:
      "Security vulnerabilities are identified and protected against. Pull request reviews with security checks provide evidence that vulnerabilities are assessed before merging.",
    relevantTools: ["get_evidence_for_control", "get_pr_review_quality_signals"],
    requiresHumanAction: false,
    evidenceSources: ["pr_approvals", "pr_review"],
  },
  {
    code: "PCI-6.4",
    framework: "PCI DSS",
    frameworkName: "PCI DSS 4.0",
    name: "Web-Facing Applications Protected",
    description:
      "Public-facing web applications are protected against attacks. Security commit patterns and CI/CD security scans evidence ongoing protection of web-facing application code.",
    relevantTools: ["get_evidence_for_control", "get_repository_config"],
    requiresHumanAction: false,
    evidenceSources: ["commit_history", "repository_config"],
  },
  {
    code: "PCI-7.2",
    framework: "PCI DSS",
    frameworkName: "PCI DSS 4.0",
    name: "Access to System Components and Data",
    description:
      "Access to system components and data is appropriately defined and assigned. Branch protection rules restrict who can merge to production branches, controlling system access.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "access_control"],
  },
  {
    code: "PCI-8.2",
    framework: "PCI DSS",
    frameworkName: "PCI DSS 4.0",
    name: "User Identification and Authentication",
    description:
      "All users are assigned a unique ID before allowing them to access system components or cardholder data. Branch protection with required reviews enforces authenticated user identity for all code changes.",
    relevantTools: [
      "get_evidence_for_control",
      "get_branch_protections",
      "get_access_control_signals",
    ],
    requiresHumanAction: false,
    evidenceSources: ["branch_protection", "access_control"],
  },
];

// ============================================
// Helper functions
// ============================================

/** Return all controls belonging to a given framework key (e.g. "ISO 27001", "SOC 2"). */
export function getControlsByFramework(framework: string): ControlDefinition[] {
  return CONTROL_DEFINITIONS.filter((c) => c.framework === framework);
}

/** Look up a single control by its code (e.g. "A.8.9", "SOC2-CC8.1"). */
export function getControlByCode(code: string): ControlDefinition | undefined {
  return CONTROL_DEFINITIONS.find((c) => c.code === code);
}
