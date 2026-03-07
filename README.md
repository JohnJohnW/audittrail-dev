# Audit Trail

> Turn GitHub activity into audit-ready compliance evidence — automatically.

Audit Trail connects to your GitHub repositories and maps commits, pull requests, code reviews, and branch protection rules to the controls inside 8 major compliance frameworks. The result is a live evidence dashboard, exportable PDF/CSV reports, and shareable read-only report links you can hand directly to an auditor.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Data Flow](#data-flow)
- [Compliance Frameworks](#compliance-frameworks)
- [Evidence Mapping](#evidence-mapping)
- [Database Schema](#database-schema)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Available Scripts](#available-scripts)
- [License](#license)

---

## How It Works

```mermaid
flowchart LR
    A[Developer pushes code] --> B[GitHub]
    B -->|OAuth read-only| C[Audit Trail Sync]
    C --> D[(Supabase DB)]
    D --> E[Compliance Engine]
    E --> F[Evidence Dashboard]
    E --> G[PDF / CSV Export]
    E --> H[Shareable Report Link]
    H --> I[Auditor]
```

1. **Connect** — Sign in with GitHub and select the repositories you want to track.
2. **Sync** — Audit Trail pulls commits, pull requests, code reviews, and branch protection settings via the GitHub API (read-only; we never access your source code).
3. **Map** — The compliance engine scores each of the 63 controls across 8 frameworks based on your real activity.
4. **Report** — View a live dashboard, generate a PDF/CSV for your auditor, or share a public read-only link that requires no login.

---

## Features

| Feature                          | Free | Pro |
| -------------------------------- | ---- | --- |
| Up to 3 repositories             | ✅   | ✅  |
| Unlimited repositories           | —    | ✅  |
| All 8 compliance frameworks      | ✅   | ✅  |
| Live evidence dashboard          | ✅   | ✅  |
| Gap analysis with action steps   | ✅   | ✅  |
| PDF exports                      | —    | ✅  |
| CSV exports                      | —    | ✅  |
| Shareable read-only report links | —    | ✅  |
| Email notifications              | ✅   | ✅  |
| API key access                   | ✅   | ✅  |
| Priority support                 | —    | ✅  |

### Key Highlights

- **Zero source-code access** — only metadata is read (commit messages, PR titles, review states, branch rules). Your actual code is never transmitted or stored.
- **Auto-sync via cron** — repositories sync on a daily schedule; manual sync is one click.
- **Gap analysis** — every control with missing or partial evidence shows a numbered action list explaining exactly what your team needs to do in GitHub to generate evidence.
- **Shareable reports** — generate a tokenised public URL (no login required) to share a read-only compliance snapshot with auditors or stakeholders. Links can be revoked at any time.
- **Evidence filtering** — public reports support filtering controls by Covered / Partial / Missing status, with per-framework accordion sections.
- **Email notifications** — configurable per-event alerts: sync failures, weekly digest, export-ready, and subscription updates.

---

## Architecture

```mermaid
graph TB
    subgraph Client ["Browser (React Client Components)"]
        LP[Landing Page]
        DB[Dashboard]
        EV[Evidence Explorer]
        CO[Compliance Score]
        EX[Export Builder]
        ST[Settings & Billing]
        PR[Public Report\n/report/:token]
    end

    subgraph Server ["Next.js App Router (Server)"]
        MW[Middleware\nauth guard]
        SC[Server Components\nlayout · report page]
        AR[API Routes\n/api/...]
        CJ[Cron Job\n/api/cron/sync]
    end

    subgraph Lib ["Core Libraries"]
        CE[compliance.ts\nevidence mapping]
        GA[gap-analysis.ts\naction recommendations]
        GH[github.ts\nAPI client]
        NF[notifications.ts\nemail dispatch]
        SL[stripe.ts\nbilling]
        LG[logger.ts\nstructured logging]
    end

    subgraph Ext ["External Services"]
        GitHub[(GitHub API)]
        Supa[(Supabase\nPostgres)]
        Stripe[(Stripe)]
        Resend[(Resend\nemail)]
        Redis[(Upstash Redis\noptional)]
    end

    Client --> MW
    MW --> Server
    Server --> Lib
    GH --> GitHub
    CE --> Supa
    AR --> Supa
    SL --> Stripe
    NF --> Resend
    AR -.->|cache + rate-limit| Redis
```

---

## Data Flow

```mermaid
sequenceDiagram
    actor User
    participant App as Audit Trail
    participant GH as GitHub API
    participant DB as Supabase
    participant Engine as Compliance Engine

    User->>App: Sign in with GitHub OAuth
    App->>GH: Request read:user + repo scopes
    GH-->>App: Access token
    App->>DB: Store token, create org & subscription

    User->>App: Add repositories
    App->>GH: List user repos
    GH-->>App: Repository list
    App->>DB: Save selected repos

    User->>App: Sync Now (or daily cron runs)
    App->>GH: GET commits, PRs, reviews,\nbranch protection
    GH-->>App: Raw metadata
    App->>DB: Upsert commits, pull_requests,\nreviews, branch_protection

    User->>App: View Compliance Score
    App->>Engine: getComplianceEvidence(orgId)
    Engine->>DB: Load all activity
    DB-->>Engine: Commits · PRs · reviews · branch rules
    Engine-->>App: 63 scored controls + gap recommendations
    App-->>User: Dashboard with score, evidence, gaps

    User->>App: Generate shareable link
    App->>DB: Create ShareableReport (token)
    App-->>User: Public URL /report/:token

    User->>App: Export PDF/CSV (Pro)
    App->>Engine: Build report data
    Engine-->>App: Formatted evidence
    App-->>User: Download file
```

---

## Compliance Frameworks

Audit Trail supports **8 frameworks** covering **63 controls** in total.

| Framework                                                                                                              | Controls | Focus                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| [ISO 27001:2022](https://www.iso.org/standard/27001)                                                                   | 19       | Information security management — Annex A.5 & A.8         |
| [Essential Eight](https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight) | 6        | ACSC baseline strategies for Australian organisations     |
| [NIST CSF 2.0](https://www.nist.gov/cyberframework)                                                                    | 7        | US cybersecurity framework — Govern, Protect, Detect      |
| [NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)                                | 7        | Federal controls — AC, CA, CM, SA, SI families            |
| [SOC 2](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)           | 5        | Trust Services Criteria — CC6, CC7, CC8                   |
| [GDPR](https://gdpr.eu/)                                                                                               | 9        | EU data protection — Art. 25 (privacy by design), Art. 32 |
| [SOCI Act](https://www.homeaffairs.gov.au/cyber-security-subsite/files/security-of-critical-infrastructure-act.pdf)    | 4        | AU critical infrastructure protection — PSO 1–4           |
| [PCI DSS 4.0](https://www.pcisecuritystandards.org/)                                                                   | 6        | Payment card industry — Requirements 6, 7, 8              |

### Control Coverage Map

```mermaid
mindmap
  root((Audit Trail\n63 controls))
    ISO 27001
      A.5 Org Controls
        A.5.15 Access Control
        A.5.16 Identity Mgmt
        A.5.17 Auth Information
        A.5.18 Access Rights
      A.8 Tech Controls
        A.8.4 Source Code Access
        A.8.9 Config Management
        A.8.25 Secure Dev Lifecycle
        A.8.28 Secure Coding
        A.8.32 Change Management
        +9 more
    Essential Eight
      E8-AC Application Control
      E8-PA Patch Applications
      E8-RAP Restrict Admin
      E8-PO Patch OS
      E8-RB Regular Backups
      E8-MFA Authentication
    NIST CSF 2.0
      CSF-PR.PS-01 Policy
      CSF-PR.PS-02 Processes
      CSF-DE.CM-09 Monitoring
    NIST 800-53
      AC-2 Account Management
      CM-3 Config Change Control
      SA-10 Developer Config Mgmt
    SOC 2
      CC6 Logical Access
      CC7 System Operations
      CC8 Change Management
    GDPR
      Art 25 Privacy by Design
      Art 32 Security Measures
    SOCI Act
      PSO 1-4 Security Obligations
    PCI DSS 4.0
      Req 6 Secure Systems
      Req 7 Access Control
      Req 8 Identity Management
```

---

## Evidence Mapping

The compliance engine maps four types of GitHub artifacts to control requirements:

```mermaid
flowchart LR
    subgraph Artifacts ["GitHub Artifacts"]
        C[Commits\nsha · message · author\ntimestamp · GPG verified]
        PR[Pull Requests\nreview count · approvals\nmerge strategy · labels]
        BP[Branch Protection\nrequired reviews\nstatus checks · admin enforce]
        CI[CI Workflow Names\nbuild · test · scan\ndeploy · lint]
    end

    subgraph Engine ["Compliance Engine\ncompliance.ts"]
        KW[Keyword matching\non commit messages]
        RC[Review count\nthreshold checks]
        BP2[Branch protection\nproperty checks]
        WF[Workflow name\npattern matching]
    end

    subgraph Score ["Evidence Status"]
        HE["✅ Has Evidence\nStrong direct evidence"]
        PA["🟡 Partial\nSome but incomplete"]
        LI["🟠 Limited\nMinimal activity"]
        NE["🔴 No Evidence\n+ Gap analysis actions"]
    end

    C --> KW
    PR --> RC
    BP --> BP2
    CI --> WF

    KW --> HE
    KW --> PA
    RC --> HE
    RC --> PA
    BP2 --> HE
    BP2 --> LI
    WF --> HE
    WF --> NE
```

### Gap Analysis

When a control has `partial`, `limited`, or `no_evidence` status, Audit Trail surfaces a tailored recommendation panel inside the Evidence Explorer. Each recommendation includes:

- A **summary** of what the control requires
- A numbered **action list** of concrete steps to take in GitHub
- The specific commit keywords, PR patterns, or branch settings that will generate evidence

---

## Database Schema

```mermaid
erDiagram
    Organization ||--o{ OrgMembership : has
    Organization ||--o| GitHubConnection : has
    Organization ||--o{ Repository : owns
    Organization ||--o| Subscription : has
    Organization ||--o{ Export : generates
    Organization ||--o{ ComplianceSnapshot : tracks
    Organization ||--o{ ShareableReport : creates
    Organization ||--o| NotificationPreferences : configures

    User ||--o{ OrgMembership : "belongs to"
    User ||--o{ ApiKey : owns

    Repository ||--o{ Commit : contains
    Repository ||--o{ PullRequest : contains
    Repository ||--o{ BranchProtection : has

    PullRequest ||--o{ Review : receives

    ComplianceFramework ||--o{ ComplianceControl : defines

    Organization {
        string id PK
        string name
        string slug UK
        datetime createdAt
    }
    Repository {
        string id PK
        string orgId FK
        string fullName
        boolean isActive
        datetime lastSyncedAt
    }
    Commit {
        string id PK
        string repoId FK
        string sha
        string message
        boolean verified
        datetime committedAt
    }
    PullRequest {
        string id PK
        string repoId FK
        bigint githubPrId
        string state
        datetime mergedAt
    }
    BranchProtection {
        string id PK
        string repoId FK
        boolean requirePullRequest
        int requiredApprovals
        boolean enforceAdmins
    }
    ShareableReport {
        string id PK
        string orgId FK
        string token UK
        string title
        datetime expiresAt
    }
    ComplianceSnapshot {
        string id PK
        string orgId FK
        date snapshotDate
        int overallScore
        json frameworkScores
    }
```

---

## Tech Stack

| Layer         | Technology                                                                      | Notes                                       |
| ------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| Framework     | [Next.js 14](https://nextjs.org/) App Router                                    | Server + client components, API routes      |
| Language      | TypeScript (strict)                                                             | Full type coverage                          |
| Database      | [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/) | Free tier works for dev                     |
| ORM           | [Prisma](https://www.prisma.io/)                                                | Type-safe queries, schema-as-code           |
| Auth          | [NextAuth.js v5](https://authjs.dev/)                                           | GitHub OAuth, JWT sessions, Prisma adapter  |
| Payments      | [Stripe](https://stripe.com/)                                                   | Subscriptions, billing portal, webhooks     |
| Email         | [Resend](https://resend.com/)                                                   | Transactional emails via REST API           |
| Styling       | [Tailwind CSS](https://tailwindcss.com/)                                        | Utility-first, custom accent colour         |
| Animations    | [Framer Motion](https://www.framer.com/motion/)                                 | Page transitions, micro-interactions        |
| Charts        | [Recharts](https://recharts.org/)                                               | Bar + pie charts for compliance scores      |
| PDF           | [@react-pdf/renderer](https://react-pdf.org/)                                   | Server-side PDF generation                  |
| Caching       | [Upstash Redis](https://upstash.com/)                                           | Optional — falls back gracefully if unset   |
| Rate Limiting | Upstash Ratelimit                                                               | Optional — sliding window per endpoint type |
| Hosting       | [Vercel](https://vercel.com/)                                                   | Zero-config, cron jobs, edge middleware     |
| Analytics     | [Vercel Analytics](https://vercel.com/analytics)                                | Privacy-friendly, no cookie banner needed   |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database ([Supabase](https://supabase.com) free tier recommended)
- A GitHub OAuth App ([create one](https://github.com/settings/applications/new))
- A [Stripe](https://stripe.com) account (test mode is fine for local dev)
- A [Resend](https://resend.com) account (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/JohnJohnW/audittrail-dev.git
cd audittrail-dev
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the following:

```bash
# ─── Database ─────────────────────────────────────────────────────────────────
# Use the "Transaction" pooler URL for DATABASE_URL (port 6543)
# Use the "Session" direct URL for DIRECT_URL (port 5432)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].supabase.com:5432/postgres"

# ─── Auth ─────────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=""          # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# ─── GitHub OAuth ─────────────────────────────────────────────────────────────
# Callback URL: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# ─── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."     # from: stripe listen --forward-to ...
STRIPE_PRO_PRICE_ID="price_..."

# ─── Email ────────────────────────────────────────────────────────────────────
RESEND_API_KEY="re_..."
EMAIL_FROM="Audit Trail <noreply@yourdomain.com>"

# ─── Cron ─────────────────────────────────────────────────────────────────────
CRON_SECRET=""              # openssl rand -hex 32

# ─── Optional: Redis (Upstash) ────────────────────────────────────────────────
# Enables API caching and rate limiting. App works without these.
# UPSTASH_REDIS_REST_URL=""
# UPSTASH_REDIS_REST_TOKEN=""
```

### 3. Set up the database

```bash
# Push the Prisma schema to Supabase
npx prisma db push

# Seed all 8 frameworks and 63 compliance controls
npm run db:seed

# Regenerate the Prisma client after schema changes
npx prisma generate
```

### 4. Start the development server

```bash
npm run dev
# → http://localhost:3000
```

### 5. Forward Stripe webhooks (local testing)

```bash
# Install the Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the printed webhook secret into STRIPE_WEBHOOK_SECRET
```

---

## Project Structure

```
audittrail-dev/
├── app/
│   ├── (dashboard)/            # Protected app pages (auth-gated by middleware)
│   │   ├── dashboard/          # Overview: stats, last sync, compliance trend
│   │   ├── repositories/       # Connect and manage GitHub repositories
│   │   ├── evidence/           # Per-control evidence explorer with gap analysis
│   │   ├── compliance/         # Score charts, framework breakdown, share button
│   │   ├── exports/            # PDF / CSV generation (Pro plan)
│   │   ├── settings/           # Billing, notifications, API keys
│   │   └── onboarding/         # First-run setup wizard with auto-redirect
│   ├── api/
│   │   ├── auth/               # NextAuth.js handlers ([...nextauth])
│   │   ├── compliance/score/   # Overall + per-framework score
│   │   ├── evidence/           # Full evidence data (controls + items)
│   │   ├── exports/            # PDF/CSV generation endpoint
│   │   ├── github/             # Repository list + manual sync trigger
│   │   ├── reports/
│   │   │   ├── shareable/      # CRUD for shareable report tokens
│   │   │   └── public/[token]/ # Public evidence summary (no auth)
│   │   ├── settings/           # Org info + notification preferences
│   │   ├── stripe/             # Checkout session + billing portal
│   │   ├── webhooks/stripe/    # Stripe event webhook handler
│   │   ├── keys/               # API key management (create, list, revoke)
│   │   ├── onboarding/         # Onboarding step tracking
│   │   ├── health/             # Health check endpoint
│   │   └── cron/sync/          # Scheduled daily auto-sync
│   ├── auth/                   # Sign-in, sign-out, error pages
│   ├── report/[token]/         # Public shareable report page (no auth required)
│   ├── changelog/              # Release history
│   ├── privacy/                # Privacy policy
│   ├── terms/                  # Terms of service
│   └── page.tsx                # Landing page (server component)
├── components/
│   ├── landing/                # Hero, Pricing, FAQ, SocialProof, etc.
│   ├── dashboard/              # DashboardNav, SyncButton, DashboardContent
│   ├── compliance/             # ShareReportButton, PublicReportControls
│   └── ui/                     # Design system: Card, Button, Badge, Input, etc.
├── lib/
│   ├── compliance.ts           # Core evidence-mapping engine (63 controls)
│   ├── gap-analysis.ts         # Per-control remediation recommendations
│   ├── github.ts               # GitHub REST API client
│   ├── auth.ts                 # NextAuth configuration + callbacks
│   ├── db.ts                   # Prisma singleton (serverless-safe)
│   ├── notifications.ts        # Resend email dispatch helpers
│   ├── stripe.ts               # Stripe checkout + portal helpers
│   ├── cache.ts                # Upstash Redis cache wrapper
│   ├── rate-limit.ts           # Upstash sliding-window rate limiter
│   ├── logger.ts               # Structured logging (wraps console.*)
│   ├── error-handler.ts        # AppError class + API error helper
│   ├── pdf.tsx                 # PDF report renderer
│   └── api/request.ts          # API request parsing helpers
├── prisma/
│   ├── schema.prisma           # Full database schema
│   └── seed.ts                 # Framework + control seed data
├── types/
│   └── compliance.ts           # Shared TypeScript types (EvidenceStatus, etc.)
├── middleware.ts               # Auth routing guard (dashboard + API)
└── vercel.json                 # Cron schedule configuration
```

---

## Deployment

### Vercel (Recommended)

1. Fork this repo and push to your GitHub account.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Set all environment variables from `.env.example` in the Vercel project settings.
4. Deploy — Vercel detects Next.js automatically.

### Cron Job

Add a `vercel.json` at the repo root to run daily syncs:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 2 * * *"
    }
  ]
}
```

The endpoint validates `Authorization: Bearer $CRON_SECRET` — Vercel Cron sends this automatically.

### Stripe Webhook

1. In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), add endpoint:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
2. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
3. Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

### GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Homepage URL** to your production domain.
3. Set **Authorization callback URL** to:
   ```
   https://yourdomain.com/api/auth/callback/github
   ```
4. Copy the Client ID and Client Secret into your environment variables.

---

## Available Scripts

```bash
npm run dev           # Start development server (http://localhost:3000)
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run type-check    # TypeScript type check (no emit)
npm run test          # Run unit tests (Vitest)
npm run test:e2e      # Run end-to-end tests (Playwright)
npm run db:push       # Push Prisma schema to database
npm run db:seed       # Seed frameworks and all 63 controls
npm run db:studio     # Open Prisma Studio (local DB browser)
npm run db:generate   # Regenerate Prisma client after schema changes
```

---

## License

Proprietary — All rights reserved © 2026 Audit Trail.
