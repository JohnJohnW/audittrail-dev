import { db } from "./db";

export interface EvidenceItem {
  type: "commit" | "pr" | "review" | "branch_protection";
  title: string;
  description: string;
  timestamp: Date;
  url?: string;
  metadata: Record<string, any>;
}

export interface ControlEvidence {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string | null;
  frameworkName: string;
  evidenceType: string;
  status: "has_evidence" | "partial" | "no_evidence";
  evidenceCount: number;
  evidence: EvidenceItem[];
}

export interface ComplianceEvidenceOptions {
  dateFrom?: Date;
  dateTo?: Date;
  repositoryIds?: string[];
}

export async function getComplianceEvidence(
  orgId: string,
  options: ComplianceEvidenceOptions = {}
): Promise<{
  frameworks: { id: string; name: string; controlCount: number }[];
  controls: ControlEvidence[];
}> {
  const { dateFrom, dateTo, repositoryIds } = options;

  // Get all frameworks and controls
  const frameworks = await db.complianceFramework.findMany({
    include: {
      controls: true,
    },
  });

  // Build repository filter
  const repoWhere: any = { orgId, isActive: true };
  if (repositoryIds && repositoryIds.length > 0) {
    repoWhere.id = { in: repositoryIds };
  }

  // Build date filters
  const commitWhere: any = {};
  const prWhere: any = { state: "merged" };
  if (dateFrom || dateTo) {
    if (dateFrom) {
      commitWhere.committedAt = { gte: dateFrom };
      prWhere.mergedAt = { gte: dateFrom };
    }
    if (dateTo) {
      commitWhere.committedAt = { ...commitWhere.committedAt, lte: dateTo };
      prWhere.mergedAt = { ...prWhere.mergedAt, lte: dateTo };
    }
  }

  // Get org's active repositories
  const repositories = await db.repository.findMany({
    where: repoWhere,
    include: {
      commits: {
        where: commitWhere,
        orderBy: { committedAt: "desc" },
        take: 100,
      },
      pullRequests: {
        where: prWhere,
        include: {
          reviews: {
            where: { state: "APPROVED" },
          },
        },
        orderBy: { mergedAt: "desc" },
        take: 50,
      },
      branchProtections: {
        orderBy: { snapshotAt: "desc" },
        take: 1,
      },
    },
  });

  // Aggregate data
  const allCommits = repositories.flatMap((r) => r.commits);
  const allPRs = repositories.flatMap((r) => r.pullRequests);
  const allBranchProtections = repositories
    .flatMap((r) => r.branchProtections)
    .filter((bp) => bp.requirePullRequest || bp.requiredApprovals > 0);

  // Map controls to evidence
  const controls: ControlEvidence[] = [];

  for (const framework of frameworks) {
    for (const control of framework.controls) {
      const evidence: EvidenceItem[] = [];
      let status: "has_evidence" | "partial" | "no_evidence" = "no_evidence";

      switch (control.evidenceType) {
        case "commit_history":
          // Evidence: Regular commits show ongoing development and change tracking
          const recentCommits = allCommits.slice(0, 20);
          for (const commit of recentCommits) {
            evidence.push({
              type: "commit",
              title: `Commit: ${commit.sha.slice(0, 7)}`,
              description: commit.message.split("\n")[0].slice(0, 100),
              timestamp: commit.committedAt,
              url: commit.url || undefined,
              metadata: {
                sha: commit.sha,
                author: commit.authorName,
                email: commit.authorEmail,
              },
            });
          }
          status = evidence.length >= 10 ? "has_evidence" : evidence.length > 0 ? "partial" : "no_evidence";
          break;

        case "pr_approvals":
          // Evidence: Merged PRs with approvals show change control
          const approvedPRs = allPRs.filter((pr) => pr.reviews.length > 0);
          for (const pr of approvedPRs.slice(0, 20)) {
            evidence.push({
              type: "pr",
              title: `PR #${pr.number}: ${pr.title.slice(0, 60)}`,
              description: `Approved by ${pr.reviews.map((r) => r.reviewerLogin).join(", ")}`,
              timestamp: pr.mergedAt || pr.createdAt,
              url: pr.url || undefined,
              metadata: {
                number: pr.number,
                author: pr.authorLogin,
                approvers: pr.reviews.map((r) => r.reviewerLogin),
                baseBranch: pr.baseBranch,
              },
            });
          }
          status = evidence.length >= 5 ? "has_evidence" : evidence.length > 0 ? "partial" : "no_evidence";
          break;

        case "branch_protection":
          // Evidence: Branch protection rules show access control
          for (const bp of allBranchProtections) {
            const repo = repositories.find((r) => r.id === bp.repoId);
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
              },
            });
          }
          status = evidence.length > 0 ? "has_evidence" : "no_evidence";
          break;
      }

      controls.push({
        controlId: control.id,
        controlCode: control.code,
        controlTitle: control.title,
        controlDescription: control.description,
        frameworkName: framework.name,
        evidenceType: control.evidenceType,
        status,
        evidenceCount: evidence.length,
        evidence: evidence.slice(0, 10), // Limit to top 10 for display
      });
    }
  }

  return {
    frameworks: frameworks.map((f) => ({
      id: f.id,
      name: f.name,
      controlCount: f.controls.length,
    })),
    controls,
  };
}

function buildProtectionDescription(bp: {
  requirePullRequest: boolean;
  requiredApprovals: number;
  dismissStaleReviews: boolean;
  requireCodeOwners: boolean;
  enforceAdmins: boolean;
}): string {
  const parts: string[] = [];
  if (bp.requirePullRequest) parts.push("Requires PR");
  if (bp.requiredApprovals > 0) parts.push(`${bp.requiredApprovals} approval(s)`);
  if (bp.dismissStaleReviews) parts.push("Dismisses stale reviews");
  if (bp.requireCodeOwners) parts.push("Requires code owners");
  if (bp.enforceAdmins) parts.push("Enforces for admins");
  return parts.length > 0 ? parts.join(", ") : "Basic protection enabled";
}

export function getEvidenceSummary(controls: ControlEvidence[]) {
  const total = controls.length;
  const withEvidence = controls.filter((c) => c.status === "has_evidence").length;
  const partial = controls.filter((c) => c.status === "partial").length;
  const noEvidence = controls.filter((c) => c.status === "no_evidence").length;

  return {
    total,
    withEvidence,
    partial,
    noEvidence,
    score: Math.round(((withEvidence + partial * 0.5) / total) * 100),
  };
}
