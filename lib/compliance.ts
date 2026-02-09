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
      },
    });

    logger.info("Repositories fetched", { count: repositories.length });

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

    logger.info("Aggregated data", { 
      commits: allCommits.length, 
      prs: allPRs.length, 
      branchProtections: allBranchProtections.length 
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
    // Signed commits provide strong evidence for authentication controls
    // TODO: Use signedCommits for auth controls like A.5.17, E8-MFA
    const _signedCommits = allCommits.filter((c) => c.verified === true);
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
            relevantCommits = infrastructureCommits.length > 0 ? infrastructureCommits : allCommits;
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

/**
 * Enrich compliance controls with agent activity evidence.
 * Agent events are mapped to controls via their controlMappings field.
 */
export async function enrichWithAgentEvidence(
  orgId: string,
  controls: ControlEvidence[],
  options: ComplianceEvidenceOptions = {}
): Promise<ControlEvidence[]> {
  try {
    const dateFilter: Record<string, unknown> = {};
    if (options.dateFrom) dateFilter.gte = new Date(options.dateFrom);
    if (options.dateTo) dateFilter.lte = new Date(options.dateTo);

    const where: Record<string, unknown> = { orgId };
    if (Object.keys(dateFilter).length > 0) {
      where.timestamp = dateFilter;
    }

    const agentEvents = await db.agentEvent.findMany({
      where,
      select: {
        id: true,
        category: true,
        action: true,
        summary: true,
        riskLevel: true,
        riskScore: true,
        controlMappings: true,
        timestamp: true,
        session: {
          select: {
            externalId: true,
            agentFramework: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 500,
    });

    if (agentEvents.length === 0) return controls;

    logger.info("Enriching with agent evidence", { orgId, agentEventCount: agentEvents.length });

    // Build a map: controlCode -> evidence items
    const controlEvidenceMap = new Map<string, EvidenceItem[]>();

    for (const event of agentEvents) {
      const mappings = event.controlMappings as Array<{
        controlCode: string;
        controlTitle: string;
        frameworkName: string;
        relevance: string;
      }> | null;

      if (!mappings || !Array.isArray(mappings)) continue;

      for (const mapping of mappings) {
        const items = controlEvidenceMap.get(mapping.controlCode) || [];
        items.push({
          type: "agent_activity" as EvidenceItem["type"],
          title: `Agent: ${event.summary}`,
          description: `${event.session.agentFramework} agent action (${event.category}) — Risk: ${event.riskLevel}`,
          timestamp: event.timestamp,
          relevance: mapping.relevance as "high" | "medium" | "low",
          metadata: {
            category: event.category,
            action: event.action,
            riskLevel: event.riskLevel,
            riskScore: event.riskScore,
            agentFramework: event.session.agentFramework,
            sessionId: event.session.externalId,
          },
        });
        controlEvidenceMap.set(mapping.controlCode, items);
      }
    }

    // Merge agent evidence into existing controls
    return controls.map((control) => {
      const agentEvidence = controlEvidenceMap.get(control.controlCode) || [];
      if (agentEvidence.length === 0) return control;

      const mergedEvidence = [...control.evidence, ...agentEvidence]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);

      // Re-evaluate status with combined evidence
      const highRelevance = mergedEvidence.filter((e) => e.relevance === "high").length;
      let newStatus = control.status;
      if (control.status === "no_evidence" && mergedEvidence.length > 0) {
        newStatus = highRelevance >= 3 ? "has_evidence" : "partial";
      } else if (control.status === "partial" && highRelevance >= 3) {
        newStatus = "has_evidence";
      }

      return {
        ...control,
        evidence: mergedEvidence,
        evidenceCount: control.evidenceCount + agentEvidence.length,
        status: newStatus,
      };
    });
  } catch (error) {
    logger.error("Error enriching with agent evidence", error, { orgId });
    return controls; // Return unchanged on error
  }
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
  const score = total > 0 
    ? Math.round(((withEvidence + effectivePartial * 0.5) / total) * 100)
    : 0;

  return {
    total,
    withEvidence,
    partial,
    limited,
    noEvidence,
    score,
  };
}
