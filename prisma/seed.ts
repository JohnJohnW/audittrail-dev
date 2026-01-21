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
      description:
        "Secure coding principles shall be applied to software development.",
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

  console.log("Seeding completed!");
  console.log(`- ISO 27001: ${isoControls.length} controls`);
  console.log(`- Essential Eight: ${e8Controls.length} controls`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
