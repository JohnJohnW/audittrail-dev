/**
 * Gap Analysis — Actionable recommendations for controls with missing or weak evidence.
 *
 * For each control, provides a plain-language explanation of what Git activity
 * would generate evidence, so users know exactly what to do.
 */

export interface GapRecommendation {
  /** Short title for what's missing */
  summary: string;
  /** Ordered list of concrete actions to take */
  actions: string[];
}

// Evidence-type → generic fallback advice
const EVIDENCE_TYPE_DEFAULTS: Record<string, GapRecommendation> = {
  commit: {
    summary: "No relevant commit activity detected",
    actions: [
      "Sync your repositories so Audit Trail can analyse recent commits",
      "Make sure commits include descriptive messages referencing the change type (fix, feat, security, patch)",
    ],
  },
  pr: {
    summary: "No pull request activity detected",
    actions: [
      "Require all changes to go through pull requests rather than direct pushes",
      "Enable branch protection on your default branch to enforce PR reviews",
    ],
  },
  branch_protection: {
    summary: "Branch protection not configured",
    actions: [
      "Go to your repository Settings → Branches",
      "Add a protection rule for your default branch (main / master)",
      'Enable "Require a pull request before merging" with at least 1 approving review',
    ],
  },
  ci: {
    summary: "No CI/CD pipeline activity detected",
    actions: [
      "Add a GitHub Actions workflow (e.g. .github/workflows/ci.yml) that runs on every push",
      "Include automated tests, linting, and security scanning steps",
    ],
  },
};

// Control-code prefix → specific recommendations (more precise than evidence-type defaults)
const CONTROL_RECOMMENDATIONS: Record<string, GapRecommendation> = {
  // ISO 27001 — Change Management
  "A.8.32": {
    summary: "No change management evidence (pull requests with review)",
    actions: [
      "Enable branch protection requiring at least 1 PR review before merging",
      "Use PRs for all changes — each merged PR with a reviewer approval is direct evidence",
      "Add PR description templates to encourage documenting the reason for change",
    ],
  },
  // ISO 27001 — Access to source code
  "A.8.4": {
    summary: "No source code access control evidence",
    actions: [
      "Enable branch protection to restrict who can push directly to the default branch",
      "Require code owner review via a CODEOWNERS file in your repository",
      "Restrict repository visibility to only necessary team members",
    ],
  },
  // ISO 27001 — Secure development
  "A.8.25": {
    summary: "No secure development lifecycle evidence",
    actions: [
      "Add security scanning to your CI pipeline (e.g. CodeQL, Snyk, Trivy)",
      "Include security-themed commit messages when patching vulnerabilities",
      'Reference security fixes in PR descriptions (e.g. "fixes CVE-…")',
    ],
  },
  // ISO 27001 — Patch management
  "A.8.8": {
    summary: "No vulnerability patching activity detected",
    actions: [
      "Enable Dependabot on your GitHub repositories for automatic dependency updates",
      "Commit dependency updates with messages like `chore: update dependencies` or `fix: patch CVE-…`",
      "Run npm audit / yarn audit / pip-audit regularly and commit the fixes",
    ],
  },
  // ISO 27001 — Logging / monitoring
  "A.8.15": {
    summary: "No monitoring or logging evidence",
    actions: [
      "Add logging libraries (winston, pino, structlog) and commit their configuration",
      "Commit monitoring setup files (datadog.yaml, prometheus configs, etc.)",
      "Reference monitoring in CI pipelines or deployment scripts",
    ],
  },
  // Essential Eight — Application patching
  "E8-APP-PATCH": {
    summary: "No application patching activity detected",
    actions: [
      "Enable Dependabot alerts and auto-merge for patch-level updates",
      "Commit regular dependency bumps — each update is evidence of patch management",
      "Add a scheduled CI job that runs `npm audit` or `pip-audit` and fails on high-severity issues",
    ],
  },
  // Essential Eight — OS patching
  "E8-OS-PATCH": {
    summary: "No OS/infrastructure patching evidence",
    actions: [
      "Commit updated Dockerfile base images (e.g. `FROM node:20-alpine` bumps)",
      "Update Terraform / Ansible configs that reference OS image versions",
      "Add a workflow that checks for outdated base images",
    ],
  },
  // Essential Eight — Application control
  "E8-APP-CTRL": {
    summary: "No application allowlisting / control evidence",
    actions: [
      "Commit configuration files that whitelist permitted applications or packages",
      "Add CI steps that enforce package lock files or use --frozen-lockfile",
      "Document allowed dependency sources in your CI pipeline",
    ],
  },
  // Essential Eight — Restrict admin privileges
  "E8-ADMIN": {
    summary: "No admin privilege restriction evidence",
    actions: [
      "Configure branch protection rules that restrict force-push access",
      "Require CODEOWNERS approval for sensitive directories",
      "Add commits that configure least-privilege IAM roles or access policies",
    ],
  },
  // NIST CSF — Configuration management
  "PR.PS-01": {
    summary: "No configuration management evidence",
    actions: [
      "Commit infrastructure-as-code files (Terraform, Pulumi, CloudFormation, Ansible)",
      "Add configuration files (.env.example, config.yaml) showing environment standards",
      "Use CI to validate that configuration files meet expected schemas",
    ],
  },
  // NIST CSF — Software development security
  "PR.PS-02": {
    summary: "No secure software development evidence",
    actions: [
      "Add SAST tools to your CI pipeline (CodeQL, SonarQube, Semgrep)",
      "Include security-focused PR reviews — approving reviews on security changes count as evidence",
      "Commit security policy files (SECURITY.md, .github/SECURITY.md)",
    ],
  },
  // NIST CSF — Continuous monitoring
  "DE.CM-09": {
    summary: "No continuous monitoring evidence",
    actions: [
      "Add a workflow that runs security scans on every push or PR",
      "Commit monitoring agent configuration (Datadog, Prometheus, CloudWatch)",
      "Set up GitHub Actions to alert on failed security checks",
    ],
  },
  // SOC 2 — Access control
  "CC6.1": {
    summary: "No logical access control evidence",
    actions: [
      "Enforce branch protection with required reviewers on your default branch",
      "Use signed commits (GPG) to demonstrate authenticated authorship",
      "Add CODEOWNERS to restrict sensitive directory modifications",
    ],
  },
  // SOC 2 — Change management
  "CC8.1": {
    summary: "No change management evidence",
    actions: [
      "All code changes should go through reviewed pull requests",
      "Enable branch protection with required approvals",
      "Use PR templates that capture the reason for change, testing done, and risk assessment",
    ],
  },
  // GDPR — Privacy by design
  "GDPR-Art25": {
    summary: "No privacy-by-design evidence in code",
    actions: [
      "Commit data minimisation patterns (avoid logging PII, mask sensitive fields)",
      "Add privacy-related commit messages or PR descriptions referencing Art. 25",
      "Include data handling policy files in your repository",
    ],
  },
  // GDPR — Security of processing
  "GDPR-Art32": {
    summary: "No security-of-processing evidence",
    actions: [
      "Add encryption configuration to your codebase (TLS configs, key management)",
      "Commit security review PRs that document risk assessments",
      "Add automated security scanning to your CI pipeline",
    ],
  },
  // PCI DSS — Code review
  "PCI-6.4": {
    summary: "No code review evidence",
    actions: [
      "Require at least 1 approved review before merging any PR",
      "Configure CODEOWNERS for payment-related code paths",
      "Enable branch protection with dismiss stale reviews turned on",
    ],
  },
  // PCI DSS — Vulnerability management
  "PCI-6.3": {
    summary: "No vulnerability management evidence",
    actions: [
      "Enable Dependabot security alerts and commit their fixes",
      "Add SAST/DAST scanning to your CI pipeline",
      "Reference CVE fixes in commit messages",
    ],
  },
};

/**
 * Return an actionable recommendation for a control with missing or weak evidence.
 * Returns null for controls that already have full evidence.
 */
export function getGapRecommendation(
  controlCode: string,
  _frameworkName: string,
  evidenceType: string,
  status: "has_evidence" | "partial" | "no_evidence" | "limited"
): GapRecommendation | null {
  if (status === "has_evidence") return null;

  // Exact match first
  if (CONTROL_RECOMMENDATIONS[controlCode]) {
    return CONTROL_RECOMMENDATIONS[controlCode];
  }

  // Prefix match (e.g. "A.8.32" catches "A.8.32-something")
  const prefixMatch = Object.keys(CONTROL_RECOMMENDATIONS).find(
    (key) => controlCode.startsWith(key) || key.startsWith(controlCode)
  );
  if (prefixMatch) {
    return CONTROL_RECOMMENDATIONS[prefixMatch];
  }

  // Fall back to evidence-type default
  return EVIDENCE_TYPE_DEFAULTS[evidenceType] || null;
}
