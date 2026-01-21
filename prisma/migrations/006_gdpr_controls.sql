-- GDPR Compliance Framework
INSERT INTO compliance_frameworks (id, name, version, description) VALUES
('gdpr', 'GDPR', '2018', 'General Data Protection Regulation - EU Regulation 2016/679')
ON CONFLICT (name) DO NOTHING;

-- GDPR Articles relevant to code repositories
INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES
('gdpr-art5', 'gdpr', 'Art. 5', 'Principles of Processing', 'Personal data shall be processed lawfully, fairly and in a transparent manner.', 'commit_history'),
('gdpr-art25', 'gdpr', 'Art. 25', 'Data Protection by Design and by Default', 'The controller shall implement appropriate technical and organisational measures to ensure data protection principles are met.', 'pr_approvals'),
('gdpr-art32', 'gdpr', 'Art. 32', 'Security of Processing', 'The controller and processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.', 'branch_protection'),
('gdpr-art33', 'gdpr', 'Art. 33', 'Notification of a Personal Data Breach', 'In the case of a personal data breach, the controller shall without undue delay notify the supervisory authority.', 'commit_history'),
('gdpr-art35', 'gdpr', 'Art. 35', 'Data Protection Impact Assessment', 'Where processing is likely to result in a high risk, the controller shall carry out an assessment of the impact of the envisaged processing operations.', 'pr_approvals')
ON CONFLICT (framework_id, code) DO NOTHING;
