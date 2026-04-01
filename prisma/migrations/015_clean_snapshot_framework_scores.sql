-- Remove stale/removed framework keys from all compliance_snapshots rows.
-- Keeps only the 6 currently-active frameworks; silently drops any other key
-- (e.g. SOCI Act, GDPR, NIST SP 800-207, ASD MDA Foundations, NIST AI RMF, EU AI Act).
UPDATE compliance_snapshots
SET framework_scores = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(framework_scores)
  WHERE key IN (
    'SOC 2',
    'ISO 27001',
    'NIST CSF',
    'NIST SP 800-53',
    'Essential Eight',
    'PCI DSS'
  )
)
WHERE framework_scores IS NOT NULL;
