-- NIST Cybersecurity Framework
INSERT INTO compliance_frameworks (id, name, version, description) VALUES
('nist-csf', 'NIST Cybersecurity Framework', '1.1', 'Framework for Improving Critical Infrastructure Cybersecurity')
ON CONFLICT (name) DO NOTHING;

-- NIST CSF Functions and Categories
INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES
('nist-id-am', 'nist-csf', 'ID.AM', 'Asset Management', 'The data, personnel, devices, systems, and facilities that enable the organization to achieve business purposes are identified and managed consistent with their relative importance to organizational objectives and the organization''s risk strategy.', 'commit_history'),
('nist-id-be', 'nist-csf', 'ID.BE', 'Business Environment', 'The organization''s mission, objectives, stakeholders, and activities are understood and prioritized; this information is used to inform cybersecurity roles, responsibilities, and risk management decisions.', 'commit_history'),
('nist-pr-ac', 'nist-csf', 'PR.AC', 'Identity Management and Access Control', 'Access to physical and logical assets and associated facilities is limited to authorized users, processes, or devices, and is managed consistent with the assessed risk of unauthorized access.', 'branch_protection'),
('nist-pr-ds', 'nist-csf', 'PR.DS', 'Data Security', 'Data-at-rest and data-in-transit are protected.', 'commit_history'),
('nist-de-ae', 'nist-csf', 'DE.AE', 'Anomalies and Events', 'Anomalous activity is detected and its potential impact is understood.', 'commit_history'),
('nist-de-cm', 'nist-csf', 'DE.CM', 'Security Continuous Monitoring', 'The information system and assets are monitored to identify cybersecurity events and verify the effectiveness of protective measures.', 'commit_history'),
('nist-rs-co', 'nist-csf', 'RS.CO', 'Response Planning', 'Response processes and procedures are executed and maintained, to ensure response to detected cybersecurity events.', 'pr_approvals'),
('nist-rc-rp', 'nist-csf', 'RC.RP', 'Recovery Planning', 'Recovery processes and procedures are executed and maintained to ensure restoration of systems or assets affected by cybersecurity events.', 'commit_history')
ON CONFLICT (framework_id, code) DO NOTHING;
