-- Additional compliance controls for better coverage

-- ISO 27001 Additional Controls
INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES
('iso-a88', 'iso27001-2022', 'A.8.8', 'Management of Technical Vulnerabilities', 'Information about technical vulnerabilities of information systems in use shall be obtained, the organization''s exposure to such vulnerabilities shall be evaluated and appropriate measures taken.', 'commit_history'),
('iso-a815', 'iso27001-2022', 'A.8.15', 'Logging', 'Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.', 'commit_history'),
('iso-a816', 'iso27001-2022', 'A.8.16', 'Monitoring Activities', 'Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents.', 'commit_history'),
('iso-a833', 'iso27001-2022', 'A.8.33', 'Test Information', 'Test information shall be appropriately selected, protected and managed.', 'branch_protection'),
('iso-a834', 'iso27001-2022', 'A.8.34', 'Protection of Information Systems During Audit Testing', 'Audit tests and other assurance activities involving assessment of operational systems shall be planned and agreed between the tester and appropriate management.', 'pr_approvals'),
('iso-a516', 'iso27001-2022', 'A.5.16', 'Identity Management', 'The full life cycle of identities shall be managed.', 'branch_protection'),
('iso-a518', 'iso27001-2022', 'A.5.18', 'Access Rights', 'Access rights to information and other associated assets shall be provisioned, reviewed, modified and removed in accordance with the organization''s topic-specific policy on and rules for access control.', 'branch_protection')
ON CONFLICT (framework_id, code) DO NOTHING;

-- Essential Eight Additional Controls
INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES
('e8-3', 'essential-eight-2023', 'E8-3', 'Configure Microsoft Office Macro Settings', 'Microsoft Office macros are disabled for users that do not have a demonstrated business requirement. Evidenced through repository security policies and code review processes.', 'pr_approvals'),
('e8-6', 'essential-eight-2023', 'E8-6', 'Multi-factor Authentication', 'Multi-factor authentication is used to authenticate users of remote access solutions, privileged accounts and important data repositories.', 'branch_protection'),
('e8-7', 'essential-eight-2023', 'E8-7', 'User Application Hardening', 'Web browsers do not process Java from the internet. Web browsers do not process web advertisements from the internet. Internet Explorer 11 does not process content from the internet.', 'commit_history')
ON CONFLICT (framework_id, code) DO NOTHING;

-- Add indexes for faster queries if not exists
CREATE INDEX IF NOT EXISTS idx_compliance_controls_evidence_type ON compliance_controls(evidence_type);
