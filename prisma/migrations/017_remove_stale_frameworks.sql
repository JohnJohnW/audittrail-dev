-- Remove 6 frameworks that were retired and should no longer appear in the product.
-- ON DELETE CASCADE removes their compliance_controls rows automatically.
DELETE FROM compliance_frameworks
WHERE name IN (
  'SOCI Act',
  'GDPR',
  'NIST SP 800-207',
  'ASD MDA Foundations',
  'NIST AI RMF',
  'EU AI Act'
);

-- Re-clean all compliance_snapshots to strip any keys generated after migration 015.
-- Handles snapshots that were created by the daily sync after the first cleanup ran.
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
