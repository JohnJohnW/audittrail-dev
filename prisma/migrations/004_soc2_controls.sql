-- SOC 2 Type II Compliance Framework
INSERT INTO compliance_frameworks (id, name, version, description) VALUES
('soc2-type2', 'SOC 2 Type II', '2023', 'Service Organization Control 2 - Trust Services Criteria')
ON CONFLICT (name) DO NOTHING;

-- SOC 2 Common Criteria (CC) Controls
INSERT INTO compliance_controls (id, framework_id, code, title, description, evidence_type) VALUES
('soc2-cc1', 'soc2-type2', 'CC1.1', 'Control Environment', 'The entity demonstrates a commitment to integrity and ethical values.', 'commit_history'),
('soc2-cc2', 'soc2-type2', 'CC2.1', 'Communication and Information', 'The entity obtains or generates and uses relevant, quality information to support the functioning of internal control.', 'commit_history'),
('soc2-cc3', 'soc2-type2', 'CC3.1', 'Risk Assessment', 'The entity specifies suitable objectives and identifies risks to achievement of those objectives.', 'pr_approvals'),
('soc2-cc4', 'soc2-type2', 'CC4.1', 'Monitoring Activities', 'The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.', 'commit_history'),
('soc2-cc5', 'soc2-type2', 'CC5.1', 'Control Activities', 'The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives.', 'branch_protection'),
('soc2-cc6', 'soc2-type2', 'CC6.1', 'Logical and Physical Access Controls', 'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity''s objectives.', 'branch_protection'),
('soc2-cc7', 'soc2-type2', 'CC7.1', 'System Operations', 'The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software to meet the entity''s objectives.', 'pr_approvals')
ON CONFLICT (framework_id, code) DO NOTHING;
