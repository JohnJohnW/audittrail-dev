import { db } from "./db";
import { logger } from "./logger";
import type {
  EvidenceItem,
  ControlEvidence,
  ComplianceEvidenceOptions,
  EvidenceSummary,
} from "@/types/compliance";

// Re-export types for backward compatibility
export type { EvidenceItem, ControlEvidence, ComplianceEvidenceOptions, EvidenceSummary };

// Patterns to detect dependency/patching related commits
const DEPENDENCY_PATTERNS = [
  /\b(update|upgrade|bump|patch|security)\b.*\b(depend|package|npm|yarn|pip|gem|maven|gradle|nuget)\b/i,
  /\bpackage(-lock)?\.json\b/i,
  /\brequirements\.txt\b/i,
  /\bGemfile(\.lock)?\b/i,
  /\bpom\.xml\b/i,
  /\bgo\.(mod|sum)\b/i,
  /\bCargo\.(toml|lock)\b/i,
  /\bcomposer\.(json|lock)\b/i,
  /\bdependabot\b/i,
  /\brenovate\b/i,
  /\bsnyk\b/i,
  /\bCVE-\d{4}-\d+/i,
  /\bsecurity (fix|patch|update)/i,
];

// Patterns to detect infrastructure/OS related commits
const INFRASTRUCTURE_PATTERNS = [
  /\bDockerfile\b/i,
  /\bdocker-compose\b/i,
  /\bterraform\b/i,
  /\bansible\b/i,
  /\bkubernetes\b/i,
  /\bk8s\b/i,
  /\bhelm\b/i,
  /\b\.github\/workflows\b/i,
  /\bCI\/CD\b/i,
  /\bbase.?image\b/i,
  /\balpine|ubuntu|debian|centos\b/i,
];

// Patterns to detect security-related commits
const SECURITY_PATTERNS = [
  /\bsecurity\b/i,
  /\bvulnerabil/i,
  /\bCVE-/i,
  /\bauth(entication|orization)?\b/i,
  /\bencrypt/i,
  /\bXSS\b/i,
  /\bSQL.?injection\b/i,
  /\bCSRF\b/i,
  /\bsanitiz/i,
  /\bvalidat/i,
];

// Patterns to detect test-related commits
const TEST_PATTERNS = [
  /\btest\b/i,
  /\bspec\b/i,
  /\bjest\b/i,
  /\bpytest\b/i,
  /\brspec\b/i,
  /\bunit.?test/i,
  /\bintegration.?test/i,
  /\be2e\b/i,
  /\bcoverage\b/i,
];

// Patterns to detect CI/CD security tools (for A.8.29 Security Testing)
const CICD_SECURITY_PATTERNS = [
  /\bsnyk\b/i,
  /\bsonarqube\b/i,
  /\bsonar\b/i,
  /\bcodeql\b/i,
  /\bsemgrep\b/i,
  /\btrivy\b/i,
  /\baquasec\b/i,
  /\bsast\b/i,
  /\bdast\b/i,
  /\bsecurity.?scan/i,
  /\bvulnerability.?scan/i,
  /\bdependency.?check/i,
  /\bowasp\b/i,
  /\bfortify\b/i,
  /\bveracode\b/i,
  /\bcheckmarx\b/i,
  /\bbandit\b/i,
  /\bbrakeman\b/i,
  /\bgosec\b/i,
  /\bnpm.?audit\b/i,
  /\byarn.?audit\b/i,
  /\bpip.?audit\b/i,
  /\bgithub.?actions.?security/i,
  /\bworkflows.*security/i,
  /\bci.*security/i,
];

// Patterns to detect automated dependency updates (Dependabot, Renovate)
const AUTOMATED_DEPENDENCY_PATTERNS = [
  /\bdependabot\b/i,
  /\brenovate\b/i,
  /\bbump\s+[\w@\/.-]+\s+from\s+[\d.]+\s+to\s+[\d.]+/i,
  /\bchore\(deps\)/i,
  /\bchore\(deps-dev\)/i,
  /\bupdate\s+dependency\b/i,
  /\bauto.?merge/i,
];

function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function getCommitRelevance(message: string, controlCode: string): "high" | "medium" | "low" {
  // Patching controls (E8-PA, E8-PO, A.8.8)
  if (["E8-PA", "E8-PO", "A.8.8"].includes(controlCode)) {
    if (matchesPatterns(message, AUTOMATED_DEPENDENCY_PATTERNS)) return "high";
    if (matchesPatterns(message, DEPENDENCY_PATTERNS)) return "high";
    if (matchesPatterns(message, INFRASTRUCTURE_PATTERNS)) return "medium";
    return "low";
  }

  // Security testing control (A.8.29)
  if (controlCode === "A.8.29") {
    if (matchesPatterns(message, CICD_SECURITY_PATTERNS)) return "high";
    if (matchesPatterns(message, TEST_PATTERNS)) return "high";
    if (matchesPatterns(message, SECURITY_PATTERNS)) return "medium";
    return "low";
  }

  // Security controls (A.8.28, A.8.26)
  if (["A.8.28", "A.8.26"].includes(controlCode)) {
    if (matchesPatterns(message, SECURITY_PATTERNS)) return "high";
    if (matchesPatterns(message, TEST_PATTERNS)) return "medium";
    return "low";
  }

  // Testing controls (A.8.33)
  if (controlCode === "A.8.33") {
    if (matchesPatterns(message, TEST_PATTERNS)) return "high";
    return "low";
  }

  // Outsourced development / third-party (A.8.30)
  if (controlCode === "A.8.30") {
    if (matchesPatterns(message, AUTOMATED_DEPENDENCY_PATTERNS)) return "high";
    if (matchesPatterns(message, DEPENDENCY_PATTERNS)) return "high";
    return "low";
  }

  // NIST CSF dependency/patching controls (CSF-PR.PS-05)
  if (controlCode === "CSF-PR.PS-05") {
    if (matchesPatterns(message, AUTOMATED_DEPENDENCY_PATTERNS)) return "high";
    if (matchesPatterns(message, DEPENDENCY_PATTERNS)) return "high";
    if (matchesPatterns(message, INFRASTRUCTURE_PATTERNS)) return "medium";
    return "low";
  }

  // NIST CSF log records / audit trail (CSF-PR.PS-04)
  if (controlCode === "CSF-PR.PS-04") {
    if (matchesPatterns(message, CICD_SECURITY_PATTERNS)) return "high";
    if (matchesPatterns(message, INFRASTRUCTURE_PATTERNS)) return "medium";
    return "medium";
  }

  // NIST CSF monitoring (CSF-DE.CM-09)
  if (controlCode === "CSF-DE.CM-09") {
    if (matchesPatterns(message, CICD_SECURITY_PATTERNS)) return "high";
    if (matchesPatterns(message, INFRASTRUCTURE_PATTERNS)) return "medium";
    return "low";
  }

  // NIST 800-53 flaw remediation (800-53-SI-2)
  if (controlCode === "800-53-SI-2") {
    if (matchesPatterns(message, AUTOMATED_DEPENDENCY_PATTERNS)) return "high";
    if (matchesPatterns(message, DEPENDENCY_PATTERNS)) return "high";
    if (matchesPatterns(message, SECURITY_PATTERNS)) return "medium";
    return "low";
  }

  // NIST 800-53 continuous monitoring (800-53-CA-7)
  if (controlCode === "800-53-CA-7") {
    if (matchesPatterns(message, CICD_SECURITY_PATTERNS)) return "high";
    if (matchesPatterns(message, TEST_PATTERNS)) return "high";
    if (matchesPatterns(message, INFRASTRUCTURE_PATTERNS)) return "medium";
    return "low";
  }

  // SOC 2 monitoring controls
  if (["SOC2-CC7.1", "SOC2-CC7.2"].includes(controlCode)) {
    if (matchesPatterns(message, CICD_SECURITY_PATTERNS)) return "high";
    if (matchesPatterns(message, INFRASTRUCTURE_PATTERNS)) return "medium";
    return "low";
  }

  // PCI DSS vulnerability controls
  if (["PCI-6.2", "PCI-6.4"].includes(controlCode)) {
    if (matchesPatterns(message, SECURITY_PATTERNS)) return "high";
    if (matchesPatterns(message, DEPENDENCY_PATTERNS)) return "high";
    if (matchesPatterns(message, CICD_SECURITY_PATTERNS)) return "high";
    return "low";
  }

  // GDPR records of processing (partial git evidence)
  if (controlCode === "GDPR-Art30") {
    if (matchesPatterns(message, SECURITY_PATTERNS)) return "high";
    return "medium";
  }

  // SOCI Act risk and hazard management (SOCI-PSO1)
  if (controlCode === "SOCI-PSO1") {
    if (/\brisk\b|\bhazard\b|\bincident\b|\bthreat\b|\bexposure\b/i.test(message)) return "high";
    if (matchesPatterns(message, SECURITY_PATTERNS)) return "medium";
    return "low";
  }

  // SOCI Act incident response (SOCI-PSO2)
  if (controlCode === "SOCI-PSO2") {
    if (
      /\bincident.?response\b|\brunbook\b|\bplaybook\b|\bescalation\b|\bpostmortem\b/i.test(message)
    )
      return "high";
    if (/\bincident\b|\bresponse\b|\brecovery\b/i.test(message)) return "medium";
    return "low";
  }

  // SOCI Act system security plan (SOCI-PSO3)
  if (controlCode === "SOCI-PSO3") {
    if (/\bsecurity.?plan\b|\bsecurity.?policy\b|\bssp\b|\bsystem.?security\b/i.test(message))
      return "high";
    if (matchesPatterns(message, SECURITY_PATTERNS)) return "medium";
    return "low";
  }

  // Default relevance for general commit evidence
  return "medium";
}

export async function getComplianceEvidence(
  orgId: string,
  options: ComplianceEvidenceOptions = {}
): Promise<{
  frameworks: { id: string; name: string; controlCount: number }[];
  controls: ControlEvidence[];
}> {
  try {
    const { dateFrom, dateTo, repositoryIds } = options;

    logger.info("getComplianceEvidence called", { orgId, repositoryIds });

    // Get all frameworks and controls
    const frameworks = await db.complianceFramework.findMany({
      include: {
        controls: true,
      },
    });

    logger.info("Frameworks fetched", { count: frameworks.length });

    // If no frameworks exist, try to seed them (only in production/if needed)
    if (frameworks.length === 0) {
      logger.warn("No compliance frameworks found in database. Frameworks need to be seeded.");
      logger.warn("Run 'npm run db:seed' to seed compliance frameworks and controls.");
      // Return empty result gracefully - don't crash the API
      return {
        frameworks: [],
        controls: [],
      };
    }

    // Build repository filter
    const repoWhere: Record<string, unknown> = { orgId, isActive: true };
    if (repositoryIds && repositoryIds.length > 0) {
      repoWhere.id = { in: repositoryIds };
    }

    // Build date filters
    const commitWhere: Record<string, unknown> = {};
    const prWhere: Record<string, unknown> = { state: "merged" };
    if (dateFrom || dateTo) {
      if (dateFrom) {
        commitWhere.committedAt = { gte: dateFrom };
        prWhere.mergedAt = { gte: dateFrom };
      }
      if (dateTo) {
        commitWhere.committedAt = {
          ...(commitWhere.committedAt as object),
          lte: dateTo,
        };
        prWhere.mergedAt = { ...(prWhere.mergedAt as object), lte: dateTo };
      }
    }

    logger.info("Fetching repositories", { orgId, repoWhere });
    // Get org's active repositories
    // Optimize query to reduce connection usage - fetch less data per repo
    const repositories = await db.repository.findMany({
      where: repoWhere,
      include: {
        commits: {
          where: commitWhere,
          orderBy: { committedAt: "desc" },
          take: 100, // Reduced from 200 to limit connection usage
        },
        pullRequests: {
          where: prWhere,
          include: {
            reviews: {
              where: { state: "APPROVED" },
            },
          },
          orderBy: { mergedAt: "desc" },
          take: 50, // Reduced from 100 to limit connection usage
        },
        branchProtections: {
          orderBy: { snapshotAt: "desc" },
          take: 1,
        },
        ciArtifacts: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        deploymentEnvironments: {
          orderBy: { syncedAt: "desc" },
        },
      },
    });

    logger.info("Repositories fetched", { count: repositories.length });

    // Fetch org membership events (separate query - not tied to repos)
    const membershipEvents = await db.orgMembershipEvent.findMany({
      where: { orgId },
      orderBy: { occurredAt: "desc" },
      take: 50,
    });

    // Create maps to track which repository each commit/PR belongs to
    const commitToRepo = new Map<string, { id: string; name: string; fullName: string }>();
    const prToRepo = new Map<string, { id: string; name: string; fullName: string }>();

    for (const repo of repositories) {
      for (const commit of repo.commits) {
        commitToRepo.set(commit.id, {
          id: repo.id,
          name: repo.name,
          fullName: repo.fullName,
        });
      }
      for (const pr of repo.pullRequests) {
        prToRepo.set(pr.id, {
          id: repo.id,
          name: repo.name,
          fullName: repo.fullName,
        });
      }
    }

    // Aggregate data
    const allCommits = repositories.flatMap((r) => r.commits);
    const allPRs = repositories.flatMap((r) => r.pullRequests);
    const allBranchProtections = repositories.flatMap((r) => r.branchProtections);
    const allCIArtifacts = repositories.flatMap((r) => r.ciArtifacts);
    const allDeploymentEnvironments = repositories.flatMap((r) => r.deploymentEnvironments);

    logger.info("Aggregated data", {
      commits: allCommits.length,
      prs: allPRs.length,
      branchProtections: allBranchProtections.length,
      ciArtifacts: allCIArtifacts.length,
      deploymentEnvironments: allDeploymentEnvironments.length,
      membershipEvents: membershipEvents.length,
    });

    // Categorize commits for smarter matching
    const dependencyCommits = allCommits.filter((c) =>
      matchesPatterns(c.message, DEPENDENCY_PATTERNS)
    );
    const infrastructureCommits = allCommits.filter((c) =>
      matchesPatterns(c.message, INFRASTRUCTURE_PATTERNS)
    );
    const securityCommits = allCommits.filter((c) => matchesPatterns(c.message, SECURITY_PATTERNS));
    const testCommits = allCommits.filter((c) => matchesPatterns(c.message, TEST_PATTERNS));
    // Signed commits provide strong evidence for authentication controls (A.5.17, E8-MFA)
    const signedCommits = allCommits.filter((c) => c.verified === true);
    // CI/CD security tool commits for security testing evidence
    const cicdSecurityCommits = allCommits.filter((c) =>
      matchesPatterns(c.message, CICD_SECURITY_PATTERNS)
    );
    // Automated dependency updates (Dependabot/Renovate)
    const automatedDependencyCommits = allCommits.filter((c) =>
      matchesPatterns(c.message, AUTOMATED_DEPENDENCY_PATTERNS)
    );

    // Controls that have limited Git evidence
    const LIMITED_EVIDENCE_CONTROLS = ["E8-MM", "E8-UAH", "GDPR-Art30"];

    // Map controls to evidence
    const controls: ControlEvidence[] = [];

    for (const framework of frameworks) {
      for (const control of framework.controls) {
        const evidence: EvidenceItem[] = [];
        let status: "has_evidence" | "partial" | "no_evidence" | "limited" = "no_evidence";
        let note: string | undefined;

        // Check if this control has limited Git evidence
        if (LIMITED_EVIDENCE_CONTROLS.includes(control.code)) {
          status = "limited";
          note =
            "This control requires supplementary evidence from endpoint management or configuration tools. Git evidence is limited.";
        }

        switch (control.evidenceType) {
          case "commit_history": {
            // Select commits based on control type
            let relevantCommits = allCommits;

            // Use more specific commits for certain controls
            if (["E8-PA", "A.8.8", "A.8.30"].includes(control.code)) {
              // Prioritize automated dependency updates (Dependabot/Renovate) then manual dependency updates
              relevantCommits =
                automatedDependencyCommits.length > 0
                  ? [...automatedDependencyCommits, ...dependencyCommits]
                  : dependencyCommits.length > 0
                    ? dependencyCommits
                    : allCommits;
            } else if (control.code === "E8-PO") {
              relevantCommits =
                infrastructureCommits.length > 0 ? infrastructureCommits : allCommits;
            } else if (["A.8.28", "A.8.26"].includes(control.code)) {
              relevantCommits =
                securityCommits.length > 0
                  ? [...securityCommits, ...allCommits.slice(0, 10)]
                  : allCommits;
            } else if (control.code === "A.8.29") {
              // Security testing - prioritize CI/CD security commits and test commits
              relevantCommits =
                cicdSecurityCommits.length > 0 || testCommits.length > 0
                  ? [...cicdSecurityCommits, ...testCommits, ...allCommits.slice(0, 10)]
                  : allCommits;
            } else if (control.code === "A.8.33") {
              relevantCommits =
                testCommits.length > 0 ? [...testCommits, ...allCommits.slice(0, 10)] : allCommits;
            } else if (["A.5.17", "E8-MFA"].includes(control.code)) {
              // Signed commits directly evidence developer authentication / MFA practices.
              // Use only signed commits when available so every evidence item is high relevance.
              relevantCommits = signedCommits.length > 0 ? signedCommits : allCommits;
            } else if (control.code === "SOCI-PSO1") {
              // Risk and hazard management: prioritize security and risk-related commits
              const riskCommits = allCommits.filter((c) =>
                /\brisk\b|\bhazard\b|\bthreat\b|\bexposure\b/i.test(c.message)
              );
              relevantCommits =
                riskCommits.length > 0
                  ? [...riskCommits, ...securityCommits, ...allCommits.slice(0, 5)]
                  : securityCommits.length > 0
                    ? [...securityCommits, ...allCommits.slice(0, 10)]
                    : allCommits;
            } else if (control.code === "SOCI-PSO2") {
              // Incident response: prioritize incident/runbook/playbook commits
              const irCommits = allCommits.filter((c) =>
                /\bincident.?response\b|\brunbook\b|\bplaybook\b|\bescalation\b|\bpostmortem\b|\bincident\b/i.test(
                  c.message
                )
              );
              relevantCommits =
                irCommits.length > 0
                  ? [...irCommits, ...securityCommits.slice(0, 5)]
                  : securityCommits.length > 0
                    ? securityCommits
                    : allCommits;
            } else if (control.code === "SOCI-PSO3") {
              // System security plan: prioritize security policy/plan commits
              const sspCommits = allCommits.filter((c) =>
                /\bsecurity.?plan\b|\bsecurity.?policy\b|\bssp\b|\bsystem.?security\b/i.test(
                  c.message
                )
              );
              relevantCommits =
                sspCommits.length > 0
                  ? [...sspCommits, ...securityCommits.slice(0, 10)]
                  : securityCommits.length > 0
                    ? securityCommits
                    : allCommits;
            }

            // Build evidence items
            for (const commit of relevantCommits.slice(0, 30)) {
              let relevance = getCommitRelevance(commit.message, control.code);

              // Signed commits are high relevance for auth controls
              if (["A.5.17", "E8-MFA"].includes(control.code) && commit.verified) {
                relevance = "high";
              }

              const signedNote = commit.verified
                ? ` [Signed: ${commit.verificationReason || "verified"}]`
                : "";

              const repoInfo = commitToRepo.get(commit.id);
              evidence.push({
                type: "commit",
                title: `Commit: ${commit.sha.slice(0, 7)}${commit.verified ? " ✓" : ""}`,
                description: commit.message.split("\n")[0].slice(0, 100) + signedNote,
                timestamp: commit.committedAt,
                url: commit.url || undefined,
                metadata: {
                  sha: commit.sha,
                  author: commit.authorName,
                  email: commit.authorEmail,
                  verified: commit.verified,
                  verificationReason: commit.verificationReason,
                },
                relevance,
                repositoryId: repoInfo?.id,
                repositoryName: repoInfo?.name,
                repositoryFullName: repoInfo?.fullName,
              });
            }

            // Determine status based on evidence quality
            const highRelevanceCount = evidence.filter((e) => e.relevance === "high").length;

            if (status !== "limited") {
              if (highRelevanceCount >= 3) {
                status = "has_evidence";
              } else if (evidence.length >= 10 || highRelevanceCount >= 1) {
                status = "partial";
              } else if (evidence.length > 0) {
                status = "partial";
              }
            }
            break;
          }

          case "pr_approvals": {
            // Merged PRs with approvals show change control
            const approvedPRs = allPRs.filter((pr) => pr.reviews.length > 0);

            for (const pr of approvedPRs.slice(0, 30)) {
              // Detect automated dependency PRs (Dependabot, Renovate)
              const authorLogin = pr.authorLogin || "";
              const isAutomatedDependency =
                authorLogin.includes("dependabot") ||
                authorLogin.includes("renovate") ||
                authorLogin === "dependabot[bot]" ||
                authorLogin === "renovate[bot]" ||
                matchesPatterns(pr.title, AUTOMATED_DEPENDENCY_PATTERNS);

              // Determine relevance
              let relevance: "high" | "medium" | "low" =
                pr.baseBranch === "main" || pr.baseBranch === "master" ? "high" : "medium";

              // Automated dependency PRs are highly relevant for certain controls
              if (isAutomatedDependency) {
                relevance = "high";
              }

              const automatedNote = isAutomatedDependency ? " [Automated]" : "";

              const prRepoInfo = prToRepo.get(pr.id);
              evidence.push({
                type: "pr",
                title: `PR #${pr.number}: ${pr.title.slice(0, 60)}`,
                description: `Approved by ${pr.reviews.map((r) => r.reviewerLogin).join(", ")}${automatedNote}`,
                timestamp: pr.mergedAt || pr.createdAt,
                url: pr.url || undefined,
                metadata: {
                  number: pr.number,
                  author: authorLogin,
                  approvers: pr.reviews.map((r) => r.reviewerLogin || "").filter(Boolean),
                  baseBranch: pr.baseBranch || "",
                  isAutomatedDependency,
                },
                relevance,
                repositoryId: prRepoInfo?.id,
                repositoryName: prRepoInfo?.name,
                repositoryFullName: prRepoInfo?.fullName,
              });
            }

            if (status !== "limited") {
              if (evidence.length >= 5) {
                status = "has_evidence";
              } else if (evidence.length > 0) {
                status = "partial";
              }
            }
            break;
          }

          case "branch_protection": {
            // Branch protection rules show access control
            const effectiveProtections = allBranchProtections.filter(
              (bp) => bp.requirePullRequest || bp.requiredApprovals > 0
            );

            for (const bp of effectiveProtections) {
              const repo = repositories.find((r) => r.id === bp.repoId);
              const protectionStrength = calculateProtectionStrength(bp);

              evidence.push({
                type: "branch_protection",
                title: `${repo?.fullName || "Unknown"}: ${bp.branch}`,
                description: buildProtectionDescription(bp),
                timestamp: bp.snapshotAt,
                metadata: {
                  branch: bp.branch,
                  requirePullRequest: bp.requirePullRequest,
                  requiredApprovals: bp.requiredApprovals,
                  dismissStaleReviews: bp.dismissStaleReviews,
                  requireCodeOwners: bp.requireCodeOwners,
                  enforceAdmins: bp.enforceAdmins,
                  requireStatusChecks: bp.requireStatusChecks,
                  protectionStrength,
                },
                relevance:
                  protectionStrength >= 4 ? "high" : protectionStrength >= 2 ? "medium" : "low",
                repositoryId: repo?.id,
                repositoryName: repo?.name,
                repositoryFullName: repo?.fullName,
              });
            }

            if (status !== "limited") {
              const hasStrongProtection = evidence.some((e) => e.relevance === "high");
              if (evidence.length > 0 && hasStrongProtection) {
                status = "has_evidence";
              } else if (evidence.length > 0) {
                status = "partial";
              }
            }
            break;
          }

          case "ai_governance": {
            // AI governance controls: map security commits, CI SARIF (adversarial testing),
            // SBOM (AI supply chain), and PR reviews (model review gates) as proxy evidence.
            // Most definitive evidence comes via uploaded policy docs (Phase 2 uploads).
            const aiPatterns = [
              /\bai\b|\bml\b|\bmodel\b|\bllm\b|\bgpt\b|\bgemini\b|\bclaude\b/i,
              /\bprompt.?injec/i,
              /\bdata.?poison/i,
              /\bmodel.?drift\b/i,
              /\bhallucin/i,
              /\bfine.?tun/i,
              /\bembedding/i,
              /\binference\b/i,
              /\bagent(ic)?\b/i,
              /\bsafeguard/i,
              /\bguardrail/i,
              /\bmoderation\b/i,
            ];

            const aiCommits = allCommits.filter((c) => aiPatterns.some((p) => p.test(c.message)));
            const aiCiArtifacts = allCIArtifacts.filter((a) =>
              /\bai\b|\bml\b|\bmodel\b|\bsafety\b/i.test(a.name)
            );
            const aiSboms = allCIArtifacts.filter((a) => a.artifactType === "sbom");

            for (const commit of [...aiCommits, ...allCommits.slice(0, 5)].slice(0, 20)) {
              const repoInfo = commitToRepo.get(commit.id);
              const isDirectlyRelevant = aiPatterns.some((p) => p.test(commit.message));
              evidence.push({
                type: "commit",
                title: `Commit: ${commit.sha.slice(0, 7)}`,
                description: commit.message.split("\n")[0].slice(0, 100),
                timestamp: commit.committedAt,
                url: commit.url || undefined,
                metadata: { sha: commit.sha, author: commit.authorName },
                relevance: isDirectlyRelevant ? "high" : "low",
                repositoryId: repoInfo?.id,
                repositoryName: repoInfo?.name,
                repositoryFullName: repoInfo?.fullName,
              });
            }

            for (const artifact of [...aiCiArtifacts, ...aiSboms].slice(0, 5)) {
              const repo = repositories.find((r) => r.id === artifact.repoId);
              evidence.push({
                type: "commit",
                title: `CI: ${artifact.name}`,
                description: `${artifact.artifactType.replace("_", " ")} - AI supply chain evidence`,
                timestamp: artifact.createdAt,
                metadata: { artifactType: artifact.artifactType, runId: artifact.runId },
                relevance: "medium",
                repositoryId: repo?.id,
                repositoryName: repo?.name,
                repositoryFullName: repo?.fullName,
              });
            }

            if (status !== "limited") {
              const highRelevance = evidence.filter((e) => e.relevance === "high").length;
              if (highRelevance >= 3) {
                status = "has_evidence";
              } else if (evidence.length > 0) {
                status = "partial";
              }
            }
            break;
          }
        }

        // =========================================================
        // Supplementary evidence from new signal sources (Phase 1)
        // These enrich controls regardless of primary evidence type.
        // =========================================================

        // CI Artifacts: security scans, SBOMs, test reports
        const ciControlCodes = [
          "A.8.29",
          "A.8.28",
          "A.8.26",
          "A.8.33", // Security testing, secure coding
          "CSF-DE.CM-09", // Continuous monitoring
          "SOC2-CC7.1",
          "SOC2-CC7.2", // System operations monitoring
          "800-53-SA-11", // Developer security testing
          "SOCI-PSO1", // SOCI: Hazard and risk management - security scans as evidence
          "SOCI-PSO3", // SOCI: System security plan - CI security artifacts
        ];
        if (ciControlCodes.includes(control.code) && allCIArtifacts.length > 0) {
          const sarifArtifacts = allCIArtifacts.filter((a) => a.artifactType === "sarif");
          const testArtifacts = allCIArtifacts.filter((a) => a.artifactType === "test_report");
          const coverageArtifacts = allCIArtifacts.filter((a) => a.artifactType === "coverage");

          for (const artifact of [...sarifArtifacts, ...testArtifacts, ...coverageArtifacts].slice(
            0,
            5
          )) {
            const repo = repositories.find((r) => r.id === artifact.repoId);
            evidence.push({
              type: "commit", // Use "commit" type for backward compat with existing UI
              title: `CI: ${artifact.name}`,
              description: `${artifact.artifactType.replace("_", " ")} from workflow run`,
              timestamp: artifact.createdAt,
              metadata: {
                artifactType: artifact.artifactType,
                runId: artifact.runId,
              },
              relevance: "high",
              repositoryId: repo?.id,
              repositoryName: repo?.name,
              repositoryFullName: repo?.fullName,
            });
          }

          // SBOM artifacts strengthen supply chain controls
          if (["A.8.30", "E8-PA"].includes(control.code)) {
            const sbomArtifacts = allCIArtifacts.filter((a) => a.artifactType === "sbom");
            for (const artifact of sbomArtifacts.slice(0, 3)) {
              const repo = repositories.find((r) => r.id === artifact.repoId);
              evidence.push({
                type: "commit",
                title: `SBOM: ${artifact.name}`,
                description: "Software Bill of Materials from CI pipeline",
                timestamp: artifact.createdAt,
                metadata: { artifactType: "sbom", runId: artifact.runId },
                relevance: "high",
                repositoryId: repo?.id,
                repositoryName: repo?.name,
                repositoryFullName: repo?.fullName,
              });
            }
          }

          // Upgrade status if CI evidence found
          if (status === "no_evidence" && evidence.length > 0) {
            status = "partial";
          } else if (
            status === "partial" &&
            evidence.filter((e) => e.relevance === "high").length >= 3
          ) {
            status = "has_evidence";
          }
        }

        // Deployment Environment Protection: segregation of duties evidence
        const envControlCodes = [
          "A.8.31",
          "A.8.32", // Environment separation, change management
          "SOC2-CC8.1", // Change management
          "800-53-CM-3",
          "800-53-CM-4", // Configuration change control
          "SOCI-PSO4", // SOCI: Access control to critical infrastructure - deployment gates
        ];
        if (envControlCodes.includes(control.code) && allDeploymentEnvironments.length > 0) {
          for (const env of allDeploymentEnvironments.slice(0, 5)) {
            const repo = repositories.find((r) => r.id === env.repoId);
            const hasReviewers = env.requireReviewers && env.reviewerCount > 0;
            evidence.push({
              type: "branch_protection",
              title: `Environment: ${env.name} (${repo?.fullName || "Unknown"})`,
              description: hasReviewers
                ? `${env.reviewerCount} required reviewer(s)${env.preventSelfReview ? ", no self-review" : ""}`
                : "No required reviewers",
              timestamp: env.syncedAt,
              metadata: {
                environmentName: env.name,
                requireReviewers: env.requireReviewers,
                reviewerCount: env.reviewerCount,
                preventSelfReview: env.preventSelfReview,
                branchPolicy: env.deploymentBranchPolicy,
              },
              relevance: hasReviewers ? "high" : "low",
              repositoryId: repo?.id,
              repositoryName: repo?.name,
              repositoryFullName: repo?.fullName,
            });
          }

          if (status === "no_evidence" && evidence.length > 0) {
            status = "partial";
          }
        }

        // Membership Events: access management evidence
        const accessControlCodes = [
          "A.5.15",
          "A.5.16",
          "A.5.18", // Access control, identity management
          "SOC2-CC6.1",
          "SOC2-CC6.2",
          "SOC2-CC6.3", // Logical access security
          "800-53-AC-2", // Account management
          "SOCI-PSO4", // SOCI Act: Access control to critical infrastructure
        ];
        if (accessControlCodes.includes(control.code) && membershipEvents.length > 0) {
          for (const event of membershipEvents.slice(0, 10)) {
            evidence.push({
              type: "commit", // Use "commit" for backward compat
              title: `Access: ${event.githubLogin} ${event.action}`,
              description: `GitHub org membership ${event.action}${event.role ? ` (${event.role})` : ""}`,
              timestamp: event.occurredAt,
              metadata: {
                githubLogin: event.githubLogin,
                action: event.action,
                role: event.role,
                previousRole: event.previousRole,
              },
              relevance: "high",
            });
          }

          if (status === "no_evidence" && evidence.length > 0) {
            status = "partial";
          } else if (status === "partial" && membershipEvents.length >= 3) {
            status = "has_evidence";
          }
        }

        // Sort evidence by relevance (high first)
        evidence.sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 };
          return (order[a.relevance || "low"] || 2) - (order[b.relevance || "low"] || 2);
        });

        controls.push({
          controlId: control.id,
          controlCode: control.code,
          controlTitle: control.title,
          controlDescription: control.description,
          frameworkName: framework.name,
          evidenceType: control.evidenceType,
          status,
          evidenceCount: evidence.length,
          evidence: evidence.slice(0, 15), // Top 15 most relevant
          note,
        });
      }
    }

    logger.info("Controls processed", { count: controls.length });

    return {
      frameworks: frameworks.map((f) => ({
        id: f.id,
        name: f.name,
        controlCount: f.controls.length,
      })),
      controls,
    };
  } catch (error) {
    logger.error("Error in getComplianceEvidence", error, { orgId });
    // Return empty result on error to prevent API from crashing
    return {
      frameworks: [],
      controls: [],
    };
  }
}

function calculateProtectionStrength(bp: {
  requirePullRequest: boolean;
  requiredApprovals: number;
  dismissStaleReviews: boolean;
  requireCodeOwners: boolean;
  enforceAdmins: boolean;
  requireStatusChecks: boolean;
}): number {
  let strength = 0;
  if (bp.requirePullRequest) strength += 1;
  if (bp.requiredApprovals >= 1) strength += 1;
  if (bp.requiredApprovals >= 2) strength += 1;
  if (bp.dismissStaleReviews) strength += 1;
  if (bp.requireCodeOwners) strength += 1;
  if (bp.enforceAdmins) strength += 1;
  if (bp.requireStatusChecks) strength += 1;
  return strength;
}

function buildProtectionDescription(bp: {
  requirePullRequest: boolean;
  requiredApprovals: number;
  dismissStaleReviews: boolean;
  requireCodeOwners: boolean;
  enforceAdmins: boolean;
  requireStatusChecks?: boolean;
}): string {
  const parts: string[] = [];
  if (bp.requirePullRequest) parts.push("Requires PR");
  if (bp.requiredApprovals > 0) parts.push(`${bp.requiredApprovals} approval(s) required`);
  if (bp.dismissStaleReviews) parts.push("Dismisses stale reviews");
  if (bp.requireCodeOwners) parts.push("Requires code owners");
  if (bp.enforceAdmins) parts.push("Enforces for admins");
  if (bp.requireStatusChecks) parts.push("Requires status checks");
  return parts.length > 0 ? parts.join(" • ") : "Basic protection enabled";
}

export function getEvidenceSummary(controls: ControlEvidence[]): EvidenceSummary {
  const total = controls.length;
  const withEvidence = controls.filter((c) => c.status === "has_evidence").length;
  const partial = controls.filter((c) => c.status === "partial").length;
  const limited = controls.filter((c) => c.status === "limited").length;
  const noEvidence = controls.filter((c) => c.status === "no_evidence").length;

  // Calculate score (limited counts as partial)
  // Handle division by zero when there are no controls
  const effectivePartial = partial + limited;
  const score = total > 0 ? Math.round(((withEvidence + effectivePartial * 0.5) / total) * 100) : 0;

  return {
    total,
    withEvidence,
    partial,
    limited,
    noEvidence,
    score,
  };
}

/**
 * Calculate per-framework compliance scores from evidence.
 *
 * Shared by the compliance score API, public report API, and cron snapshot logic.
 * Uses a Map for O(n) grouping instead of repeated O(n*m) filter calls.
 *
 * @param evidence - Evidence object returned by getComplianceEvidence
 * @returns Array of per-framework score breakdowns
 */
export function calculateFrameworkScores(evidence: {
  frameworks: Array<{ name: string }>;
  controls: ControlEvidence[];
}): Array<{ framework: string; score: number; total: number; withEvidence: number }> {
  // Pre-group controls by framework for O(n) instead of O(n*m) filtering
  const controlsByFramework = new Map<string, ControlEvidence[]>();
  for (const control of evidence.controls) {
    const existing = controlsByFramework.get(control.frameworkName) ?? [];
    existing.push(control);
    controlsByFramework.set(control.frameworkName, existing);
  }

  return evidence.frameworks.map((framework) => {
    const frameworkControls = controlsByFramework.get(framework.name) ?? [];
    const frameworkSummary = getEvidenceSummary(frameworkControls);
    return {
      framework: framework.name,
      score: frameworkSummary.score,
      total: frameworkSummary.total,
      withEvidence: frameworkSummary.withEvidence,
    };
  });
}
