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

  console.log("Seeding completed — 6 frameworks, 39 controls");
  console.log(`- SOC 2: ${soc2Controls.length} controls`);
  console.log(`- ISO 27001: ${isoControls.length} controls`);
  console.log(`- NIST CSF 2.0: ${nistCsfControls.length} controls`);
  console.log(`- NIST SP 800-53 Rev 5: ${nist80053Controls.length} controls`);
  console.log(`- Essential Eight: ${e8Controls.length} controls`);
  console.log(`- PCI DSS 4.0: ${pciControls.length} controls`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
