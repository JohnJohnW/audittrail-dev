-- Seed compliance frameworks and controls

-- ISO 27001:2022 Framework
INSERT INTO compliance_frameworks (id, name, version, description)
VALUES (
  'iso27001-2022',
  'ISO 27001',
  '2022',
  'Information security management system standard. Focus on Annex A controls relevant to software development.'
) ON CONFLICT (name) DO NOTHING;

-- Essential Eight Framework  
INSERT INTO compliance_frameworks (id, name, version, description)
VALUES (
  'essential-eight-2023',
  'Essential Eight',
  '2023',
  'Australian Cyber Security Centre mitigation strategies to protect against cyber threats.'
) ON CONFLICT (name) DO NOTHING;

-- ISO 27001 Controls
INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES
('iso-a89', 'iso27001-2022', 'A.8.9', 'Configuration Management', 'Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.', 'branch_protection'),
('iso-a832', 'iso27001-2022', 'A.8.32', 'Change Management', 'Changes to information processing facilities and information systems shall be subject to change management procedures.', 'pr_approvals'),
('iso-a84', 'iso27001-2022', 'A.8.4', 'Access to Source Code', 'Read and write access to source code, development tools and software libraries shall be appropriately managed.', 'branch_protection'),
('iso-a825', 'iso27001-2022', 'A.8.25', 'Secure Development Life Cycle', 'Rules for the secure development of software and systems shall be established and applied.', 'pr_approvals'),
('iso-a826', 'iso27001-2022', 'A.8.26', 'Application Security Requirements', 'Information security requirements shall be identified, specified and approved when developing or acquiring applications.', 'pr_approvals'),
('iso-a827', 'iso27001-2022', 'A.8.27', 'Secure System Architecture and Engineering Principles', 'Principles for engineering secure systems shall be established, documented, maintained and applied to any information system development activities.', 'commit_history'),
('iso-a828', 'iso27001-2022', 'A.8.28', 'Secure Coding', 'Secure coding principles shall be applied to software development.', 'pr_approvals'),
('iso-a829', 'iso27001-2022', 'A.8.29', 'Security Testing in Development and Acceptance', 'Security testing processes shall be defined and implemented in the development life cycle.', 'pr_approvals'),
('iso-a831', 'iso27001-2022', 'A.8.31', 'Separation of Development, Test and Production Environments', 'Development, testing and production environments shall be separated and secured.', 'branch_protection'),
('iso-a517', 'iso27001-2022', 'A.5.17', 'Authentication Information', 'Allocation and management of authentication information shall be controlled by a management process.', 'branch_protection')
ON CONFLICT (framework_id, code) DO NOTHING;

-- Essential Eight Controls
INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES
('e8-1', 'essential-eight-2023', 'E8-1', 'Application Control', 'Application control to prevent execution of unapproved/malicious programs including .exe, DLL, scripts and installers. Evidenced through branch protection rules limiting who can deploy.', 'branch_protection'),
('e8-2', 'essential-eight-2023', 'E8-2', 'Patch Applications', 'Patch applications (e.g. Flash, web browsers, Microsoft Office, Java, PDF viewers) within 48 hours if a security vulnerability is assessed as extreme risk, or within two weeks otherwise.', 'commit_history'),
('e8-4', 'essential-eight-2023', 'E8-4', 'Restrict Administrative Privileges', 'Restrict administrative privileges to operating systems and applications based on user duties. Regularly revalidate the need for privileges.', 'branch_protection'),
('e8-5', 'essential-eight-2023', 'E8-5', 'Patch Operating Systems', 'Patch operating systems within 48 hours if a security vulnerability is assessed as extreme risk, or within two weeks otherwise.', 'commit_history'),
('e8-8', 'essential-eight-2023', 'E8-8', 'Regular Backups', 'Perform regular backups of important data, software and configuration settings. Test restoration of backups.', 'commit_history')
ON CONFLICT (framework_id, code) DO NOTHING;
