-- Remove non-Australian compliance frameworks and their controls
-- This migration removes SOC 2 (US), NIST CSF (US), and GDPR (EU) frameworks
-- Keeping only ISO 27001 and Essential Eight for the Australian market

-- Delete controls for non-Australian frameworks first (due to foreign key constraints)
DELETE FROM compliance_controls 
WHERE framework_id IN ('soc2-type2', 'nist-csf', 'gdpr');

-- Delete the frameworks themselves
DELETE FROM compliance_frameworks 
WHERE id IN ('soc2-type2', 'nist-csf', 'gdpr');
