import { db } from "./db";
import { logger } from "./logger";
import type {
  EvidenceItem,
  ControlEvidence,
  ControlEffectiveness,
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
            // Fetch ALL review states (not just APPROVED) to enable:
            // - Rubber-stamp detection (timing + empty body)
            // - CHANGES_REQUESTED cycle detection (shows genuine review)
            // - Operating effectiveness scoring per NIST SP 800-53A CM-3a
            reviews: true,
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

    // ─── Pre-compute effectiveness scores (NIST SP 800-53A Rev 5) ────────────
    // Computed once and cached per evidence type / control group to avoid
    // redundant calculation across controls that share the same evidence base.
    // Assessment methodology per SP 800-53A §2.4: examine + test methods.
    const prQualityEffect = assessPRQualityEffectiveness(allPRs);
    const branchProtectEffect = assessBranchProtectionEffectiveness(
      allBranchProtections,
      repositories
    );
    const commitQualityEffect = assessCommitQualityEffectiveness(allCommits);
    const depPatchEffect = assessDependencyPatchingEffectiveness(allPRs);

    /** Maps evidence type + optional control codes to the right assessment */
    const getControlEffectiveness = (
      evidenceType: string,
      controlCode: string
    ): ControlEffectiveness | undefined => {
      if (evidenceType === "pr_approvals" || evidenceType === "pr") {
        return prQualityEffect;
      }
      if (evidenceType === "branch_protection") {
        return branchProtectEffect;
      }
      if (["E8-PA", "E8-PO", "A.8.8", "800-53-SI-2", "CSF-PR.PS-05"].includes(controlCode)) {
        return depPatchEffect;
      }
      if (evidenceType === "commit_history") {
        return commitQualityEffect;
      }
      return undefined;
    };

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
    const LIMITED_EVIDENCE_CONTROLS = ["E8-MM", "E8-UAH"];

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
            const approvedPRs = allPRs.filter((pr) =>
              pr.reviews.some((r) => r.state === "APPROVED")
            );

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

              // Only list approved reviewers in description
              const approvers = pr.reviews
                .filter((r) => r.state === "APPROVED")
                .map((r) => r.reviewerLogin);

              const prRepoInfo = prToRepo.get(pr.id);
              evidence.push({
                type: "pr",
                title: `PR #${pr.number}: ${pr.title.slice(0, 60)}`,
                description: `Approved by ${approvers.join(", ")}${automatedNote}`,
                timestamp: pr.mergedAt || pr.createdAt,
                url: pr.url || undefined,
                metadata: {
                  number: pr.number,
                  author: authorLogin,
                  approvers: approvers.filter(Boolean),
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

          default: {
            // Unrecognised evidence type. No automated evidence available
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
          effectiveness: getControlEffectiveness(control.evidenceType, control.code),
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

// ============================================================
// Control Effectiveness Assessment: NIST SP 800-53A Rev 5
//
// Evaluates three dimensions per SP 800-53A §2.5:
//   1. Design adequacy  (examine method), weight: 0.3
//   2. Operating consistency (test method), weight: 0.5
//   3. Evidence quality (traceability/freshness), weight: 0.2
//
// Continuous monitoring approach per NIST SP 800-137 Rev 1.
// ============================================================

/** Regex to detect issue/ticket references in commit messages */
const ISSUE_REFERENCE_PATTERN = /(?:#\d+|(?:fixes|closes|resolves)\s+#\d+)/i;

/**
 * Categorise an effectiveness score into SP 800-53A determination language.
 * Thresholds follow SP 800-53A §2.5 guidance on degree of satisfaction.
 */
function categorizeEffectiveness(score: number): ControlEffectiveness["overallEffectiveness"] {
  if (score >= 75) return "effective";
  if (score >= 50) return "partially_effective";
  if (score >= 25) return "minimally_effective";
  return "not_effective";
}

type PRWithReviews = {
  id: string;
  number: number;
  title: string;
  baseBranch: string;
  authorLogin: string;
  createdAt: Date;
  mergedAt: Date | null;
  reviews: Array<{
    state: string;
    reviewerLogin: string;
    body: string | null;
    submittedAt: Date;
  }>;
};

/**
 * Assess PR review quality for change management controls.
 * Maps to: CM-3 (Configuration Change Control) · CM-4 (Impact Analyses)
 *
 * Rubber-stamp detection: a review is flagged when ALL of these apply:
 *   - Approved within 5 minutes of PR creation
 *   - Review body is absent or < 10 characters
 *   - No CHANGES_REQUESTED cycle was present
 *   - Only one approver
 * This indicates the reviewer did not actually read the change.
 */
function assessPRQualityEffectiveness(allPRs: PRWithReviews[]): ControlEffectiveness {
  // Focus on PRs targeting default branches (the change management risk surface)
  const mainBranchPRs = allPRs.filter(
    (pr) => pr.baseBranch === "main" || pr.baseBranch === "master"
  );

  if (mainBranchPRs.length === 0) {
    return {
      designScore: 0,
      operatingScore: 0,
      qualityScore: 0,
      overallScore: 0,
      overallEffectiveness: "not_effective",
      assessmentMethod: "examine",
      nistReference: "SP 800-53 Rev 5 CM-3 (Configuration Change Control) · CM-4 (Impact Analyses)",
      findings: [
        "No pull requests to default branch (main/master) detected",
        "All changes should go through reviewed pull requests per CM-3",
      ],
    };
  }

  const prsWithApproval = mainBranchPRs.filter((pr) =>
    pr.reviews.some((r) => r.state === "APPROVED")
  );
  const approvalRate = prsWithApproval.length / mainBranchPRs.length;

  // Analyse review quality for each approved PR
  let substantiveCount = 0;
  let rubberStampCount = 0;

  for (const pr of prsWithApproval) {
    const approvals = pr.reviews.filter((r) => r.state === "APPROVED");
    const hasMultipleApprovers = approvals.length >= 2;
    const hasChangesRequested = pr.reviews.some((r) => r.state === "CHANGES_REQUESTED");
    const hasSubstantiveBody = approvals.some((r) => r.body && r.body.trim().length > 30);

    // Find earliest approval and compute time from PR creation
    const firstApproval = approvals.reduce(
      (earliest: (typeof approvals)[0] | null, r) =>
        !earliest || r.submittedAt < earliest.submittedAt ? r : earliest,
      null
    );
    const minutesFromCreation = firstApproval
      ? (firstApproval.submittedAt.getTime() - pr.createdAt.getTime()) / (1000 * 60)
      : Infinity;

    const isRubberStamp =
      minutesFromCreation < 5 &&
      !hasSubstantiveBody &&
      !hasMultipleApprovers &&
      !hasChangesRequested;

    if (isRubberStamp) rubberStampCount++;
    else substantiveCount++;
  }

  // Operating score: % of default-branch PRs that had an approval
  const operatingScore = Math.round(approvalRate * 100);

  // Quality score: % of approved PRs that were substantive (not rubber stamps)
  const qualityScore =
    prsWithApproval.length > 0 ? Math.round((substantiveCount / prsWithApproval.length) * 100) : 0;

  // Design score: inferred from operating rate (no direct branch protection data here)
  const designScore =
    operatingScore >= 90 ? 90 : operatingScore >= 70 ? 70 : operatingScore >= 40 ? 45 : 20;

  const overallScore = Math.round(designScore * 0.3 + operatingScore * 0.5 + qualityScore * 0.2);

  const findings: string[] = [];
  if (rubberStampCount > 0) {
    findings.push(
      `${rubberStampCount} potential rubber-stamp review(s) detected (approved in <5 min with no substantive comment)`
    );
  }
  const unreviewedCount = mainBranchPRs.length - prsWithApproval.length;
  if (unreviewedCount > 0 && mainBranchPRs.length > 3) {
    findings.push(
      `${unreviewedCount}/${mainBranchPRs.length} default-branch PRs merged without any approval. Not consistent with CM-3`
    );
  }
  if (substantiveCount > 0) {
    findings.push(
      `${substantiveCount} substantive review(s) detected (SP 800-53A CM-3a assess: examine method satisfied)`
    );
  }
  if (operatingScore === 100 && rubberStampCount === 0) {
    findings.push("All default-branch PRs reviewed. CM-3 operating objective fully met");
  }

  return {
    designScore,
    operatingScore,
    qualityScore,
    overallScore,
    overallEffectiveness: categorizeEffectiveness(overallScore),
    assessmentMethod: "examine",
    nistReference: "SP 800-53 Rev 5 CM-3 (Configuration Change Control) · CM-4 (Impact Analyses)",
    findings,
  };
}

/**
 * Assess branch protection effectiveness for access control.
 * Maps to: AC-3 (Access Enforcement) · CM-3 (Configuration Change Control)
 *
 * Design score: average protection strength across protected repos (0–7 features → 0–100).
 * Operating score: % of repositories with default-branch protection enabled.
 * Quality score: % of repos with "strong" protection (≥4 of 7 features configured).
 */
function assessBranchProtectionEffectiveness(
  allBranchProtections: Array<{
    repoId: string;
    branch: string;
    requirePullRequest: boolean;
    requiredApprovals: number;
    dismissStaleReviews: boolean;
    requireCodeOwners: boolean;
    enforceAdmins: boolean;
    requireStatusChecks: boolean;
  }>,
  repositories: Array<{ id: string }>
): ControlEffectiveness {
  const repoCount = repositories.length;

  if (repoCount === 0) {
    return {
      designScore: 0,
      operatingScore: 0,
      qualityScore: 0,
      overallScore: 0,
      overallEffectiveness: "not_effective",
      assessmentMethod: "examine",
      nistReference:
        "SP 800-53 Rev 5 AC-3 (Access Enforcement) · CM-3 (Configuration Change Control)",
      findings: ["No repositories found in scope"],
    };
  }

  // Only default-branch protections (main/master) are the primary risk surface
  const defaultProtections = allBranchProtections.filter(
    (bp) => bp.branch === "main" || bp.branch === "master" || bp.branch === "develop"
  );

  const reposWithProtection = new Set(defaultProtections.map((bp) => bp.repoId));

  // Operating score: % of repos with any default-branch protection
  const operatingScore = Math.round((reposWithProtection.size / repoCount) * 100);

  // Design score: average protection strength across protected repos (normalised to 0-100)
  const strengths = defaultProtections.map((bp) => calculateProtectionStrength(bp));
  const avgStrength =
    strengths.length > 0 ? strengths.reduce((a, b) => a + b, 0) / strengths.length : 0;
  const designScore = Math.round((avgStrength / 7) * 100);

  // Quality score: % of repos with strong protection (≥4 features)
  const strongRepos = new Set(
    defaultProtections.filter((bp) => calculateProtectionStrength(bp) >= 4).map((bp) => bp.repoId)
  );
  const qualityScore = Math.round((strongRepos.size / repoCount) * 100);

  const overallScore = Math.round(designScore * 0.3 + operatingScore * 0.5 + qualityScore * 0.2);

  const findings: string[] = [];
  const unprotectedCount = repoCount - reposWithProtection.size;
  if (unprotectedCount > 0) {
    findings.push(
      `${unprotectedCount} repository(ies) lack branch protection on default branch. Direct push access not controlled (AC-3)`
    );
  }
  if (designScore < 57 && defaultProtections.length > 0) {
    findings.push(
      `Average protection strength: ${avgStrength.toFixed(1)}/7 features configured. Consider enabling dismiss-stale-reviews, enforce-admins, require-status-checks`
    );
  }
  if (strongRepos.size > 0) {
    findings.push(
      `${strongRepos.size}/${repoCount} repositor${strongRepos.size === 1 ? "y has" : "ies have"} strong branch protection (≥4 controls). SP 800-53A AC-3a examine objective met`
    );
  }
  if (operatingScore === 100 && designScore >= 57) {
    findings.push(
      "All repositories have default-branch protection with adequate strength. AC-3 operating objective satisfied"
    );
  }

  return {
    designScore,
    operatingScore,
    qualityScore,
    overallScore,
    overallEffectiveness: categorizeEffectiveness(overallScore),
    assessmentMethod: "examine",
    nistReference:
      "SP 800-53 Rev 5 AC-3 (Access Enforcement) · CM-3 (Configuration Change Control)",
    findings,
  };
}

/**
 * Assess commit quality and traceability for change management controls.
 * Maps to: SA-10 (Developer Config Mgmt) · CM-3 (Configuration Change Control)
 *
 * Operating score: % of commits with descriptive messages (>5 words).
 * Design score: % of commits with GPG/SSH signatures (identity assurance).
 * Quality score: weighted. Issue traceability (60%) + commit signing (40%).
 */
function assessCommitQualityEffectiveness(
  allCommits: Array<{
    message: string;
    verified: boolean;
  }>
): ControlEffectiveness {
  if (allCommits.length === 0) {
    return {
      designScore: 0,
      operatingScore: 0,
      qualityScore: 0,
      overallScore: 0,
      overallEffectiveness: "not_effective",
      assessmentMethod: "examine",
      nistReference:
        "SP 800-53 Rev 5 SA-10 (Developer Config Mgmt) · AU-3 (Content of Audit Records)",
      findings: ["No commit history found in scope"],
    };
  }

  // Sample the most recent 100 commits for efficiency
  const sample = allCommits.slice(0, 100);

  // Descriptive message: first line has > 5 words (excludes "fix", "WIP", "update")
  const descriptiveCount = sample.filter((c) => {
    const firstLine = c.message.split("\n")[0].trim();
    return firstLine.split(/\s+/).filter(Boolean).length > 5;
  }).length;

  // Issue references: links change to a tracked work item
  const issueRefCount = sample.filter((c) => ISSUE_REFERENCE_PATTERN.test(c.message)).length;

  // Signed commits: cryptographic identity assurance
  const signedCount = sample.filter((c) => c.verified).length;

  // Operating score: % of commits traceable (descriptive message)
  const operatingScore = Math.round((descriptiveCount / sample.length) * 100);

  // Design score: % signed (indicates a signing policy is in place)
  const designScore = Math.round((signedCount / sample.length) * 100);

  // Quality score: issue traceability + signing, weighted
  const qualityScore = Math.min(
    100,
    Math.round((issueRefCount / sample.length) * 60 + (signedCount / sample.length) * 40)
  );

  const overallScore = Math.round(designScore * 0.3 + operatingScore * 0.5 + qualityScore * 0.2);

  const findings: string[] = [];
  if (signedCount === 0) {
    findings.push(
      "No signed commits detected. GPG/SSH signing provides SP 800-53A IA-5 cryptographic authenticator evidence"
    );
  } else {
    findings.push(
      `${signedCount}/${sample.length} commits signed. Satisfies SP 800-53A IA-5 authenticator management (examine method)`
    );
  }
  if (issueRefCount > 0) {
    findings.push(
      `${issueRefCount}/${sample.length} commits reference issues/tickets. CM-3 traceability objective partially met`
    );
  } else {
    findings.push(
      "No commits reference issue trackers. Change traceability to approved work items is not evidenced (CM-3)"
    );
  }
  const poorMessages = sample.length - descriptiveCount;
  if (poorMessages > sample.length * 0.3) {
    findings.push(
      `${poorMessages}/${sample.length} commits have short/generic messages. Reduces AU-3 audit record quality`
    );
  }

  return {
    designScore,
    operatingScore,
    qualityScore,
    overallScore,
    overallEffectiveness: categorizeEffectiveness(overallScore),
    assessmentMethod: "examine",
    nistReference:
      "SP 800-53 Rev 5 SA-10 (Developer Config Mgmt) · CM-3 (Configuration Change Control) · AU-3 (Content of Audit Records)",
    findings,
  };
}

/**
 * Assess dependency management and patching effectiveness.
 * Maps to: SI-2 (Flaw Remediation) · RA-5 (Vulnerability Monitoring)
 *
 * Design score: presence of automated dependency management (Dependabot/Renovate).
 * Operating score: % of automated dependency PRs that were merged (not left open).
 * Quality score: time-to-patch velocity. SP 800-53A SI-2 benchmark is less than 7 days for critical.
 */
function assessDependencyPatchingEffectiveness(allPRs: PRWithReviews[]): ControlEffectiveness {
  // Automated dependency update PRs (Dependabot, Renovate)
  const depBotPRs = allPRs.filter(
    (pr) =>
      matchesPatterns(pr.title, AUTOMATED_DEPENDENCY_PATTERNS) ||
      pr.authorLogin.includes("dependabot") ||
      pr.authorLogin.includes("renovate")
  );

  if (depBotPRs.length === 0) {
    return {
      designScore: 0,
      operatingScore: 0,
      qualityScore: 0,
      overallScore: 0,
      overallEffectiveness: "not_effective",
      assessmentMethod: "examine_and_test",
      nistReference:
        "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · RA-5 (Vulnerability Monitoring) · SA-12 (Supply Chain Risk)",
      findings: [
        "No automated dependency update PRs detected (Dependabot or Renovate)",
        "Enable Dependabot security alerts in repository Settings → Security to automate SI-2 flaw remediation evidence",
      ],
    };
  }

  // Design score: 85 if automated tooling exists, 0 otherwise
  const designScore = 85;

  // Operating score: % of dependency PRs that were merged (not abandoned)
  const mergedDepPRs = depBotPRs.filter((pr) => pr.mergedAt !== null);
  const operatingScore = Math.round((mergedDepPRs.length / depBotPRs.length) * 100);

  // Quality score: time-to-patch velocity for merged PRs
  const patchTimes = mergedDepPRs
    .filter((pr): pr is PRWithReviews & { mergedAt: Date } => pr.mergedAt !== null)
    .map((pr) => (pr.mergedAt.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  let qualityScore = 50;
  const findings: string[] = [
    `${depBotPRs.length} automated dependency update PR(s) detected (${mergedDepPRs.length} merged)`,
  ];

  if (patchTimes.length > 0) {
    const avgDays = patchTimes.reduce((a, b) => a + b, 0) / patchTimes.length;
    const fastPatches = patchTimes.filter((d) => d <= 7).length;
    const slowPatches = patchTimes.filter((d) => d > 30).length;

    // Reward fast patches, penalise slow ones. Per SP 800-53A SI-2 time-bound remediation
    qualityScore = Math.max(
      0,
      Math.min(
        100,
        Math.round((fastPatches / patchTimes.length) * 100 - (slowPatches / patchTimes.length) * 50)
      )
    );

    findings.push(
      `Average time-to-patch: ${avgDays.toFixed(1)} days (SP 800-53A SI-2 benchmark: ≤7 days for effective flaw remediation)`
    );
    if (fastPatches > 0) {
      findings.push(
        `${fastPatches}/${patchTimes.length} patches merged within 7 days. SI-2 time objective met`
      );
    }
    if (slowPatches > 0) {
      findings.push(
        `${slowPatches} patch(es) took >30 days to merge. Review patch management process for SI-2 compliance`
      );
    }
  }

  const overallScore = Math.round(designScore * 0.3 + operatingScore * 0.5 + qualityScore * 0.2);

  return {
    designScore,
    operatingScore,
    qualityScore,
    overallScore,
    overallEffectiveness: categorizeEffectiveness(overallScore),
    assessmentMethod: "examine_and_test",
    nistReference:
      "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · RA-5 (Vulnerability Monitoring) · SA-12 (Supply Chain Risk)",
    findings,
  };
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
