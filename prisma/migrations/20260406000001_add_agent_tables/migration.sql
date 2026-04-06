-- CreateTable: agent_runs
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "trigger_event" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "frameworks" TEXT[],
    "controls_assessed" INTEGER NOT NULL DEFAULT 0,
    "controls_sufficient" INTEGER NOT NULL DEFAULT 0,
    "controls_partial" INTEGER NOT NULL DEFAULT 0,
    "controls_insufficient" INTEGER NOT NULL DEFAULT 0,
    "model_used" TEXT NOT NULL DEFAULT 'claude-opus-4-20250514',
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: control_assessments
CREATE TABLE "control_assessments" (
    "id" TEXT NOT NULL,
    "agent_run_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "framework_name" TEXT NOT NULL,
    "control_name" TEXT NOT NULL,
    "sufficiency_rating" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "evidence_records" JSONB,
    "agent_reasoning" TEXT,
    "audit_narrative" TEXT,
    "remediation_plan" TEXT,
    "remediation_type" TEXT,
    "remediation_artifact" JSONB,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "human_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "human_reviewed_at" TIMESTAMP(3),
    "human_reviewer_id" TEXT,
    "human_notes" TEXT,

    CONSTRAINT "control_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: human_tasks
CREATE TABLE "human_tasks" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "control_name" TEXT NOT NULL,
    "framework_name" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pre_populated_template" JSONB,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assigned_to_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "evidence_url" TEXT,
    "agent_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "human_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_usage_logs
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "agent_run_id" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'claude-opus-4-20250514',
    "tokens_input" INTEGER NOT NULL DEFAULT 0,
    "tokens_output" INTEGER NOT NULL DEFAULT 0,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: generated_policies
CREATE TABLE "generated_policies" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "framework_name" TEXT NOT NULL,
    "policy_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "model_used" TEXT NOT NULL DEFAULT 'claude-opus-4-20250514',
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "approved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_policies_pkey" PRIMARY KEY ("id")
);

-- Add columns to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "agent_runs_this_month" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscriptions" ADD COLUMN "agent_runs_reset_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN "policy_drafts_this_month" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscriptions" ADD COLUMN "policy_drafts_reset_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "agent_runs_org_id_status_idx" ON "agent_runs"("org_id", "status");
CREATE INDEX "agent_runs_org_id_created_at_idx" ON "agent_runs"("org_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "control_assessments_agent_run_id_control_code_key" ON "control_assessments"("agent_run_id", "control_code");
CREATE INDEX "control_assessments_org_id_control_code_framework_name_idx" ON "control_assessments"("org_id", "control_code", "framework_name");
CREATE INDEX "control_assessments_agent_run_id_idx" ON "control_assessments"("agent_run_id");

-- CreateIndex
CREATE INDEX "human_tasks_org_id_status_idx" ON "human_tasks"("org_id", "status");
CREATE INDEX "human_tasks_assigned_to_id_status_idx" ON "human_tasks"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "ai_usage_logs_org_id_created_at_idx" ON "ai_usage_logs"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "generated_policies_org_id_framework_name_idx" ON "generated_policies"("org_id", "framework_name");

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "control_assessments" ADD CONSTRAINT "control_assessments_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "control_assessments" ADD CONSTRAINT "control_assessments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "control_assessments" ADD CONSTRAINT "control_assessments_human_reviewer_id_fkey" FOREIGN KEY ("human_reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "human_tasks" ADD CONSTRAINT "human_tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "human_tasks" ADD CONSTRAINT "human_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "human_tasks" ADD CONSTRAINT "human_tasks_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "generated_policies" ADD CONSTRAINT "generated_policies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generated_policies" ADD CONSTRAINT "generated_policies_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS Policies (matching existing pattern)
ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation_agent_runs" ON "agent_runs" USING (org_id = current_setting('app.current_org_id', true));

ALTER TABLE "control_assessments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation_control_assessments" ON "control_assessments" USING (org_id = current_setting('app.current_org_id', true));

ALTER TABLE "human_tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation_human_tasks" ON "human_tasks" USING (org_id = current_setting('app.current_org_id', true));

ALTER TABLE "ai_usage_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation_ai_usage_logs" ON "ai_usage_logs" USING (org_id = current_setting('app.current_org_id', true));

ALTER TABLE "generated_policies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation_generated_policies" ON "generated_policies" USING (org_id = current_setting('app.current_org_id', true));
