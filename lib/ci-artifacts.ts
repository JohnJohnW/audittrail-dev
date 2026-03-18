/**
 * CI Artifact Processing
 *
 * Fetches and classifies CI/CD artifacts from GitHub Actions runs.
 * Stores structured summaries (not raw content) for compliance evidence.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getGitHubClientForOrg } from "@/lib/github";

/** Artifact type classification based on filename patterns */
const ARTIFACT_CLASSIFIERS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /sarif/i, type: "sarif" },
  { pattern: /sast|dast|security[_-]scan|codeql|semgrep|snyk/i, type: "sarif" },
  { pattern: /sbom|software[_-]bill|cyclonedx|spdx/i, type: "sbom" },
  { pattern: /junit|test[_-]result|test[_-]report|xunit|nunit/i, type: "test_report" },
  { pattern: /coverage|lcov|cobertura|jacoco/i, type: "coverage" },
];

/**
 * Classifies an artifact by its filename into a known type.
 */
export function classifyArtifact(name: string): string {
  for (const { pattern, type } of ARTIFACT_CLASSIFIERS) {
    if (pattern.test(name)) return type;
  }
  return "unknown";
}

/**
 * Processes artifacts from a completed GitHub Actions workflow run.
 *
 * Fetches the artifact list from the GitHub API, classifies each artifact,
 * and stores a summary record — does NOT download raw artifact content
 * (could be large/sensitive).
 */
export async function processWorkflowRunArtifacts(
  orgId: string,
  repoId: string,
  runId: string
): Promise<number> {
  const client = await getGitHubClientForOrg(orgId);
  if (!client) {
    logger.warn(`CI artifacts: no GitHub client for org ${orgId}`);
    return 0;
  }

  // Look up repo info for API calls
  const repo = await db.repository.findUnique({
    where: { id: repoId },
    select: { fullName: true },
  });
  if (!repo) return 0;

  const [owner, repoName] = repo.fullName.split("/");
  if (!owner || !repoName) return 0;

  let artifacts;
  try {
    artifacts = await client.getWorkflowRunArtifacts(owner, repoName, runId);
  } catch (error) {
    logger.error(`CI artifacts: failed to fetch artifacts for run ${runId}`, error);
    return 0;
  }

  let count = 0;
  for (const artifact of artifacts) {
    if (artifact.expired) continue;

    const artifactType = classifyArtifact(artifact.name);
    if (artifactType === "unknown") continue; // Only store classified artifacts

    try {
      await db.cIArtifact.upsert({
        where: {
          repoId_runId_artifactType: {
            repoId,
            runId,
            artifactType,
          },
        },
        update: {
          name: artifact.name,
          summary: buildArtifactSummary(artifact, artifactType),
          rawUrl: artifact.archive_download_url,
        },
        create: {
          repoId,
          orgId,
          runId,
          name: artifact.name,
          artifactType,
          summary: buildArtifactSummary(artifact, artifactType),
          rawUrl: artifact.archive_download_url,
        },
      });
      count++;
    } catch (error) {
      logger.error(`CI artifacts: error upserting artifact ${artifact.name}`, error);
    }
  }

  if (count > 0) {
    logger.info(`CI artifacts: stored ${count} artifacts for run ${runId} in ${repo.fullName}`);
  }

  return count;
}

/**
 * Builds a structured summary for a CI artifact.
 * This is the metadata we store — NOT the raw artifact content.
 */
function buildArtifactSummary(
  artifact: { name: string; size_in_bytes: number; created_at: string },
  artifactType: string
): { artifactName: string; artifactType: string; sizeBytes: number; detectedAt: string } {
  return {
    artifactName: artifact.name,
    artifactType,
    sizeBytes: artifact.size_in_bytes,
    detectedAt: artifact.created_at,
    // Richer summary would come from actually parsing the artifact content,
    // but we deliberately avoid downloading to protect sensitive data.
    // The presence of a classified artifact is itself evidence.
  };
}
