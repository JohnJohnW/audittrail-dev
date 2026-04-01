/**
 * Gap Analysis - Actionable recommendations for controls with missing or weak evidence.
 *
 * For each control, provides a plain-language explanation of what Git activity
 * would generate evidence, so users know exactly what to do.
 */

export interface GapRecommendation {
  /** Short title for what's missing */
  summary: string;
  /** Ordered list of concrete actions to take */
  actions: string[];
  /**
   * Authoritative NIST SP 800-53 Rev 5 control reference.
   * Grounds each recommendation in the control catalog used by SP 800-53A assessors.
   */
  nistReference?: string;
  /**
   * NIST SP 800-53A assessment procedure citation.
   * Identifies the specific assessment objective this gap relates to.
   */
  assessmentProcedure?: string;
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
    nistReference: "SP 800-53 Rev 5 AC-2 (Account Management) · AC-3 (Access Enforcement)",
    assessmentProcedure:
      "SP 800-53A AC-2a, AC-3a: examine access control policies and account management procedures",
  },
  "A.5.16": {
    summary: "No identity management evidence",
    actions: [
      "Enforce branch protection rules that require authenticated GitHub accounts to commit",
      "Enable signed commits (GPG) to tie commits to verified identities",
      "Audit your GitHub organisation members and remove stale accounts",
    ],
    nistReference:
      "SP 800-53 Rev 5 IA-2 (Identification and Authentication) · IA-4 (Identifier Management)",
    assessmentProcedure:
      "SP 800-53A IA-2a, IA-4a: examine identification and authentication mechanisms",
  },
  "A.5.17": {
    summary: "No authentication information management evidence",
    actions: [
      "Enable GPG commit signing so every commit is cryptographically tied to an authenticated identity",
      "Enforce MFA on all GitHub organisation members (Settings → Authentication security)",
      "Add branch protection rules that require signed commits",
    ],
    nistReference: "SP 800-53 Rev 5 IA-5 (Authenticator Management) · IA-3 (Device Identification)",
    assessmentProcedure:
      "SP 800-53A IA-5a: examine authenticator management procedures; test authenticator enforcement mechanisms",
  },
  "A.5.18": {
    summary: "No access rights management evidence",
    actions: [
      "Use GitHub team permissions to grant least-privilege access per repository",
      "Configure branch protection to limit who can merge or force-push",
      "Review and rotate access rights periodically. Log the review as a commit in a policy repo",
    ],
    nistReference: "SP 800-53 Rev 5 AC-2 (Account Management) · AC-6 (Least Privilege)",
    assessmentProcedure:
      "SP 800-53A AC-2e, AC-6a: examine access rights assignment and least-privilege enforcement",
  },
  "A.8.4": {
    summary: "No source code access control evidence",
    actions: [
      "Enable branch protection to restrict who can push directly to the default branch",
      "Require code owner review via a CODEOWNERS file in your repository",
      "Restrict repository visibility to only necessary team members",
    ],
    nistReference: "SP 800-53 Rev 5 AC-3 (Access Enforcement) · AC-6 (Least Privilege)",
    assessmentProcedure:
      "SP 800-53A AC-3a: examine access enforcement mechanisms for source code repositories",
  },
  "A.8.8": {
    summary: "No vulnerability patching activity detected",
    actions: [
      "Enable Dependabot on your GitHub repositories for automatic dependency updates",
      'Commit dependency updates with messages like "chore: update dependencies" or "fix: patch CVE-…"',
      "Run npm audit / yarn audit / pip-audit regularly and commit the fixes",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · RA-5 (Vulnerability Monitoring)",
    assessmentProcedure:
      "SP 800-53A SI-2a: examine flaw remediation procedures; test that identified flaws are remediated within organisation-defined time periods",
  },
  "A.8.9": {
    summary: "No configuration management evidence",
    actions: [
      "Commit infrastructure-as-code files (Terraform, Pulumi, CloudFormation, Ansible)",
      "Enforce branch protection so configuration file changes require review",
      "Add configuration validation steps to your CI pipeline",
    ],
    nistReference: "SP 800-53 Rev 5 CM-6 (Configuration Settings) · CM-2 (Baseline Configuration)",
    assessmentProcedure:
      "SP 800-53A CM-6a: examine configuration settings documentation and baseline configuration records",
  },
  "A.8.15": {
    summary: "No monitoring or logging evidence",
    actions: [
      "Add logging libraries (winston, pino, structlog) and commit their configuration",
      "Commit monitoring setup files (datadog.yaml, prometheus configs, etc.)",
      "Reference monitoring in CI pipelines or deployment scripts",
    ],
    nistReference: "SP 800-53 Rev 5 AU-2 (Event Logging) · AU-3 (Content of Audit Records)",
    assessmentProcedure:
      "SP 800-53A AU-2a: examine audit and accountability policies; test that auditable events are logged",
  },
  "A.8.16": {
    summary: "No monitoring activities evidence",
    actions: [
      "Add alert configuration files (PagerDuty, Grafana alerts, CloudWatch alarms) to your repo",
      "Commit scripts or workflows that check system health on a schedule",
      "Reference incident detection tooling in your CI/CD pipeline definitions",
    ],
    nistReference: "SP 800-53 Rev 5 SI-4 (System Monitoring) · CA-7 (Continuous Monitoring)",
    assessmentProcedure:
      "SP 800-53A SI-4a: examine monitoring policies; test that monitoring mechanisms detect anomalous activity",
  },
  "A.8.25": {
    summary: "No secure development lifecycle evidence",
    actions: [
      "Add security scanning to your CI pipeline (e.g. CodeQL, Snyk, Trivy)",
      'Include security-themed commit messages when patching vulnerabilities (e.g. "fix: patch CVE-…")',
      'Reference security fixes in PR descriptions (e.g. "fixes CVE-…")',
    ],
    nistReference:
      "SP 800-53 Rev 5 SA-15 (Development Process) · SA-11 (Developer Security Testing)",
    assessmentProcedure:
      "SP 800-53A SA-15a: examine development process documentation; test that security requirements are integrated into the SDLC",
  },
  "A.8.26": {
    summary: "No application security requirements evidence",
    actions: [
      "Add a SECURITY.md file documenting your security requirements and responsible disclosure policy",
      "Use PR templates that include a security checklist for every change",
      "Add SAST scanning (CodeQL, Semgrep) to your CI pipeline with PR checks",
    ],
    nistReference:
      "SP 800-53 Rev 5 SA-15 (Development Process) · SA-8 (Security Engineering Principles)",
    assessmentProcedure:
      "SP 800-53A SA-15a: examine security requirements documentation embedded in development processes",
  },
  "A.8.27": {
    summary: "No secure architecture evidence",
    actions: [
      "Commit architecture decision records (ADRs) documenting security design choices",
      "Add threat model documentation to your repository",
      "Reference security architecture patterns in PR descriptions for significant changes",
    ],
    nistReference: "SP 800-53 Rev 5 SA-8 (Security Engineering Principles)",
    assessmentProcedure:
      "SP 800-53A SA-8a: examine security engineering principles applied to system design",
  },
  "A.8.28": {
    summary: "No secure coding evidence",
    actions: [
      "Enable CodeQL or Semgrep on your repository for static analysis",
      "Require security-focused code review for PRs touching authentication or data handling",
      "Add a coding standards document (CONTRIBUTING.md) that includes security guidelines",
    ],
    nistReference:
      "SP 800-53 Rev 5 SA-11 (Developer Security Testing) · SI-10 (Information Input Validation)",
    assessmentProcedure:
      "SP 800-53A SA-11a: examine developer security testing and evaluation plan; test that SAST tools are integrated into CI",
  },
  "A.8.29": {
    summary: "No security testing evidence",
    actions: [
      "Add automated security tests to your CI pipeline (SAST, dependency scanning, DAST)",
      "Reference penetration testing or security reviews in PR descriptions",
      "Commit test files that explicitly cover security scenarios (auth bypass, injection, etc.)",
    ],
    nistReference:
      "SP 800-53 Rev 5 SA-11 (Developer Security Testing) · CA-2 (Control Assessments)",
    assessmentProcedure:
      "SP 800-53A SA-11a,b: examine security testing plans and results; test that automated scanning runs on every PR",
  },
  "A.8.30": {
    summary: "No outsourced development evidence",
    actions: [
      "Require PR reviews for all third-party or contractor contributions",
      "Commit vendor assessment documentation or SLA agreements to a policy repository",
      "Add a CODEOWNERS file to enforce internal review on critical paths",
    ],
    nistReference: "SP 800-53 Rev 5 SA-4 (Acquisition Process) · SR-3 (Supply Chain Controls)",
    assessmentProcedure:
      "SP 800-53A SA-4a: examine acquisition contracts for security requirements; test that third-party code changes go through review",
  },
  "A.8.31": {
    summary: "No environment separation evidence",
    actions: [
      "Use separate branches or repositories for development, staging, and production",
      "Commit environment-specific configuration files that demonstrate separation",
      "Enable branch protection on your production branch with stricter review requirements",
    ],
    nistReference: "SP 800-53 Rev 5 CM-2 (Baseline Configuration) · SC-7 (Boundary Protection)",
    assessmentProcedure:
      "SP 800-53A CM-2a: examine baseline configuration documentation showing environment separation",
  },
  "A.8.32": {
    summary: "No change management evidence (pull requests with review)",
    actions: [
      "Enable branch protection requiring at least 1 PR review before merging",
      "Use PRs for all changes. Each merged PR with a reviewer approval is direct evidence",
      "Add PR description templates to encourage documenting the reason for change",
    ],
    nistReference: "SP 800-53 Rev 5 CM-3 (Configuration Change Control) · CM-4 (Impact Analyses)",
    assessmentProcedure:
      "SP 800-53A CM-3a: examine change control procedures; test that all changes to production go through an authorised review process",
  },
  "A.8.33": {
    summary: "No test information protection evidence",
    actions: [
      "Enforce branch protection on branches that contain test data",
      "Add .gitignore rules to prevent committing real data to test environments",
      "Commit test data masking or anonymisation scripts to your repository",
    ],
    nistReference: "SP 800-53 Rev 5 SA-11 (Developer Security Testing) · MP-2 (Media Access)",
    assessmentProcedure:
      "SP 800-53A SA-11b: examine test data protection procedures and test environment configuration",
  },
  "A.8.34": {
    summary: "No audit testing protection evidence",
    actions: [
      "Create a dedicated branch or repository for audit activities with restricted write access",
      "Require PR approval from a security reviewer for any changes during audit periods",
      "Commit audit scope and methodology documentation to a protected repository",
    ],
    nistReference:
      "SP 800-53 Rev 5 AU-9 (Protection of Audit Information) · AU-12 (Audit Record Generation)",
    assessmentProcedure:
      "SP 800-53A AU-9a: examine audit protection mechanisms; test that audit records cannot be modified by non-privileged users",
  },

  // ─── Essential Eight ───────────────────────────────────────────────────────
  // Multiple DB codes per maturity level - all point to same recommendation
  "E8-1": {
    summary: "No application allowlisting / control evidence",
    actions: [
      "Commit configuration files that whitelist permitted applications or packages",
      "Add CI steps that enforce package lock files or use --frozen-lockfile",
      "Document allowed dependency sources in your CI pipeline",
    ],
    nistReference:
      "SP 800-53 Rev 5 CM-7 (Least Functionality) · CM-10 (Software Usage Restrictions)",
    assessmentProcedure:
      "SP 800-53A CM-7a: examine configuration management policies; test that only authorised software components can be included",
  },
  "E8-AC": {
    summary: "No application allowlisting / control evidence",
    actions: [
      "Commit configuration files that whitelist permitted applications or packages",
      "Add CI steps that enforce package lock files or use --frozen-lockfile",
      "Document allowed dependency sources in your CI pipeline",
    ],
    nistReference:
      "SP 800-53 Rev 5 CM-7 (Least Functionality) · CM-10 (Software Usage Restrictions)",
    assessmentProcedure:
      "SP 800-53A CM-7a: examine configuration management policies; test that only authorised software components can be included",
  },
  "E8-2": {
    summary: "No application patching activity detected",
    actions: [
      "Enable Dependabot alerts and auto-merge for patch-level updates",
      "Commit regular dependency bumps. Each update is evidence of patch management",
      "Add a scheduled CI job that runs npm audit or pip-audit and fails on high-severity issues",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · SA-12 (Supply Chain Risk)",
    assessmentProcedure:
      "SP 800-53A SI-2a,b: examine flaw remediation procedures; test that patches are applied within organisation-defined time periods",
  },
  "E8-PA": {
    summary: "No application patching activity detected",
    actions: [
      "Enable Dependabot alerts and auto-merge for patch-level updates",
      "Commit regular dependency bumps. Each update is evidence of patch management",
      "Add a scheduled CI job that runs npm audit or pip-audit and fails on high-severity issues",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · RA-5 (Vulnerability Monitoring)",
    assessmentProcedure:
      "SP 800-53A SI-2a,b: examine flaw remediation procedures; test that patches are applied within organisation-defined time periods",
  },
  "E8-4": {
    summary: "No admin privilege restriction evidence",
    actions: [
      "Configure branch protection rules that restrict force-push access",
      "Require CODEOWNERS approval for sensitive directories",
      "Add commits that configure least-privilege IAM roles or access policies",
    ],
    nistReference: "SP 800-53 Rev 5 AC-6 (Least Privilege) · AC-2 (Account Management)",
    assessmentProcedure:
      "SP 800-53A AC-6a: examine least privilege policies; test that privileged access is restricted to only required functions",
  },
  "E8-RAP": {
    summary: "No admin privilege restriction evidence",
    actions: [
      "Configure branch protection rules that restrict force-push access",
      "Require CODEOWNERS approval for sensitive directories",
      "Add commits that configure least-privilege IAM roles or access policies",
    ],
    nistReference: "SP 800-53 Rev 5 AC-6 (Least Privilege) · AC-2 (Account Management)",
    assessmentProcedure:
      "SP 800-53A AC-6a: examine least privilege policies; test that privileged access is restricted to only required functions",
  },
  "E8-5": {
    summary: "No OS/infrastructure patching evidence",
    actions: [
      "Commit updated Dockerfile base images (e.g. FROM node:20-alpine bumps)",
      "Update Terraform / Ansible configs that reference OS image versions",
      "Add a workflow that checks for outdated base images",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · CM-6 (Configuration Settings)",
    assessmentProcedure:
      "SP 800-53A SI-2a: examine OS/infrastructure patching procedures; test that base images and OS packages are kept up to date",
  },
  "E8-PO": {
    summary: "No OS/infrastructure patching evidence",
    actions: [
      "Commit updated Dockerfile base images (e.g. FROM node:20-alpine bumps)",
      "Update Terraform / Ansible configs that reference OS image versions",
      "Add a workflow that checks for outdated base images",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · CM-6 (Configuration Settings)",
    assessmentProcedure:
      "SP 800-53A SI-2a: examine OS/infrastructure patching procedures; test that base images and OS packages are kept up to date",
  },
  "E8-8": {
    summary: "No backup evidence in code",
    actions: [
      "Commit backup scripts or scheduled workflow files that run backups",
      "Add infrastructure-as-code definitions for backup policies (AWS Backup, GCP snapshots)",
      "Reference backup verification tests in your CI pipeline",
    ],
    nistReference: "SP 800-53 Rev 5 CP-9 (System Backup) · CP-10 (System Recovery)",
    assessmentProcedure:
      "SP 800-53A CP-9a: examine backup policies; test that backups are created and verified on schedule",
  },
  "E8-RB": {
    summary: "No backup evidence in code",
    actions: [
      "Commit backup scripts or scheduled workflow files that run backups",
      "Add infrastructure-as-code definitions for backup policies (AWS Backup, GCP snapshots)",
      "Reference backup verification tests in your CI pipeline",
    ],
    nistReference: "SP 800-53 Rev 5 CP-9 (System Backup) · CP-10 (System Recovery)",
    assessmentProcedure:
      "SP 800-53A CP-9a: examine backup policies; test that backups are created and verified on schedule",
  },
  "E8-MFA": {
    summary: "No multi-factor authentication evidence",
    actions: [
      "Enable GPG commit signing. Signed commits provide direct evidence of authenticated authors",
      "Enforce MFA on all GitHub organisation members via Settings → Authentication security",
      "Add branch protection requiring signed commits",
    ],
    nistReference:
      "SP 800-53 Rev 5 IA-2 (Identification and Authentication) · IA-5 (Authenticator Management)",
    assessmentProcedure:
      "SP 800-53A IA-2a: examine multi-factor authentication mechanisms; test that MFA is enforced for all user accounts",
  },

  // ─── NIST CSF 2.0 ─────────────────────────────────────────────────────────
  "CSF-GV.OC-03": {
    summary: "No legal and regulatory requirements evidence",
    actions: [
      "Add a compliance policy document to a repository (COMPLIANCE.md or docs/compliance/)",
      "Reference regulatory requirements in PR descriptions when making compliance-driven changes",
      "Commit records of regulatory review in a dedicated policy repository",
    ],
    nistReference: "SP 800-53 Rev 5 PL-2 (System Security Plan) · PM-9 (Risk Management Strategy)",
    assessmentProcedure:
      "SP 800-53A PL-2a: examine system security plan for legal and regulatory requirements documentation",
  },
  "CSF-PR.AA-05": {
    summary: "No access permissions management evidence",
    actions: [
      "Configure branch protection rules to restrict who can push or merge",
      "Add a CODEOWNERS file assigning responsibility for key directories",
      "Commit IAM policy files (AWS, GCP, Azure) that define least-privilege access",
    ],
    nistReference: "SP 800-53 Rev 5 AC-3 (Access Enforcement) · AC-6 (Least Privilege)",
    assessmentProcedure:
      "SP 800-53A AC-3a, AC-6a: examine access permission management procedures and enforcement mechanisms",
  },
  "CSF-PR.PS-01": {
    summary: "No configuration management evidence",
    actions: [
      "Commit infrastructure-as-code files (Terraform, Pulumi, CloudFormation, Ansible)",
      "Add configuration files (.env.example, config.yaml) showing environment standards",
      "Use CI to validate that configuration files meet expected schemas",
    ],
    nistReference: "SP 800-53 Rev 5 CM-6 (Configuration Settings) · CM-2 (Baseline Configuration)",
    assessmentProcedure:
      "SP 800-53A CM-6a: examine configuration baseline documentation stored in version control",
  },
  "CSF-PR.PS-02": {
    summary: "No secure software development evidence",
    actions: [
      "Add SAST tools to your CI pipeline (CodeQL, SonarQube, Semgrep)",
      "Include security-focused PR reviews. Approving reviews on security changes count as evidence",
      "Commit security policy files (SECURITY.md, .github/SECURITY.md)",
    ],
    nistReference:
      "SP 800-53 Rev 5 SA-15 (Development Process) · SA-11 (Developer Security Testing)",
    assessmentProcedure:
      "SP 800-53A SA-15a, SA-11a: examine secure development process documentation; test that security tools are integrated into CI/CD",
  },
  "CSF-PR.PS-04": {
    summary: "No log records evidence",
    actions: [
      "Commit logging configuration files (log4j, winston, structlog, etc.)",
      "Add centralised log shipping configuration (Datadog, Splunk, ELK stack) to your repo",
      "Reference log retention policies in your infrastructure-as-code",
    ],
    nistReference: "SP 800-53 Rev 5 AU-2 (Event Logging) · AU-9 (Protection of Audit Information)",
    assessmentProcedure:
      "SP 800-53A AU-2a: examine audit event definitions; test that log records are generated and protected from modification",
  },
  "CSF-PR.PS-05": {
    summary: "No software and dependency management evidence",
    actions: [
      "Enable Dependabot or Renovate and commit the resulting dependency update PRs",
      "Add a software bill of materials (SBOM) generation step to your CI pipeline",
      "Commit and regularly update lock files (package-lock.json, poetry.lock, etc.)",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · CM-10 (Software Usage Restrictions)",
    assessmentProcedure:
      "SP 800-53A SI-2a: examine dependency management procedures; test that automated tooling monitors for vulnerable components",
  },
  "CSF-DE.CM-09": {
    summary: "No continuous monitoring evidence",
    actions: [
      "Add a workflow that runs security scans on every push or PR",
      "Commit monitoring agent configuration (Datadog, Prometheus, CloudWatch)",
      "Set up GitHub Actions to alert on failed security checks",
    ],
    nistReference: "SP 800-53 Rev 5 CA-7 (Continuous Monitoring) · SI-4 (System Monitoring)",
    assessmentProcedure:
      "SP 800-53A CA-7a: examine continuous monitoring strategy; test that security metrics are collected and reviewed per NIST SP 800-137",
  },

  // ─── NIST SP 800-53 ────────────────────────────────────────────────────────
  "800-53-AC-2": {
    summary: "No account management evidence",
    actions: [
      "Enable branch protection with required reviewers to restrict who can merge",
      "Commit IAM or access policy definitions that show account lifecycle management",
      "Document and commit your account provisioning / de-provisioning process",
    ],
    nistReference: "SP 800-53 Rev 5 AC-2 (Account Management)",
    assessmentProcedure:
      "SP 800-53A AC-2a–j: examine account management policies; test that account provisioning and de-provisioning procedures are implemented",
  },
  "800-53-CA-7": {
    summary: "No continuous monitoring evidence",
    actions: [
      "Add scheduled CI/CD jobs that run security and compliance checks",
      "Commit monitoring configuration (Prometheus rules, CloudWatch alarms, etc.)",
      "Reference audit log exports or SIEM configuration in your repository",
    ],
    nistReference: "SP 800-53 Rev 5 CA-7 (Continuous Monitoring)",
    assessmentProcedure:
      "SP 800-53A CA-7a: examine continuous monitoring strategy (per NIST SP 800-137); test that security status is monitored on an ongoing basis",
  },
  "800-53-CM-3": {
    summary: "No configuration change control evidence",
    actions: [
      "Require all configuration changes to go through reviewed pull requests",
      "Enable branch protection on branches that contain configuration files",
      "Use PR templates that capture the reason for change and rollback plan",
    ],
    nistReference: "SP 800-53 Rev 5 CM-3 (Configuration Change Control)",
    assessmentProcedure:
      "SP 800-53A CM-3a: examine configuration change control procedures; test that all changes are authorised and reviewed before implementation",
  },
  "800-53-CM-4": {
    summary: "No security and privacy impact analysis evidence",
    actions: [
      "Add a security impact checklist to your PR template",
      "Require a security-team review on PRs that touch authentication, data handling, or infrastructure",
      "Commit privacy impact assessment (PIA) documents for significant feature changes",
    ],
    nistReference: "SP 800-53 Rev 5 CM-4 (Impact Analyses)",
    assessmentProcedure:
      "SP 800-53A CM-4a: examine impact analysis procedures; test that security and privacy impact is assessed before configuration changes are approved",
  },
  "800-53-SA-10": {
    summary: "No developer configuration management evidence",
    actions: [
      "Store all build and deployment configuration in version control",
      "Enable branch protection on configuration branches",
      "Add CI validation that configuration files are syntactically correct before merging",
    ],
    nistReference: "SP 800-53 Rev 5 SA-10 (Developer Configuration Management)",
    assessmentProcedure:
      "SP 800-53A SA-10a: examine developer configuration management requirements; test that all system components are under version control",
  },
  "800-53-SA-11": {
    summary: "No developer testing and evaluation evidence",
    actions: [
      "Add automated test suites to your CI pipeline that run on every PR",
      "Include security-focused test cases (auth, injection, data validation)",
      "Require a passing CI build before any PR can be merged",
    ],
    nistReference: "SP 800-53 Rev 5 SA-11 (Developer Security Testing and Evaluation)",
    assessmentProcedure:
      "SP 800-53A SA-11a,b: examine developer security testing plan; test that automated security tests run on every code change",
  },
  "800-53-SI-2": {
    summary: "No flaw remediation evidence",
    actions: [
      "Enable Dependabot security alerts and commit their fixes promptly",
      "Reference CVE IDs in commit messages when patching known vulnerabilities",
      "Add automated vulnerability scanning (Trivy, Snyk) to your CI pipeline",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation)",
    assessmentProcedure:
      "SP 800-53A SI-2a,b,c: examine flaw remediation procedures; test that identified flaws are tracked and remediated within organisation-defined time periods",
  },

  // ─── PCI DSS 4.0 ──────────────────────────────────────────────────────────
  "PCI-6.2": {
    summary: "No security vulnerability identification evidence",
    actions: [
      "Enable Dependabot security alerts on all payment-adjacent repositories",
      "Add automated vulnerability scanning (Trivy, Snyk, OWASP) to your CI pipeline",
      "Commit a vulnerability disclosure / tracking policy document",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · RA-5 (Vulnerability Monitoring)",
    assessmentProcedure:
      "SP 800-53A RA-5a, SI-2a: examine vulnerability scanning procedures; test that vulnerabilities are identified and tracked for payment systems",
  },
  "PCI-6.3": {
    summary: "No vulnerability management evidence",
    actions: [
      "Enable Dependabot security alerts and commit their fixes",
      "Add SAST/DAST scanning to your CI pipeline",
      "Reference CVE fixes in commit messages",
    ],
    nistReference: "SP 800-53 Rev 5 SI-2 (Flaw Remediation) · SA-11 (Developer Security Testing)",
    assessmentProcedure:
      "SP 800-53A SI-2b: examine vulnerability management procedures; test that security patches are applied within required timeframes",
  },
  "PCI-6.4": {
    summary: "No web application protection evidence",
    actions: [
      "Commit WAF configuration (AWS WAF, Cloudflare rules) to your infrastructure repo",
      "Add security headers configuration to your application (HSTS, CSP, X-Frame-Options)",
      "Include DAST scanning in your CI pipeline targeting your web endpoints",
    ],
    nistReference:
      "SP 800-53 Rev 5 SC-7 (Boundary Protection) · SI-10 (Information Input Validation)",
    assessmentProcedure:
      "SP 800-53A SC-7a: examine boundary protection mechanisms; test that web application security controls are configured and active",
  },
  "PCI-7.2": {
    summary: "No access control for system components evidence",
    actions: [
      "Configure branch protection to restrict who can modify sensitive components",
      "Commit IAM policies that implement least-privilege access for system components",
      "Add a CODEOWNERS file for payment-related code paths",
    ],
    nistReference: "SP 800-53 Rev 5 AC-2 (Account Management) · AC-3 (Access Enforcement)",
    assessmentProcedure:
      "SP 800-53A AC-2a, AC-3a: examine access control policies for system components; test that access is restricted to authorised individuals",
  },
  "PCI-8.2": {
    summary: "No user identification and authentication evidence",
    actions: [
      "Enable GPG commit signing for all developers working on payment code",
      "Enforce branch protection with required reviewers on payment-related repositories",
      "Commit MFA enforcement policies and authentication configuration",
    ],
    nistReference:
      "SP 800-53 Rev 5 IA-2 (Identification and Authentication) · IA-5 (Authenticator Management)",
    assessmentProcedure:
      "SP 800-53A IA-2a: examine user identification and authentication mechanisms; test that multi-factor authentication is enforced for system access",
  },

  // ─── SOC 2 ────────────────────────────────────────────────────────────────
  "SOC2-CC6.1": {
    summary: "No logical access control evidence",
    actions: [
      "Enforce branch protection with required reviewers on your default branch",
      "Use signed commits (GPG) to demonstrate authenticated authorship",
      "Add CODEOWNERS to restrict sensitive directory modifications",
    ],
    nistReference: "SP 800-53 Rev 5 AC-3 (Access Enforcement) · AC-6 (Least Privilege)",
    assessmentProcedure:
      "SP 800-53A AC-3a: examine logical access control mechanisms; test that access to system components is enforced based on approved authorisations",
  },
  "SOC2-CC6.6": {
    summary: "No logical access security evidence",
    actions: [
      "Enable branch protection requiring PR reviews before any merge",
      "Restrict direct pushes to the default branch. All changes must go through PRs",
      "Configure CODEOWNERS to enforce appropriate access boundaries",
    ],
    nistReference: "SP 800-53 Rev 5 AC-17 (Remote Access) · AC-20 (External System Connections)",
    assessmentProcedure:
      "SP 800-53A AC-17a: examine remote access policies; test that access to system resources from external connections is restricted and monitored",
  },
  "SOC2-CC7.1": {
    summary: "No system component detection evidence",
    actions: [
      "Commit an SBOM (software bill of materials) generation step to your CI pipeline",
      "Add infrastructure discovery scripts or IaC that enumerates system components",
      "Reference asset inventory tooling configuration in your repository",
    ],
    nistReference: "SP 800-53 Rev 5 CM-8 (System Component Inventory) · SA-12 (Supply Chain Risk)",
    assessmentProcedure:
      "SP 800-53A CM-8a: examine system component inventory; test that components are identified, documented, and kept current",
  },
  "SOC2-CC7.2": {
    summary: "No anomaly and threat monitoring evidence",
    actions: [
      "Add automated security scanning (CodeQL, Dependabot) that triggers on every push",
      "Commit alert rules for anomalous behaviour (unexpected auth failures, traffic spikes)",
      "Reference your SIEM or threat detection configuration in your infrastructure repo",
    ],
    nistReference: "SP 800-53 Rev 5 SI-4 (System Monitoring) · CA-7 (Continuous Monitoring)",
    assessmentProcedure:
      "SP 800-53A SI-4a: examine anomaly detection mechanisms; test that monitoring alerts are configured and reviewed per NIST SP 800-137",
  },
  "SOC2-CC8.1": {
    summary: "No change management evidence",
    actions: [
      "All code changes should go through reviewed pull requests",
      "Enable branch protection with required approvals",
      "Use PR templates that capture the reason for change, testing done, and risk assessment",
    ],
    nistReference: "SP 800-53 Rev 5 CM-3 (Configuration Change Control) · CM-4 (Impact Analyses)",
    assessmentProcedure:
      "SP 800-53A CM-3a: examine change management procedures; test that all changes are reviewed and authorised before implementation",
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
