# Audit Trail

**The AI compliance agent for SaaS teams.**

Audit Trail's AI agent continuously investigates your compliance posture, writes auditor-ready control narratives, drafts your information security policies, and creates remediation PRs, replacing thousands of dollars in GRC consultant fees.

## What it does

- **Agentic compliance assessment**, Claude Opus with extended thinking investigates each control, analyses evidence quality (not just presence), and produces a sufficiency rating with confidence score
- **AI audit narratives**, 200-400 word, auditor-ready control narratives grounded in your actual GitHub evidence
- **AI policy drafting**, complete information security policies scoped for SaaS companies, with Australian regulatory context
- **Remediation PRs**, draft GitHub PRs for technical control gaps, ready for your team to review and merge
- **Human task management**, structured tasks with pre-populated templates for controls requiring human action (access reviews, vendor assessments, training)
- **Audit package assembly**, full audit evidence package with cover letter, control narratives, gap register, and evidence inventory
- **Australian regulatory mapping**, Essential Eight, Privacy Act 1988, APRA CPS 234 (Growth plan)

## Supported frameworks

| Framework            | Controls | Focus                                                |
| -------------------- | -------- | ---------------------------------------------------- |
| SOC 2                | 5        | Access control, change management, monitoring        |
| ISO 27001:2022       | 10       | Secure development, access control, configuration    |
| NIST CSF 2.0         | 7        | Configuration management, software security          |
| NIST SP 800-53 Rev 5 | 7        | Account management, change control, flaw remediation |
| Essential Eight      | 5        | Patching, MFA, application control                   |
| PCI DSS 4.0          | 5        | Vulnerability management, access control             |

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + pgvector)
- **ORM:** Prisma
- **AI:** Anthropic Claude Opus with tool use and extended thinking
- **Embeddings:** Google Gemini (768-dimensional multimodal)
- **Payments:** Stripe
- **Auth:** NextAuth v5 (GitHub OAuth)
- **Deployment:** Vercel
- **GitHub integration:** GitHub App (read-only webhooks)
- **Styling:** Tailwind CSS
- **Monitoring:** Sentry, PostHog

## Pricing

| Plan       | Monthly | Annual | Key limits                                                                               |
| ---------- | ------- | ------ | ---------------------------------------------------------------------------------------- |
| Free       | $0      | $0     | 2 repos, 2 frameworks, no AI                                                             |
| Starter    | $99     | $990   | 5 repos, all frameworks, 2 agent runs/month, 5 policy drafts/month                       |
| Growth     | $199    | $1,990 | Unlimited repos, unlimited agent runs, unlimited policies, Australian regulatory mapping |
| Enterprise | Custom  | Custom | SSO, IRAP, HIPAA, custom frameworks, dedicated support                                   |

## Architecture

```
GitHub Webhooks → Evidence Collection → Supabase (PostgreSQL + pgvector)
                                              ↓
                                    Pattern Matching + Embeddings
                                              ↓
                                    Real-time Compliance Dashboard
                                              ↓
                              Claude Opus Agent (tool use + extended thinking)
                                              ↓
                                    Control Assessments + Narratives
                                              ↓
                                    Audit Package + Human Tasks
```

The agent uses a multi-step agentic loop:

1. Queries evidence via tools (PR quality signals, branch protection, deployment approvals, patch lag)
2. Reasons about sufficiency using extended thinking
3. Writes an auditor-ready narrative citing specific evidence
4. Creates human tasks for controls requiring manual action
5. Saves the assessment with a confidence score

## Local development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in required values (see .env.example for descriptions)

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed compliance frameworks and controls
npm run db:seed

# Start development server
npm run dev
```

## Environment variables

See `.env.example` for all required variables. Key additions for the AI agent:

- `ANTHROPIC_API_KEY`, required for AI agent and policy generation
- `STRIPE_STARTER_MONTHLY_PRICE_ID`, Stripe price for Starter monthly
- `STRIPE_STARTER_ANNUAL_PRICE_ID`, Stripe price for Starter annual
- `STRIPE_GROWTH_MONTHLY_PRICE_ID`, Stripe price for Growth monthly
- `STRIPE_GROWTH_ANNUAL_PRICE_ID`, Stripe price for Growth annual

## License

Proprietary. All rights reserved.
