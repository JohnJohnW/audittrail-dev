-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Evidence embeddings table (the vector store)
CREATE TABLE IF NOT EXISTS evidence_embeddings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,  -- 'commit' | 'pr' | 'branch_protection' | 'membership_event' | 'ci_artifact' | 'policy_pdf' | 'screenshot' | 'audio_recording'
  source_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding extensions.vector(768) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(source_type, source_id)
);

-- Control embeddings table (framework control descriptions)
CREATE TABLE IF NOT EXISTS control_embeddings (
  id TEXT PRIMARY KEY,
  control_code TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding extensions.vector(768) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(framework_name, control_code)
);

-- HNSW indexes for fast cosine similarity search
CREATE INDEX ON evidence_embeddings USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX ON control_embeddings USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX ON evidence_embeddings (org_id);

-- Supabase RPC function: match evidence to a control embedding via cosine similarity
CREATE OR REPLACE FUNCTION match_evidence(
  query_embedding extensions.vector(768),
  match_org_id TEXT,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id TEXT,
  source_type TEXT,
  source_id TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    evidence_embeddings.id,
    evidence_embeddings.source_type,
    evidence_embeddings.source_id,
    1 - (evidence_embeddings.embedding <=> query_embedding) AS similarity
  FROM evidence_embeddings
  WHERE evidence_embeddings.org_id = match_org_id
    AND 1 - (evidence_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY evidence_embeddings.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

-- Supabase RPC function: match controls to an evidence embedding
CREATE OR REPLACE FUNCTION match_controls(
  query_embedding extensions.vector(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  control_code TEXT,
  framework_name TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    control_embeddings.id,
    control_embeddings.control_code,
    control_embeddings.framework_name,
    1 - (control_embeddings.embedding <=> query_embedding) AS similarity
  FROM control_embeddings
  WHERE 1 - (control_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY control_embeddings.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

-- Uploaded evidence table (for multimodal evidence: PDFs, screenshots, audio, video)
CREATE TABLE IF NOT EXISTS uploaded_evidence (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- 'policy_pdf' | 'screenshot' | 'audio_recording' | 'video_recording'
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  description TEXT,
  control_codes TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON uploaded_evidence (org_id);
CREATE INDEX ON uploaded_evidence (file_type);

-- Evidence mapping feedback table
CREATE TABLE IF NOT EXISTS evidence_mapping_feedback (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  feedback_type TEXT NOT NULL,  -- 'flag' | 'confirm' | 'annotate'
  reason TEXT,
  note TEXT,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON evidence_mapping_feedback (org_id, control_code);

-- Custom frameworks table
CREATE TABLE IF NOT EXISTS custom_frameworks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  controls JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON custom_frameworks (org_id);
