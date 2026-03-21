import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding compliance frameworks and controls...");

  // ISO 27001:2022 Framework
  const iso27001 = await prisma.complianceFramework.upsert({
    where: { name: "ISO 27001" },
    update: {},
    create: {
      name: "ISO 27001",
      version: "2022",
      description:
        "Information security management system standard. Focus on Annex A controls relevant to software development.",
    },
  });

  // Essential Eight Framework
  const essentialEight = await prisma.complianceFramework.upsert({
    where: { name: "Essential Eight" },
    update: {},
    create: {
      name: "Essential Eight",
      version: "2023",
      description:
        "Australian Cyber Security Centre mitigation strategies to protect against cyber threats.",
    },
  });

  // ISO 27001 Controls (subset relevant to GitHub data)
  const isoControls = [
    {
      code: "A.8.9",
      title: "Configuration Management",
      description:
        "Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.",
      evidenceType: "branch_protection",
    },
    {
      code: "A.8.32",
      title: "Change Management",
      description:
        "Changes to information processing facilities and information systems shall be subject to change management procedures.",
      evidenceType: "pr_approvals",
    },
    {
      code: "A.8.4",
      title: "Access to Source Code",
      description:
        "Read and write access to source code, development tools and software libraries shall be appropriately managed.",
      evidenceType: "branch_protection",
    },
    {
      code: "A.8.25",
      title: "Secure Development Life Cycle",
      description:
        "Rules for the secure development of software and systems shall be established and applied.",
      evidenceType: "pr_approvals",
    },
    {
      code: "A.8.26",
      title: "Application Security Requirements",
      description:
        "Information security requirements shall be identified, specified and approved when developing or acquiring applications.",
      evidenceType: "pr_approvals",
    },
    {
      code: "A.8.27",
      title: "Secure System Architecture and Engineering Principles",
      description:
        "Principles for engineering secure systems shall be established, documented, maintained and applied to any information system development activities.",
      evidenceType: "commit_history",
    },
    {
      code: "A.8.28",
      title: "Secure Coding",
      description: "Secure coding principles shall be applied to software development.",
      evidenceType: "pr_approvals",
    },
    {
      code: "A.8.29",
      title: "Security Testing in Development and Acceptance",
      description:
        "Security testing processes shall be defined and implemented in the development life cycle.",
      evidenceType: "pr_approvals",
    },
    {
      code: "A.8.31",
      title: "Separation of Development, Test and Production Environments",
      description:
        "Development, testing and production environments shall be separated and secured.",
      evidenceType: "branch_protection",
    },
    {
      code: "A.5.17",
      title: "Authentication Information",
      description:
        "Allocation and management of authentication information shall be controlled by a management process.",
      evidenceType: "branch_protection",
    },
  ];

  for (const control of isoControls) {
    await prisma.complianceControl.upsert({
      where: {
        frameworkId_code: {
          frameworkId: iso27001.id,
          code: control.code,
        },
      },
      update: {},
      create: {
        frameworkId: iso27001.id,
        ...control,
      },
    });
  }

  // Essential Eight Controls
  const e8Controls = [
    {
      code: "E8-1",
      title: "Application Control",
      description:
        "Application control to prevent execution of unapproved/malicious programs including .exe, DLL, scripts and installers. Evidenced through branch protection rules limiting who can deploy.",
      evidenceType: "branch_protection",
    },
    {
      code: "E8-2",
      title: "Patch Applications",
      description:
        "Patch applications (e.g. Flash, web browsers, Microsoft Office, Java, PDF viewers) within 48 hours if a security vulnerability is assessed as extreme risk, or within two weeks otherwise.",
      evidenceType: "commit_history",
    },
    {
      code: "E8-4",
      title: "Restrict Administrative Privileges",
      description:
        "Restrict administrative privileges to operating systems and applications based on user duties. Regularly revalidate the need for privileges.",
      evidenceType: "branch_protection",
    },
    {
      code: "E8-5",
      title: "Patch Operating Systems",
      description:
        "Patch operating systems within 48 hours if a security vulnerability is assessed as extreme risk, or within two weeks otherwise.",
      evidenceType: "commit_history",
    },
    {
      code: "E8-8",
      title: "Regular Backups",
      description:
        "Perform regular backups of important data, software and configuration settings. Test restoration of backups.",
      evidenceType: "commit_history",
    },
  ];

  for (const control of e8Controls) {
    await prisma.complianceControl.upsert({
      where: {
        frameworkId_code: {
          frameworkId: essentialEight.id,
          code: control.code,
        },
      },
      update: {},
      create: {
        frameworkId: essentialEight.id,
        ...control,
      },
    });
  }

  // NIST CSF 2.0 Framework
  const nistCsf = await prisma.complianceFramework.upsert({
    where: { name: "NIST CSF" },
    update: {},
    create: {
      name: "NIST CSF",
      version: "2.0",
      description:
        "NIST Cybersecurity Framework 2.0: a globally recognised voluntary framework for managing and reducing cybersecurity risk.",
    },
  });

  // NIST SP 800-53 Framework
  const nist80053 = await prisma.complianceFramework.upsert({
    where: { name: "NIST SP 800-53" },
    update: {},
    create: {
      name: "NIST SP 800-53",
      version: "Rev 5",
      description:
        "Security and privacy controls for information systems and organisations. Widely adopted for federal and enterprise environments.",
    },
  });

  // SOC 2 Framework
  const soc2 = await prisma.complianceFramework.upsert({
    where: { name: "SOC 2" },
    update: {},
    create: {
      name: "SOC 2",
      version: "2022",
      description:
        "AICPA Trust Services Criteria for service organisations. Covers security, availability, processing integrity, confidentiality, and privacy.",
    },
  });

  // GDPR Framework
  const gdpr = await prisma.complianceFramework.upsert({
    where: { name: "GDPR" },
    update: {},
    create: {
      name: "GDPR",
      version: "2018",
      description:
        "EU General Data Protection Regulation. Governs the processing of personal data of EU residents.",
    },
  });

  // SOCI Act Framework
  const sociAct = await prisma.complianceFramework.upsert({
    where: { name: "SOCI Act" },
    update: {},
    create: {
      name: "SOCI Act",
      version: "2018",
      description:
        "Australian Security of Critical Infrastructure Act. Positive security obligations for operators of critical infrastructure assets.",
    },
  });

  // PCI DSS Framework
  const pciDss = await prisma.complianceFramework.upsert({
    where: { name: "PCI DSS" },
    update: {},
    create: {
      name: "PCI DSS",
      version: "4.0",
      description:
        "Payment Card Industry Data Security Standard. Required for organisations that store, process, or transmit cardholder data.",
    },
  });

  // NIST CSF 2.0 Controls
  const nistCsfControls = [
    {
      code: "CSF-GV.OC-03",
      title: "Legal & Regulatory Requirements",
      description:
        "Legal, regulatory, and contractual cybersecurity requirements are understood and managed. Pull request reviews and approvals provide evidence that changes are reviewed for compliance.",
      evidenceType: "pr_approvals",
    },
    {
      code: "CSF-PR.AA-05",
      title: "Access Permissions Management",
      description:
        "Access permissions, entitlements, and authorisations are defined in a policy, managed, enforced, and reviewed. Branch protection rules restrict who can push and merge code.",
      evidenceType: "branch_protection",
    },
    {
      code: "CSF-PR.PS-01",
      title: "Configuration Management",
      description:
        "Configuration management practices are established and applied. Branch protection policies enforce configuration governance across repositories.",
      evidenceType: "branch_protection",
    },
    {
      code: "CSF-PR.PS-02",
      title: "Software Development Security Practices",
      description:
        "Software development security practices are integrated into the SDLC. Pull request approvals and review processes demonstrate secure development practices.",
      evidenceType: "pr_approvals",
    },
    {
      code: "CSF-PR.PS-04",
      title: "Log Records",
      description:
        "Log records are created, protected, analysed, and retained. Commit history provides an immutable audit log of all code changes.",
      evidenceType: "commit_history",
    },
    {
      code: "CSF-PR.PS-05",
      title: "Software & Dependency Management",
      description:
        "Installed software and firmware are managed. Dependency update commits and automated patching tools provide evidence of software lifecycle management.",
      evidenceType: "commit_history",
    },
    {
      code: "CSF-DE.CM-09",
      title: "Computing Systems Monitored",
      description:
        "Computing hardware and software are monitored to find potentially adverse events. CI/CD pipeline commits and infrastructure-as-code changes evidence continuous monitoring.",
      evidenceType: "commit_history",
    },
  ];

  for (const control of nistCsfControls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: nistCsf.id, code: control.code } },
      update: {},
      create: { frameworkId: nistCsf.id, ...control },
    });
  }

  // NIST SP 800-53 Rev 5 Controls
  const nist80053Controls = [
    {
      code: "800-53-SA-10",
      title: "Developer Configuration Management",
      description:
        "The organisation requires the developer to perform configuration management during system, component, or service development. Branch protection and required reviews enforce configuration control.",
      evidenceType: "branch_protection",
    },
    {
      code: "800-53-SA-11",
      title: "Developer Testing and Evaluation",
      description:
        "The organisation requires the developer to implement a security and privacy assessment plan. Pull request reviews with security checks provide evidence of developer testing.",
      evidenceType: "pr_approvals",
    },
    {
      code: "800-53-CM-3",
      title: "Configuration Change Control",
      description:
        "The organisation documents, manages, and controls changes to the system. Pull request approvals with required reviews enforce a formal change control process.",
      evidenceType: "pr_approvals",
    },
    {
      code: "800-53-CM-4",
      title: "Security and Privacy Impact Analysis",
      description:
        "The organisation analyses changes to the system to determine potential security and privacy impacts. PR review processes provide a mechanism for security impact analysis.",
      evidenceType: "pr_approvals",
    },
    {
      code: "800-53-AC-2",
      title: "Account Management",
      description:
        "The organisation manages system accounts including establishing, activating, modifying, reviewing, disabling, and removing accounts. Branch protection restricts repository access by role.",
      evidenceType: "branch_protection",
    },
    {
      code: "800-53-SI-2",
      title: "Flaw Remediation",
      description:
        "The organisation identifies, reports, and corrects information system flaws. Dependency update commits and security patch PRs provide evidence of flaw remediation.",
      evidenceType: "commit_history",
    },
    {
      code: "800-53-CA-7",
      title: "Continuous Monitoring",
      description:
        "The organisation develops a continuous monitoring strategy. CI/CD security scans and automated test commits provide evidence of ongoing monitoring.",
      evidenceType: "commit_history",
    },
  ];

  for (const control of nist80053Controls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: nist80053.id, code: control.code } },
      update: {},
      create: { frameworkId: nist80053.id, ...control },
    });
  }

  // SOC 2 Controls
  const soc2Controls = [
    {
      code: "SOC2-CC8.1",
      title: "Change Management",
      description:
        "The entity authorises, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures. PR approvals enforce this process.",
      evidenceType: "pr_approvals",
    },
    {
      code: "SOC2-CC6.1",
      title: "Logical and Physical Access Controls",
      description:
        "The entity implements logical access security software, infrastructure, and architectures over protected information assets. Branch protection rules restrict access to production code.",
      evidenceType: "branch_protection",
    },
    {
      code: "SOC2-CC6.6",
      title: "Logical Access Security",
      description:
        "The entity implements logical access security measures to protect against threats from sources outside its system boundaries. Repository access controls and required reviews evidence this.",
      evidenceType: "branch_protection",
    },
    {
      code: "SOC2-CC7.1",
      title: "System Component Detection",
      description:
        "The entity uses detection and monitoring procedures to identify changes to configurations that result in the introduction of new vulnerabilities. CI/CD and infrastructure commits provide evidence.",
      evidenceType: "commit_history",
    },
    {
      code: "SOC2-CC7.2",
      title: "Anomaly and Threat Monitoring",
      description:
        "The entity monitors system components and the operation of those components for anomalies indicative of malicious acts, natural disasters, and errors affecting the entity's ability to meet its objectives.",
      evidenceType: "commit_history",
    },
  ];

  for (const control of soc2Controls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: soc2.id, code: control.code } },
      update: {},
      create: { frameworkId: soc2.id, ...control },
    });
  }

  // GDPR Controls
  const gdprControls = [
    {
      code: "GDPR-Art25",
      title: "Data Protection by Design and by Default",
      description:
        "Controllers shall implement appropriate technical measures to implement data-protection principles. PR reviews with privacy checks provide evidence of privacy-by-design in development.",
      evidenceType: "pr_approvals",
    },
    {
      code: "GDPR-Art32",
      title: "Security of Processing",
      description:
        "Controllers and processors shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk. PR reviews and branch protection provide evidence.",
      evidenceType: "pr_approvals",
    },
    {
      code: "GDPR-Art30",
      title: "Records of Processing Activities",
      description:
        "Controllers shall maintain records of processing activities. Commit history provides a partial audit trail of data processing changes. Supplementary documentation records are required.",
      evidenceType: "commit_history",
    },
  ];

  for (const control of gdprControls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: gdpr.id, code: control.code } },
      update: {},
      create: { frameworkId: gdpr.id, ...control },
    });
  }

  // SOCI Act Controls
  const sociControls = [
    {
      code: "SOCI-PSO1",
      title: "Hazard and Risk Management",
      description:
        "Responsible entities must identify and manage hazards and risks to critical infrastructure assets. PR reviews for infrastructure changes provide evidence of risk assessment processes.",
      evidenceType: "pr_approvals",
    },
    {
      code: "SOCI-PSO2",
      title: "Incident Response Plan",
      description:
        "Responsible entities must have an incident response plan and undertake exercises. PR approval processes and documented change controls support incident response readiness.",
      evidenceType: "pr_approvals",
    },
    {
      code: "SOCI-PSO3",
      title: "System Security Plan",
      description:
        "Responsible entities must develop and maintain a system security plan for their critical infrastructure assets. Branch protection rules enforce the security controls defined in the plan.",
      evidenceType: "branch_protection",
    },
    {
      code: "SOCI-PSO4",
      title: "Access Control",
      description:
        "Responsible entities must control access to critical infrastructure assets and associated data. Repository branch protection and required reviews control access to production systems.",
      evidenceType: "branch_protection",
    },
  ];

  for (const control of sociControls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: sociAct.id, code: control.code } },
      update: {},
      create: { frameworkId: sociAct.id, ...control },
    });
  }

  // PCI DSS 4.0 Controls
  const pciControls = [
    {
      code: "PCI-6.2",
      title: "Security Vulnerabilities Identified and Managed",
      description:
        "Bespoke and custom software are developed securely. Dependency update commits, CVE patches, and security scanning tool commits provide evidence of vulnerability management.",
      evidenceType: "commit_history",
    },
    {
      code: "PCI-6.3",
      title: "Security Vulnerabilities Addressed",
      description:
        "Security vulnerabilities are identified and protected against. Pull request reviews with security checks provide evidence that vulnerabilities are assessed before merging.",
      evidenceType: "pr_approvals",
    },
    {
      code: "PCI-6.4",
      title: "Web-Facing Applications Protected",
      description:
        "Public-facing web applications are protected against attacks. Security commit patterns and CI/CD security scans evidence ongoing protection of web-facing application code.",
      evidenceType: "commit_history",
    },
    {
      code: "PCI-7.2",
      title: "Access to System Components and Data",
      description:
        "Access to system components and data is appropriately defined and assigned. Branch protection rules restrict who can merge to production branches, controlling system access.",
      evidenceType: "branch_protection",
    },
    {
      code: "PCI-8.2",
      title: "User Identification and Authentication",
      description:
        "All users are assigned a unique ID before allowing them to access system components or cardholder data. Branch protection with required reviews enforces authenticated user identity for all code changes.",
      evidenceType: "branch_protection",
    },
  ];

  for (const control of pciControls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: pciDss.id, code: control.code } },
      update: {},
      create: { frameworkId: pciDss.id, ...control },
    });
  }

  // NIST SP 800-207 (Zero Trust Architecture) Framework
  const nist800207 = await prisma.complianceFramework.upsert({
    where: { name: "NIST SP 800-207" },
    update: {},
    create: {
      name: "NIST SP 800-207",
      version: "2020",
      description:
        "NIST Special Publication 800-207: Zero Trust Architecture. Defines zero trust principles and logical components for enterprise security.",
    },
  });

  // NIST SP 800-207 Controls
  const nist800207Controls = [
    {
      code: "ZTA-T1",
      title: "All Resources Protected",
      description:
        "All data sources and computing services are treated as resources. Access is never granted based on network location alone.",
      evidenceType: "branch_protection",
    },
    {
      code: "ZTA-T2",
      title: "Per-Session Access",
      description:
        "Access to enterprise resources is granted on a per-session basis with least privilege enforced. Trust is re-evaluated before each access.",
      evidenceType: "pr_approvals",
    },
    {
      code: "ZTA-T3",
      title: "Dynamic Policy Engine",
      description:
        "Access decisions are determined by dynamic policy incorporating identity, device health, and environmental attributes evaluated continuously.",
      evidenceType: "branch_protection",
    },
    {
      code: "ZTA-T4",
      title: "Asset Monitoring",
      description:
        "All owned and associated assets are continuously monitored for security posture. No asset is inherently trusted.",
      evidenceType: "commit_history",
    },
    {
      code: "ZTA-T5",
      title: "Authentication & Authorization",
      description:
        "All resource authentication and authorization is dynamic and strictly enforced before access is allowed. MFA is required for enterprise resources.",
      evidenceType: "branch_protection",
    },
    {
      code: "ZTA-T6",
      title: "Audit Logging",
      description:
        "The enterprise collects comprehensive information about asset state, network infrastructure, and communications to improve security posture.",
      evidenceType: "commit_history",
    },
    {
      code: "ZTA-PE",
      title: "Policy Enforcement Points",
      description:
        "Policy Enforcement Points mediate all access requests between subjects and resources. No resource is reachable without traversing a PEP.",
      evidenceType: "branch_protection",
    },
    {
      code: "ZTA-ID",
      title: "Identity Governance",
      description:
        "A robust identity management system maintains user accounts, roles, and assigned assets. Federated identity is supported for cross-boundary collaboration.",
      evidenceType: "branch_protection",
    },
    {
      code: "ZTA-CDM",
      title: "Continuous Diagnostics",
      description:
        "A continuous diagnostics and mitigation system tracks asset health including OS version, patch level, and software integrity.",
      evidenceType: "commit_history",
    },
    {
      code: "ZTA-TI",
      title: "Threat Intelligence",
      description:
        "Threat intelligence feeds inform the policy engine with newly discovered vulnerabilities, active malware signatures, and attack patterns.",
      evidenceType: "commit_history",
    },
  ];

  for (const control of nist800207Controls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: nist800207.id, code: control.code } },
      update: {},
      create: { frameworkId: nist800207.id, ...control },
    });
  }

  // ASD MDA Foundations (2025) Framework
  const asdMda = await prisma.complianceFramework.upsert({
    where: { name: "ASD MDA Foundations" },
    update: {},
    create: {
      name: "ASD MDA Foundations",
      version: "October 2025",
      description:
        "Australian Signals Directorate Modern Defensible Architecture Foundations. Guidance for building cyber-resilient enterprise architecture aligned with zero trust principles.",
    },
  });

  // ASD MDA Foundations Controls
  const asdMdaControls = [
    {
      code: "MDA-F1",
      title: "Centrally Managed Identities",
      description:
        "Enterprise identities are managed from the fewest authoritative sources possible. All user and non-user identities are granted only minimum required privileges with separation of duties enforced.",
      evidenceType: "branch_protection",
    },
    {
      code: "MDA-F2",
      title: "High Confidence Authentication",
      description:
        "Phishing-resistant multi-factor authentication is used for all authentication events. Non-user identities authenticate via hardware or service-bound cryptographic factors.",
      evidenceType: "branch_protection",
    },
    {
      code: "MDA-F3",
      title: "Contextual Authorisation",
      description:
        "Authorisation is initially and continuously validated using identity, task, environment, and data context. Access is revoked immediately when confidence drops below threshold.",
      evidenceType: "pr_approvals",
    },
    {
      code: "MDA-F4",
      title: "Reliable Asset Inventory",
      description:
        "A centralised repository maintains complete knowledge of all endpoints, networks, applications, cryptographic assets, and data stores including SBOM, HBOM, and AIBOM.",
      evidenceType: "commit_history",
    },
    {
      code: "MDA-F5",
      title: "Secure Endpoints",
      description:
        "Endpoints are hardened per security baselines, resilient to cyber threats, and continuously provide contextual security posture information to inform authorisation decisions.",
      evidenceType: "commit_history",
    },
    {
      code: "MDA-F6",
      title: "Reduced Attack Surface",
      description:
        "The number of exploitable attack surfaces is minimised across endpoints, networks, applications, and data stores. End-of-life assets are removed or replaced.",
      evidenceType: "commit_history",
    },
    {
      code: "MDA-F7",
      title: "Resilient Networks",
      description:
        "Networks restrict lateral (east/west) and vertical (north/south) movement to authorised requests only. Redundant paths and automated failover protect availability.",
      evidenceType: "branch_protection",
    },
    {
      code: "MDA-F8",
      title: "Secure by Design",
      description:
        "Hardware and software are designed, built, and delivered through security-first principles including threat modelling, memory-safe languages, SBOMs, and code signing.",
      evidenceType: "pr_approvals",
    },
    {
      code: "MDA-F9",
      title: "Comprehensive Validation",
      description:
        "Security measures are continuously validated through assurance activities including DLP controls, baseline auditing, and immutability verification.",
      evidenceType: "pr_approvals",
    },
    {
      code: "MDA-F10",
      title: "Continuous Monitoring",
      description:
        "Real-time automated visibility and response using high-fidelity inputs. SIEM platforms feed confidence signals to the authorisation model for continuous access evaluation.",
      evidenceType: "commit_history",
    },
  ];

  for (const control of asdMdaControls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: asdMda.id, code: control.code } },
      update: {},
      create: { frameworkId: asdMda.id, ...control },
    });
  }

  // ============================================================
  // NIST AI RMF Framework
  // ============================================================
  const nistAiRmf = await prisma.complianceFramework.upsert({
    where: { name: "NIST AI RMF" },
    update: {},
    create: {
      name: "NIST AI RMF",
      version: "1.0",
      description:
        "NIST Artificial Intelligence Risk Management Framework 1.0: a voluntary framework to help organisations design, develop, deploy, and use AI systems in a trustworthy manner. Maps to the four core functions: Govern, Map, Measure, Manage.",
    },
  });

  const nistAiRmfControls = [
    {
      code: "AI-GOV-1",
      title: "AI Governance Policy",
      description:
        "Policies, processes, procedures, and practices across the organisation related to the mapping, measuring, and managing of AI risks are in place, transparent, and implemented effectively. Evidence: policies committed to version control, access controls on AI code repositories.",
      evidenceType: "ai_governance",
    },
    {
      code: "AI-GOV-2",
      title: "AI Risk Roles and Accountability",
      description:
        "Roles and responsibilities for AI governance are clearly defined, documented, and communicated. Accountability is assigned for AI model development, deployment, and monitoring.",
      evidenceType: "ai_governance",
    },
    {
      code: "AI-MAP-1",
      title: "AI System Context and Risk Identification",
      description:
        "The context of AI system use is understood, including the people and organisations who may be affected. AI risks (model drift, prompt injection, data poisoning, hallucination, training data bias) are identified and documented.",
      evidenceType: "ai_governance",
    },
    {
      code: "AI-MAP-2",
      title: "Model Inventory and Classification",
      description:
        "AI models in development and production are inventoried. Each model is classified by risk level, modality, training data source, and intended use. Agentic AI systems with tool-calling capability are separately classified for elevated oversight.",
      evidenceType: "ai_governance",
    },
    {
      code: "AI-MEAS-1",
      title: "AI Risk Measurement and Testing",
      description:
        "AI risks are measured using qualitative and quantitative methods. Evaluation includes adversarial testing for prompt injection, jailbreak resistance, and output toxicity. CI pipelines include AI-specific test suites.",
      evidenceType: "ai_governance",
    },
    {
      code: "AI-MEAS-2",
      title: "Model Drift and Performance Monitoring",
      description:
        "AI system performance is continuously monitored post-deployment. Drift detection alerts are in place. Incidents of unexpected model behaviour are logged, triaged, and remediated using a documented process.",
      evidenceType: "ai_governance",
    },
    {
      code: "AI-MANAGE-1",
      title: "AI Incident Response",
      description:
        "Identified AI risks are prioritised and addressed according to documented risk treatment plans. AI-specific incidents (data poisoning, model inversion, adversarial manipulation) trigger a defined incident response process.",
      evidenceType: "ai_governance",
    },
    {
      code: "AI-MANAGE-2",
      title: "Secure AI Supply Chain",
      description:
        "Third-party AI models, APIs, and datasets are evaluated for provenance, licensing, and security. SBOMs for AI systems include model weights, training datasets, and inference dependencies.",
      evidenceType: "ai_governance",
    },
  ];

  for (const control of nistAiRmfControls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: nistAiRmf.id, code: control.code } },
      update: {},
      create: { frameworkId: nistAiRmf.id, ...control },
    });
  }

  // ============================================================
  // EU AI Act Framework
  // ============================================================
  const euAiAct = await prisma.complianceFramework.upsert({
    where: { name: "EU AI Act" },
    update: {},
    create: {
      name: "EU AI Act",
      version: "2024",
      description:
        "European Union Artificial Intelligence Act (2024): the world's first comprehensive legal framework for AI. Applies a risk-based approach categorising AI systems as unacceptable risk, high risk, limited risk, or minimal risk. High-risk AI systems require conformity assessments, technical documentation, and ongoing monitoring.",
    },
  });

  const euAiActControls = [
    {
      code: "EUAI-ART-9",
      title: "Risk Management System for High-Risk AI",
      description:
        "A risk management system is established, implemented, documented, and maintained for high-risk AI systems throughout their entire lifecycle. Risks are identified, evaluated, and mitigated.",
      evidenceType: "ai_governance",
    },
    {
      code: "EUAI-ART-10",
      title: "Data Governance for AI Training",
      description:
        "Training, validation, and testing datasets are subject to appropriate data governance practices. Datasets are examined for possible biases and errors. Data provenance is documented and version-controlled.",
      evidenceType: "ai_governance",
    },
    {
      code: "EUAI-ART-11",
      title: "Technical Documentation",
      description:
        "Technical documentation for high-risk AI systems is maintained before system deployment. Documentation includes system description, development process, training methodologies, and performance metrics.",
      evidenceType: "ai_governance",
    },
    {
      code: "EUAI-ART-12",
      title: "Record Keeping and Logging",
      description:
        "High-risk AI systems automatically log events to enable post-hoc traceability. Logs include the reference database used, input data that led to outputs, and the identity of persons who verified results.",
      evidenceType: "ai_governance",
    },
    {
      code: "EUAI-ART-13",
      title: "Transparency and Human Oversight",
      description:
        "High-risk AI systems are designed and developed with sufficient transparency that deployers understand system capabilities and limitations. Human oversight measures are built in, including the ability to override, interrupt, or halt AI decisions.",
      evidenceType: "ai_governance",
    },
    {
      code: "EUAI-ART-15",
      title: "Accuracy, Robustness, and Cybersecurity",
      description:
        "High-risk AI systems achieve appropriate levels of accuracy, robustness, and cybersecurity. Systems are resilient against adversarial attacks including data poisoning, model poisoning, prompt injection, and adversarial examples designed to deceive the system.",
      evidenceType: "ai_governance",
    },
  ];

  for (const control of euAiActControls) {
    await prisma.complianceControl.upsert({
      where: { frameworkId_code: { frameworkId: euAiAct.id, code: control.code } },
      update: {},
      create: { frameworkId: euAiAct.id, ...control },
    });
  }

  console.log("Seeding completed!");
  console.log(`- ISO 27001: ${isoControls.length} controls`);
  console.log(`- Essential Eight: ${e8Controls.length} controls`);
  console.log(`- NIST CSF 2.0: ${nistCsfControls.length} controls`);
  console.log(`- NIST SP 800-53 Rev 5: ${nist80053Controls.length} controls`);
  console.log(`- SOC 2: ${soc2Controls.length} controls`);
  console.log(`- GDPR: ${gdprControls.length} controls`);
  console.log(`- SOCI Act: ${sociControls.length} controls`);
  console.log(`- PCI DSS 4.0: ${pciControls.length} controls`);
  console.log(`- NIST SP 800-207 (Zero Trust Architecture): ${nist800207Controls.length} controls`);
  console.log(`- ASD MDA Foundations: ${asdMdaControls.length} controls`);
  console.log(`- NIST AI RMF: ${nistAiRmfControls.length} controls`);
  console.log(`- EU AI Act: ${euAiActControls.length} controls`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
