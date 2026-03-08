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
  commit_history: {
    summary: "No relevant commit activity detected",
    actions: [
      "Sync your repositories so Audit Trail can analyse recent commits",
      "Make sure commits include descriptive messages referencing the change type (fix, feat, security, patch)",
    ],
  },
  pr_approvals: {
    summary: "No pull request review activity detected",
    actions: [
      "Require all changes to go through pull requests rather than direct pushes",
      "Enable branch protection on your default branch to enforce PR reviews",
      "Ensure reviewers explicitly approve PRs before merging",
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

/**
 * Control-code → specific recommendations.
 * Keys must exactly match the codes in the compliance_controls table.
 */
const CONTROL_RECOMMENDATIONS: Record<string, GapRecommendation> = {
  // ─── ISO 27001 ─────────────────────────────────────────────────────────────
  "A.5.15": {
    summary: "No access control evidence",
    actions: [
      "Enable branch protection to restrict who can push directly to protected branches",
      "Configure a CODEOWNERS file to require approval from designated owners",
      "Restrict repository access to only the team members who need it",
    ],
  },
  "A.5.16": {
    summary: "No identity management evidence",
    actions: [
      "Enforce branch protection rules that require authenticated GitHub accounts to commit",
      "Enable signed commits (GPG) to tie commits to verified identities",
      "Audit your GitHub organisation members and remove stale accounts",
    ],
  },
  "A.5.17": {
    summary: "No authentication information management evidence",
    actions: [
      "Enable GPG commit signing so every commit is cryptographically tied to an authenticated identity",
      "Enforce MFA on all GitHub organisation members (Settings → Authentication security)",
      "Add branch protection rules that require signed commits",
    ],
  },
  "A.5.18": {
    summary: "No access rights management evidence",
    actions: [
      "Use GitHub team permissions to grant least-privilege access per repository",
      "Configure branch protection to limit who can merge or force-push",
      "Review and rotate access rights periodically — log the review as a commit in a policy repo",
    ],
  },
  "A.8.4": {
    summary: "No source code access control evidence",
    actions: [
      "Enable branch protection to restrict who can push directly to the default branch",
      "Require code owner review via a CODEOWNERS file in your repository",
      "Restrict repository visibility to only necessary team members",
    ],
  },
  "A.8.8": {
    summary: "No vulnerability patching activity detected",
    actions: [
      "Enable Dependabot on your GitHub repositories for automatic dependency updates",
      'Commit dependency updates with messages like "chore: update dependencies" or "fix: patch CVE-…"',
      "Run npm audit / yarn audit / pip-audit regularly and commit the fixes",
    ],
  },
  "A.8.9": {
    summary: "No configuration management evidence",
    actions: [
      "Commit infrastructure-as-code files (Terraform, Pulumi, CloudFormation, Ansible)",
      "Enforce branch protection so configuration file changes require review",
      "Add configuration validation steps to your CI pipeline",
    ],
  },
  "A.8.15": {
    summary: "No monitoring or logging evidence",
    actions: [
      "Add logging libraries (winston, pino, structlog) and commit their configuration",
      "Commit monitoring setup files (datadog.yaml, prometheus configs, etc.)",
      "Reference monitoring in CI pipelines or deployment scripts",
    ],
  },
  "A.8.16": {
    summary: "No monitoring activities evidence",
    actions: [
      "Add alert configuration files (PagerDuty, Grafana alerts, CloudWatch alarms) to your repo",
      "Commit scripts or workflows that check system health on a schedule",
      "Reference incident detection tooling in your CI/CD pipeline definitions",
    ],
  },
  "A.8.25": {
    summary: "No secure development lifecycle evidence",
    actions: [
      "Add security scanning to your CI pipeline (e.g. CodeQL, Snyk, Trivy)",
      'Include security-themed commit messages when patching vulnerabilities (e.g. "fix: patch CVE-…")',
      'Reference security fixes in PR descriptions (e.g. "fixes CVE-…")',
    ],
  },
  "A.8.26": {
    summary: "No application security requirements evidence",
    actions: [
      "Add a SECURITY.md file documenting your security requirements and responsible disclosure policy",
      "Use PR templates that include a security checklist for every change",
      "Add SAST scanning (CodeQL, Semgrep) to your CI pipeline with PR checks",
    ],
  },
  "A.8.27": {
    summary: "No secure architecture evidence",
    actions: [
      "Commit architecture decision records (ADRs) documenting security design choices",
      "Add threat model documentation to your repository",
      "Reference security architecture patterns in PR descriptions for significant changes",
    ],
  },
  "A.8.28": {
    summary: "No secure coding evidence",
    actions: [
      "Enable CodeQL or Semgrep on your repository for static analysis",
      "Require security-focused code review for PRs touching authentication or data handling",
      "Add a coding standards document (CONTRIBUTING.md) that includes security guidelines",
    ],
  },
  "A.8.29": {
    summary: "No security testing evidence",
    actions: [
      "Add automated security tests to your CI pipeline (SAST, dependency scanning, DAST)",
      "Reference penetration testing or security reviews in PR descriptions",
      "Commit test files that explicitly cover security scenarios (auth bypass, injection, etc.)",
    ],
  },
  "A.8.30": {
    summary: "No outsourced development evidence",
    actions: [
      "Require PR reviews for all third-party or contractor contributions",
      "Commit vendor assessment documentation or SLA agreements to a policy repository",
      "Add a CODEOWNERS file to enforce internal review on critical paths",
    ],
  },
  "A.8.31": {
    summary: "No environment separation evidence",
    actions: [
      "Use separate branches or repositories for development, staging, and production",
      "Commit environment-specific configuration files that demonstrate separation",
      "Enable branch protection on your production branch with stricter review requirements",
    ],
  },
  "A.8.32": {
    summary: "No change management evidence (pull requests with review)",
    actions: [
      "Enable branch protection requiring at least 1 PR review before merging",
      "Use PRs for all changes — each merged PR with a reviewer approval is direct evidence",
      "Add PR description templates to encourage documenting the reason for change",
    ],
  },
  "A.8.33": {
    summary: "No test information protection evidence",
    actions: [
      "Enforce branch protection on branches that contain test data",
      "Add .gitignore rules to prevent committing real data to test environments",
      "Commit test data masking or anonymisation scripts to your repository",
    ],
  },
  "A.8.34": {
    summary: "No audit testing protection evidence",
    actions: [
      "Create a dedicated branch or repository for audit activities with restricted write access",
      "Require PR approval from a security reviewer for any changes during audit periods",
      "Commit audit scope and methodology documentation to a protected repository",
    ],
  },

  // ─── Essential Eight ───────────────────────────────────────────────────────
  // Multiple DB codes per maturity level — all point to same recommendation
  "E8-1": {
    summary: "No application allowlisting / control evidence",
    actions: [
      "Commit configuration files that whitelist permitted applications or packages",
      "Add CI steps that enforce package lock files or use --frozen-lockfile",
      "Document allowed dependency sources in your CI pipeline",
    ],
  },
  "E8-AC": {
    summary: "No application allowlisting / control evidence",
    actions: [
      "Commit configuration files that whitelist permitted applications or packages",
      "Add CI steps that enforce package lock files or use --frozen-lockfile",
      "Document allowed dependency sources in your CI pipeline",
    ],
  },
  "E8-2": {
    summary: "No application patching activity detected",
    actions: [
      "Enable Dependabot alerts and auto-merge for patch-level updates",
      "Commit regular dependency bumps — each update is evidence of patch management",
      "Add a scheduled CI job that runs npm audit or pip-audit and fails on high-severity issues",
    ],
  },
  "E8-PA": {
    summary: "No application patching activity detected",
    actions: [
      "Enable Dependabot alerts and auto-merge for patch-level updates",
      "Commit regular dependency bumps — each update is evidence of patch management",
      "Add a scheduled CI job that runs npm audit or pip-audit and fails on high-severity issues",
    ],
  },
  "E8-4": {
    summary: "No admin privilege restriction evidence",
    actions: [
      "Configure branch protection rules that restrict force-push access",
      "Require CODEOWNERS approval for sensitive directories",
      "Add commits that configure least-privilege IAM roles or access policies",
    ],
  },
  "E8-RAP": {
    summary: "No admin privilege restriction evidence",
    actions: [
      "Configure branch protection rules that restrict force-push access",
      "Require CODEOWNERS approval for sensitive directories",
      "Add commits that configure least-privilege IAM roles or access policies",
    ],
  },
  "E8-5": {
    summary: "No OS/infrastructure patching evidence",
    actions: [
      "Commit updated Dockerfile base images (e.g. FROM node:20-alpine bumps)",
      "Update Terraform / Ansible configs that reference OS image versions",
      "Add a workflow that checks for outdated base images",
    ],
  },
  "E8-PO": {
    summary: "No OS/infrastructure patching evidence",
    actions: [
      "Commit updated Dockerfile base images (e.g. FROM node:20-alpine bumps)",
      "Update Terraform / Ansible configs that reference OS image versions",
      "Add a workflow that checks for outdated base images",
    ],
  },
  "E8-8": {
    summary: "No backup evidence in code",
    actions: [
      "Commit backup scripts or scheduled workflow files that run backups",
      "Add infrastructure-as-code definitions for backup policies (AWS Backup, GCP snapshots)",
      "Reference backup verification tests in your CI pipeline",
    ],
  },
  "E8-RB": {
    summary: "No backup evidence in code",
    actions: [
      "Commit backup scripts or scheduled workflow files that run backups",
      "Add infrastructure-as-code definitions for backup policies (AWS Backup, GCP snapshots)",
      "Reference backup verification tests in your CI pipeline",
    ],
  },
  "E8-MFA": {
    summary: "No multi-factor authentication evidence",
    actions: [
      "Enable GPG commit signing — signed commits provide direct evidence of authenticated authors",
      "Enforce MFA on all GitHub organisation members via Settings → Authentication security",
      "Add branch protection requiring signed commits",
    ],
  },

  // ─── NIST CSF 2.0 ─────────────────────────────────────────────────────────
  "CSF-GV.OC-03": {
    summary: "No legal and regulatory requirements evidence",
    actions: [
      "Add a compliance policy document to a repository (COMPLIANCE.md or docs/compliance/)",
      "Reference regulatory requirements in PR descriptions when making compliance-driven changes",
      "Commit records of regulatory review in a dedicated policy repository",
    ],
  },
  "CSF-PR.AA-05": {
    summary: "No access permissions management evidence",
    actions: [
      "Configure branch protection rules to restrict who can push or merge",
      "Add a CODEOWNERS file assigning responsibility for key directories",
      "Commit IAM policy files (AWS, GCP, Azure) that define least-privilege access",
    ],
  },
  "CSF-PR.PS-01": {
    summary: "No configuration management evidence",
    actions: [
      "Commit infrastructure-as-code files (Terraform, Pulumi, CloudFormation, Ansible)",
      "Add configuration files (.env.example, config.yaml) showing environment standards",
      "Use CI to validate that configuration files meet expected schemas",
    ],
  },
  "CSF-PR.PS-02": {
    summary: "No secure software development evidence",
    actions: [
      "Add SAST tools to your CI pipeline (CodeQL, SonarQube, Semgrep)",
      "Include security-focused PR reviews — approving reviews on security changes count as evidence",
      "Commit security policy files (SECURITY.md, .github/SECURITY.md)",
    ],
  },
  "CSF-PR.PS-04": {
    summary: "No log records evidence",
    actions: [
      "Commit logging configuration files (log4j, winston, structlog, etc.)",
      "Add centralised log shipping configuration (Datadog, Splunk, ELK stack) to your repo",
      "Reference log retention policies in your infrastructure-as-code",
    ],
  },
  "CSF-PR.PS-05": {
    summary: "No software and dependency management evidence",
    actions: [
      "Enable Dependabot or Renovate and commit the resulting dependency update PRs",
      "Add a software bill of materials (SBOM) generation step to your CI pipeline",
      "Commit and regularly update lock files (package-lock.json, poetry.lock, etc.)",
    ],
  },
  "CSF-DE.CM-09": {
    summary: "No continuous monitoring evidence",
    actions: [
      "Add a workflow that runs security scans on every push or PR",
      "Commit monitoring agent configuration (Datadog, Prometheus, CloudWatch)",
      "Set up GitHub Actions to alert on failed security checks",
    ],
  },

  // ─── NIST SP 800-53 ────────────────────────────────────────────────────────
  "800-53-AC-2": {
    summary: "No account management evidence",
    actions: [
      "Enable branch protection with required reviewers to restrict who can merge",
      "Commit IAM or access policy definitions that show account lifecycle management",
      "Document and commit your account provisioning / de-provisioning process",
    ],
  },
  "800-53-CA-7": {
    summary: "No continuous monitoring evidence",
    actions: [
      "Add scheduled CI/CD jobs that run security and compliance checks",
      "Commit monitoring configuration (Prometheus rules, CloudWatch alarms, etc.)",
      "Reference audit log exports or SIEM configuration in your repository",
    ],
  },
  "800-53-CM-3": {
    summary: "No configuration change control evidence",
    actions: [
      "Require all configuration changes to go through reviewed pull requests",
      "Enable branch protection on branches that contain configuration files",
      "Use PR templates that capture the reason for change and rollback plan",
    ],
  },
  "800-53-CM-4": {
    summary: "No security and privacy impact analysis evidence",
    actions: [
      "Add a security impact checklist to your PR template",
      "Require a security-team review on PRs that touch authentication, data handling, or infrastructure",
      "Commit privacy impact assessment (PIA) documents for significant feature changes",
    ],
  },
  "800-53-SA-10": {
    summary: "No developer configuration management evidence",
    actions: [
      "Store all build and deployment configuration in version control",
      "Enable branch protection on configuration branches",
      "Add CI validation that configuration files are syntactically correct before merging",
    ],
  },
  "800-53-SA-11": {
    summary: "No developer testing and evaluation evidence",
    actions: [
      "Add automated test suites to your CI pipeline that run on every PR",
      "Include security-focused test cases (auth, injection, data validation)",
      "Require a passing CI build before any PR can be merged",
    ],
  },
  "800-53-SI-2": {
    summary: "No flaw remediation evidence",
    actions: [
      "Enable Dependabot security alerts and commit their fixes promptly",
      "Reference CVE IDs in commit messages when patching known vulnerabilities",
      "Add automated vulnerability scanning (Trivy, Snyk) to your CI pipeline",
    ],
  },

  // ─── GDPR ─────────────────────────────────────────────────────────────────
  "GDPR-Art25": {
    summary: "No privacy-by-design evidence in code",
    actions: [
      "Commit data minimisation patterns (avoid logging PII, mask sensitive fields)",
      "Add privacy-related commit messages or PR descriptions referencing Art. 25",
      "Include data handling policy files in your repository",
    ],
  },
  "GDPR-Art32": {
    summary: "No security-of-processing evidence",
    actions: [
      "Add encryption configuration to your codebase (TLS configs, key management)",
      "Commit security review PRs that document risk assessments",
      "Add automated security scanning to your CI pipeline",
    ],
  },

  // ─── PCI DSS 4.0 ──────────────────────────────────────────────────────────
  "PCI-6.2": {
    summary: "No security vulnerability identification evidence",
    actions: [
      "Enable Dependabot security alerts on all payment-adjacent repositories",
      "Add automated vulnerability scanning (Trivy, Snyk, OWASP) to your CI pipeline",
      "Commit a vulnerability disclosure / tracking policy document",
    ],
  },
  "PCI-6.3": {
    summary: "No vulnerability management evidence",
    actions: [
      "Enable Dependabot security alerts and commit their fixes",
      "Add SAST/DAST scanning to your CI pipeline",
      "Reference CVE fixes in commit messages",
    ],
  },
  "PCI-6.4": {
    summary: "No web application protection evidence",
    actions: [
      "Commit WAF configuration (AWS WAF, Cloudflare rules) to your infrastructure repo",
      "Add security headers configuration to your application (HSTS, CSP, X-Frame-Options)",
      "Include DAST scanning in your CI pipeline targeting your web endpoints",
    ],
  },
  "PCI-7.2": {
    summary: "No access control for system components evidence",
    actions: [
      "Configure branch protection to restrict who can modify sensitive components",
      "Commit IAM policies that implement least-privilege access for system components",
      "Add a CODEOWNERS file for payment-related code paths",
    ],
  },
  "PCI-8.2": {
    summary: "No user identification and authentication evidence",
    actions: [
      "Enable GPG commit signing for all developers working on payment code",
      "Enforce branch protection with required reviewers on payment-related repositories",
      "Commit MFA enforcement policies and authentication configuration",
    ],
  },

  // ─── SOC 2 ────────────────────────────────────────────────────────────────
  "SOC2-CC6.1": {
    summary: "No logical access control evidence",
    actions: [
      "Enforce branch protection with required reviewers on your default branch",
      "Use signed commits (GPG) to demonstrate authenticated authorship",
      "Add CODEOWNERS to restrict sensitive directory modifications",
    ],
  },
  "SOC2-CC6.6": {
    summary: "No logical access security evidence",
    actions: [
      "Enable branch protection requiring PR reviews before any merge",
      "Restrict direct pushes to the default branch — all changes must go through PRs",
      "Configure CODEOWNERS to enforce appropriate access boundaries",
    ],
  },
  "SOC2-CC7.1": {
    summary: "No system component detection evidence",
    actions: [
      "Commit an SBOM (software bill of materials) generation step to your CI pipeline",
      "Add infrastructure discovery scripts or IaC that enumerates system components",
      "Reference asset inventory tooling configuration in your repository",
    ],
  },
  "SOC2-CC7.2": {
    summary: "No anomaly and threat monitoring evidence",
    actions: [
      "Add automated security scanning (CodeQL, Dependabot) that triggers on every push",
      "Commit alert rules for anomalous behaviour (unexpected auth failures, traffic spikes)",
      "Reference your SIEM or threat detection configuration in your infrastructure repo",
    ],
  },
  "SOC2-CC8.1": {
    summary: "No change management evidence",
    actions: [
      "All code changes should go through reviewed pull requests",
      "Enable branch protection with required approvals",
      "Use PR templates that capture the reason for change, testing done, and risk assessment",
    ],
  },

  // ─── SOCI Act ─────────────────────────────────────────────────────────────
  "SOCI-PSO1": {
    summary: "No hazard and risk management evidence",
    actions: [
      "Commit a risk register or risk assessment document to a policy repository",
      "Add PR templates that include a risk assessment section for significant changes",
      "Reference risk mitigation steps in commit messages or PR descriptions",
    ],
  },
  "SOCI-PSO2": {
    summary: "No incident response plan evidence",
    actions: [
      "Commit an incident response runbook to your repository (docs/incident-response.md)",
      "Add GitHub issue templates for security incidents and outages",
      "Reference incident response procedures in your CI/CD alerting configuration",
    ],
  },
  "SOCI-PSO3": {
    summary: "No system security plan evidence",
    actions: [
      "Commit a system security plan document to a protected repository",
      "Add branch protection on the repository containing security documentation",
      "Reference your system security plan in PRs that change security controls",
    ],
  },
  "SOCI-PSO4": {
    summary: "No access control evidence",
    actions: [
      "Configure branch protection to enforce review before merging",
      "Commit access control policies and CODEOWNERS files",
      "Add IAM policy definitions that implement least-privilege access",
    ],
  },
};

export interface GapPriority {
  /** Points added to overall compliance score if this gap is closed */
  scoreImpact: number;
  /** Implementation effort level */
  effort: "low" | "medium" | "high";
  /** Rough estimate of days to fix */
  daysToFix: number;
}

// Maps evidenceType → effort + days estimate
const EFFORT_BY_EVIDENCE_TYPE: Record<string, Pick<GapPriority, "effort" | "daysToFix">> = {
  branch_protection: { effort: "low", daysToFix: 1 },
  pr_approvals: { effort: "low", daysToFix: 2 },
  pr: { effort: "low", daysToFix: 2 },
  commit_history: { effort: "medium", daysToFix: 7 },
  ci: { effort: "medium", daysToFix: 5 },
};

/**
 * Returns a priority score for a compliance gap.
 * Partial controls count as half-improvement (0.5x scoreImpact).
 *
 * @param evidenceType - The control's evidence type
 * @param status - Current control status
 * @param totalControls - Total number of controls in scope (for score impact calculation)
 */
export function getGapPriority(
  evidenceType: string,
  status: "partial" | "no_evidence" | "limited",
  totalControls: number
): GapPriority {
  const perControlImpact = totalControls > 0 ? (1 / totalControls) * 100 : 0;
  // Partial only needs half the improvement to become "full"
  const scoreImpact = parseFloat(
    (status === "partial" ? perControlImpact * 0.5 : perControlImpact).toFixed(1)
  );

  const effortData = EFFORT_BY_EVIDENCE_TYPE[evidenceType] ?? { effort: "high", daysToFix: 14 };

  return { scoreImpact, ...effortData };
}

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

  // Prefix match (catches versioned variants)
  const prefixMatch = Object.keys(CONTROL_RECOMMENDATIONS).find(
    (key) => controlCode.startsWith(key) || key.startsWith(controlCode)
  );
  if (prefixMatch) {
    return CONTROL_RECOMMENDATIONS[prefixMatch];
  }

  // Fall back to evidence-type default
  return EVIDENCE_TYPE_DEFAULTS[evidenceType] || null;
}
