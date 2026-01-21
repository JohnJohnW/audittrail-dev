-- Comprehensive update to ISO 27001:2022 and Essential Eight controls
-- This migration ensures accurate, complete, and well-described controls

-- ============================================
-- STEP 1: Update Framework Descriptions
-- ============================================

UPDATE compliance_frameworks 
SET description = 'ISO/IEC 27001:2022 Information Security Management System. This includes Annex A controls relevant to software development that can be evidenced through Git activity, code reviews, and repository configuration.'
WHERE id = 'iso27001-2022';

UPDATE compliance_frameworks 
SET description = 'Australian Cyber Security Centre (ACSC) Essential Eight Maturity Model (November 2023). Eight mitigation strategies to protect against cyber threats, measured across maturity levels 0-3.'
WHERE id = 'essential-eight-2023';

-- ============================================
-- STEP 2: Clear existing controls for clean slate
-- ============================================

DELETE FROM compliance_controls WHERE framework_id = 'iso27001-2022';
DELETE FROM compliance_controls WHERE framework_id = 'essential-eight-2023';

-- ============================================
-- STEP 3: ISO 27001:2022 Controls
-- Focus on Annex A controls that can be evidenced from Git/GitHub activity
-- ============================================

INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES

-- Category 5: Organizational Controls
('iso-a515', 'iso27001-2022', 'A.5.15', 'Access Control', 
'Access to information and information processing facilities shall be limited on the basis of business and information security requirements.

Git Evidence: Branch protection rules demonstrate access controls by restricting who can push to protected branches, requiring approvals, and enforcing review policies.', 
'branch_protection'),

('iso-a516', 'iso27001-2022', 'A.5.16', 'Identity Management', 
'The full life cycle of identities shall be managed. This includes registration, enabling, modification, and disabling of identities.

Git Evidence: Repository collaborator lists and commit author records demonstrate identity management through tracked user accounts and their associated activities.',
'branch_protection'),

('iso-a517', 'iso27001-2022', 'A.5.17', 'Authentication Information', 
'Allocation and management of authentication information shall be controlled by a management process, including advising personnel on handling.

Git Evidence: Branch protection rules requiring signed commits, and GitHub''s authentication requirements for repository access demonstrate authentication controls.',
'branch_protection'),

('iso-a518', 'iso27001-2022', 'A.5.18', 'Access Rights', 
'Access rights to information and other associated assets shall be provisioned, reviewed, modified and removed in accordance with access control policies.

Git Evidence: Branch protection settings showing required reviewers, code owner requirements, and admin enforcement demonstrate access rights management.',
'branch_protection'),

-- Category 8: Technological Controls - Development & Source Code
('iso-a84', 'iso27001-2022', 'A.8.4', 'Access to Source Code', 
'Read and write access to source code, development tools and software libraries shall be appropriately managed to prevent introduction of unauthorized functionality.

Git Evidence: Repository visibility settings (private/public), branch protection rules, and required PR reviews demonstrate controlled source code access.',
'branch_protection'),

('iso-a88', 'iso27001-2022', 'A.8.8', 'Management of Technical Vulnerabilities', 
'Information about technical vulnerabilities shall be obtained, exposure evaluated, and appropriate measures taken. This includes timely patching of applications.

Git Evidence: Commits updating dependencies (package.json, requirements.txt, Gemfile, etc.) and security-related pull requests demonstrate vulnerability management.',
'commit_history'),

('iso-a89', 'iso27001-2022', 'A.8.9', 'Configuration Management', 
'Configurations of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.

Git Evidence: Configuration files tracked in version control, branch protection settings, and infrastructure-as-code commits demonstrate configuration management.',
'branch_protection'),

-- Category 8: Secure Development Controls (A.8.25-A.8.34)
('iso-a825', 'iso27001-2022', 'A.8.25', 'Secure Development Life Cycle', 
'Rules for the secure development of software and systems shall be established and applied to development within the organization.

Git Evidence: Established PR workflow with required reviews, branch protection on main/production branches, and consistent merge patterns demonstrate a secure SDLC.',
'pr_approvals'),

('iso-a826', 'iso27001-2022', 'A.8.26', 'Application Security Requirements', 
'Information security requirements shall be identified, specified and approved when developing or acquiring applications.

Git Evidence: Security-related discussions in PR reviews, documented security requirements in commits, and security-focused code changes demonstrate security requirements integration.',
'pr_approvals'),

('iso-a827', 'iso27001-2022', 'A.8.27', 'Secure System Architecture and Engineering Principles', 
'Principles for engineering secure systems shall be established, documented, maintained and applied to information system development activities.

Git Evidence: Architecture documentation in repositories, security-related commits, and consistent application of development patterns demonstrate secure engineering.',
'commit_history'),

('iso-a828', 'iso27001-2022', 'A.8.28', 'Secure Coding', 
'Secure coding principles shall be applied to software development. This includes input validation, error handling, and avoiding common vulnerabilities.

Git Evidence: Code review process via PR approvals demonstrates peer review of code for security issues. Review comments and approval workflows show secure coding verification.',
'pr_approvals'),

('iso-a829', 'iso27001-2022', 'A.8.29', 'Security Testing in Development and Acceptance', 
'Security testing processes shall be defined and implemented in the development life cycle, including static analysis, dynamic testing, and penetration testing.

Git Evidence: Test files in repository, CI/CD pipeline configurations, and test-related commits demonstrate security testing integration in development.',
'pr_approvals'),

('iso-a830', 'iso27001-2022', 'A.8.30', 'Outsourced Development', 
'The organization shall direct, monitor and review activities related to outsourced system development, including third-party code and open source components.

Git Evidence: Dependency files tracking third-party packages, external contributor PRs requiring review, and dependency update commits demonstrate third-party code governance.',
'commit_history'),

('iso-a831', 'iso27001-2022', 'A.8.31', 'Separation of Development, Test and Production Environments', 
'Development, testing and production environments shall be separated and secured to reduce risks of unauthorized access or changes.

Git Evidence: Branch structure (dev/staging/main), different branch protection rules per environment, and controlled merge paths demonstrate environment separation.',
'branch_protection'),

('iso-a832', 'iso27001-2022', 'A.8.32', 'Change Management', 
'Changes to information processing facilities and systems shall be subject to change management procedures including assessment, authorization, and documentation.

Git Evidence: PR workflow requiring approvals before merge, documented change descriptions in PR titles/bodies, and reviewer sign-off demonstrate formal change management.',
'pr_approvals'),

('iso-a833', 'iso27001-2022', 'A.8.33', 'Test Information', 
'Test information shall be appropriately selected, protected and managed to ensure validity of testing and protection of operational data.

Git Evidence: Test data and configuration files tracked separately, branch protection on test environments, and test-related commits demonstrate test information management.',
'branch_protection'),

('iso-a834', 'iso27001-2022', 'A.8.34', 'Protection of Information Systems During Audit Testing', 
'Audit tests and assurance activities involving operational systems shall be planned and agreed between testers and management.

Git Evidence: Controlled access to production branches, audit trail of all changes via commit history, and separation of audit/test activities from production demonstrate audit protection.',
'pr_approvals'),

-- Category 8: Logging and Monitoring
('iso-a815', 'iso27001-2022', 'A.8.15', 'Logging', 
'Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.

Git Evidence: Complete commit history serves as an immutable audit log of all code changes, including who made changes, when, and what was modified.',
'commit_history'),

('iso-a816', 'iso27001-2022', 'A.8.16', 'Monitoring Activities', 
'Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken.

Git Evidence: Repository activity tracking, PR review patterns, and commit frequency demonstrate ongoing monitoring of development activities.',
'commit_history');

-- ============================================
-- STEP 4: Essential Eight Controls (ACSC November 2023)
-- Including maturity level context and honest evidence mapping
-- ============================================

INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES

('e8-app-control', 'essential-eight-2023', 'E8-AC', 'Application Control', 
'Prevent execution of unapproved/malicious programs. At Maturity Level 1+, use application control solutions; at ML2+, implement Microsoft''s recommended blocklist and review rulesets annually.

Git Evidence: Branch protection rules limiting who can merge to production branches demonstrate application deployment controls. Required reviews ensure only approved code is deployed.',
'branch_protection'),

('e8-patch-apps', 'essential-eight-2023', 'E8-PA', 'Patch Applications', 
'Patch applications within timeframes: 48 hours for critical/exploited vulnerabilities in internet-facing services; 2 weeks for other high-risk applications (ML1+).

Git Evidence: Commits updating dependencies in package.json, requirements.txt, Gemfile, pom.xml, etc. demonstrate application patching. Frequency and recency of dependency updates indicate patching cadence.',
'commit_history'),

('e8-macros', 'essential-eight-2023', 'E8-MM', 'Configure Microsoft Office Macro Settings', 
'Disable Office macros for users without business need. At ML3, macros must be checked for malicious code before signing.

Git Evidence: LIMITED - This control primarily applies to endpoint configuration. Git can evidence policy documentation and security configuration files, but direct macro control evidence requires endpoint management tools.',
'commit_history'),

('e8-admin-privs', 'essential-eight-2023', 'E8-RAP', 'Restrict Administrative Privileges', 
'Restrict admin privileges based on duties. Implement processes for granting, reviewing, and revoking access. At ML3, use Secure Admin Workstations.

Git Evidence: Branch protection requiring admin enforcement, limited repository admin access, and required reviews for privileged branches demonstrate administrative access controls in the development environment.',
'branch_protection'),

('e8-patch-os', 'essential-eight-2023', 'E8-PO', 'Patch Operating Systems', 
'Patch OS vulnerabilities: 48 hours for critical/exploited vulnerabilities on internet-facing systems; within one month for others (ML2+).

Git Evidence: Infrastructure-as-code commits (Dockerfile, terraform, ansible, etc.) showing OS/base image updates demonstrate operating system patching in deployed environments.',
'commit_history'),

('e8-mfa', 'essential-eight-2023', 'E8-MFA', 'Multi-factor Authentication', 
'MFA for all users accessing important data repositories and systems. At ML2+, use phishing-resistant MFA (security keys, WebAuthn/FIDO2).

Git Evidence: Branch protection rules can require signed commits (GPG/SSH keys). GitHub organization settings requiring 2FA for all members demonstrate MFA enforcement for repository access.',
'branch_protection'),

('e8-hardening', 'essential-eight-2023', 'E8-UAH', 'User Application Hardening', 
'Harden web browsers, disable IE11, block Java/ads from internet. Implement PowerShell logging and command-line auditing at ML2+.

Git Evidence: LIMITED - This control primarily applies to endpoint configuration. Git can evidence security configuration files and hardening scripts, but direct evidence requires endpoint management tools.',
'commit_history'),

('e8-backups', 'essential-eight-2023', 'E8-RB', 'Regular Backups', 
'Perform regular backups of important data, software and configuration. Test restoration capability. Store backups offline or isolated.

Git Evidence: Git repositories inherently provide distributed backups of source code and configuration. Commit history demonstrates regular backup cadence through ongoing commits. Repository mirroring and CI/CD artifacts provide additional backup evidence.',
'commit_history');

-- ============================================
-- STEP 5: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON compliance_controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_evidence_type ON compliance_controls(evidence_type);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_code ON compliance_controls(code);
