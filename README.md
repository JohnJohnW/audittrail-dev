# Audit Trail

> Turn GitHub activity into audit-ready compliance evidence. Automatically.

Audit Trail connects to your GitHub repositories and maps commits, pull requests, code reviews, and branch protection rules to the controls inside 8 major compliance frameworks. The result is a live evidence dashboard, exportable PDF/CSV reports, and shareable read-only report links you can hand directly to an auditor.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Business Model](#business-model)
- [Features](#features)
- [Architecture](#architecture)
- [Data Flow](#data-flow)
- [Authentication Flow](#authentication-flow)
- [Subscription Lifecycle](#subscription-lifecycle)
- [Compliance Frameworks](#compliance-frameworks)
- [Evidence Mapping](#evidence-mapping)
- [Compliance Scoring](#compliance-scoring)
- [Database Schema](#database-schema)
- [API Surface](#api-surface)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
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

1. **Connect**: Sign in with GitHub and select the repositories you want to track.
2. **Sync**: Audit Trail pulls commits, pull requests, code reviews, and branch protection settings via the GitHub API (read-only; we never access your source code).
3. **Map**: The compliance engine scores each of the 63 controls across 8 frameworks based on your real activity.
4. **Report**: View a live dashboard, generate a PDF/CSV for your auditor, or share a public read-only link that requires no login.

---

## Business Model

Audit Trail is a freemium SaaS that removes the manual labour of compliance evidence collection. Engineers stop taking screenshots and maintaining spreadsheets; the product does it automatically from the Git activity they're already producing.

```mermaid
graph LR
    subgraph Pain ["The Problem"]
        P1["Audit prep takes weeks\nper framework per year"]
        P2["Evidence lives in screenshots,\nspreadsheets, and memory"]
        P3["Every new framework means\nstarting from scratch"]
    end

    subgraph Product ["Audit Trail"]
        AT["GitHub activity → mapped automatically\nto 63 controls across 8 frameworks"]
    end

    subgraph Value ["The Outcome"]
        V1["Always audit-ready,\nnot just once a year"]
        V2["PDF / CSV handed\ndirectly to an auditor"]
        V3["Same evidence base\nreused across all frameworks"]
    end

    Pain --> Product --> Value
```

### Freemium Tiers

|                                | Free    | Pro       |
| ------------------------------ | ------- | --------- |
| Repositories                   | Up to 3 | Unlimited |
| All 8 compliance frameworks    | Yes     | Yes       |
| Live evidence dashboard        | Yes     | Yes       |
| Gap analysis with action steps | Yes     | Yes       |
| PDF / CSV exports              | No      | Yes       |
| Shareable auditor links        | No      | Yes       |
| Weekly email digest            | Yes     | Yes       |
| API key access                 | Yes     | Yes       |

### Revenue Flow

```mermaid
sequenceDiagram
    actor User
    participant App as Audit Trail
    participant Stripe

    User->>App: Clicks Upgrade on any Pro feature
    App->>Stripe: Create Checkout Session (Pro price ID)
    Stripe-->>User: Hosted checkout page
    User->>Stripe: Enters card details
    Stripe->>App: checkout.session.completed webhook
    App->>App: Upsert subscription → Pro in DB
    Stripe-->>User: Confirmation email

    Note over User,App: Monthly billing thereafter
    Stripe->>App: invoice.payment_succeeded → remain Pro
    Stripe->>App: invoice.payment_failed → grace period
    Stripe->>App: subscription.deleted → downgrade to Free
```

---

## Features

| Feature                          | Free | Pro |
| -------------------------------- | ---- | --- |
| Up to 3 repositories             | Yes  | Yes |
| Unlimited repositories           | No   | Yes |
| All 8 compliance frameworks      | Yes  | Yes |
| Live evidence dashboard          | Yes  | Yes |
| Gap analysis with action steps   | Yes  | Yes |
| PDF exports                      | No   | Yes |
| CSV exports                      | No   | Yes |
| Shareable read-only report links | No   | Yes |
| Email notifications              | Yes  | Yes |
| API key access                   | Yes  | Yes |
| Priority support                 | No   | Yes |

### Key Highlights

- **Zero source-code access**: only metadata is read (commit messages, PR titles, review states, branch rules). Your actual code is never transmitted or stored.
- **Auto-sync via cron**: repositories sync on a daily schedule; manual sync is one click.
- **Gap analysis**: every control with missing or partial evidence shows a numbered action list explaining exactly what your team needs to do in GitHub to generate evidence.
- **Shareable reports**: generate a tokenised public URL (no login required) to share a read-only compliance snapshot with auditors or stakeholders. Links can be revoked at any time.
- **Evidence filtering**: public reports support filtering controls by Covered / Partial / Missing status, with per-framework accordion sections.
- **Email notifications**: weekly compliance digest emailed via Resend; notification preferences are configurable per organisation.

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

## Authentication Flow

Authentication uses **GitHub OAuth via NextAuth.js**. The app requests only read-only scopes (`read:user`, `repo` metadata). Source code is never accessed or stored.

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Middleware as Next.js Middleware
    participant NextAuth as NextAuth.js
    participant GitHub as GitHub OAuth
    participant DB as Supabase

    User->>Browser: Visit /dashboard (protected route)
    Browser->>Middleware: Request with no session cookie
    Middleware-->>Browser: Redirect → /auth/signin

    User->>Browser: Click "Sign in with GitHub"
    Browser->>NextAuth: GET /api/auth/signin/github
    NextAuth-->>Browser: Redirect to GitHub consent screen
    User->>GitHub: Authorise Audit Trail (read-only scopes)
    GitHub-->>NextAuth: Authorization code
    NextAuth->>GitHub: POST - exchange code for access_token
    GitHub-->>NextAuth: access_token (read:user + repo)

    NextAuth->>DB: Upsert User + Account (Prisma adapter)
    NextAuth->>DB: Create or find Organization for user
    DB-->>NextAuth: User + org records
    NextAuth-->>Browser: Set encrypted session cookie (JWT)

    Browser->>Middleware: Subsequent request with session cookie
    Middleware->>Middleware: Validate session cookie
    Middleware-->>Browser: Allow through → /dashboard
```

Session tokens contain `userId`, `orgId`, and `plan`. Enough context for every API route to authorise requests without an extra database round-trip.

---

## Subscription Lifecycle

Billing is handled entirely by Stripe. The application reacts to Stripe webhook events to keep subscription state in sync.

```mermaid
stateDiagram-v2
    [*] --> Free : GitHub sign-up

    Free --> CheckoutPending : Click Upgrade
    CheckoutPending --> Free : User abandons checkout
    CheckoutPending --> Pro : checkout.session.completed

    Pro --> Pro : invoice.payment_succeeded (monthly renewal)
    Pro --> PastDue : invoice.payment_failed
    PastDue --> Pro : Stripe retries, payment succeeds
    PastDue --> Free : customer.subscription.deleted

    Pro --> Free : User cancels (subscription.deleted)

    Free --> [*]
    Pro --> [*]
```

Stripe events handled by `/api/webhooks/stripe`:

| Event                           | Action                          |
| ------------------------------- | ------------------------------- |
| `checkout.session.completed`    | Activate Pro subscription in DB |
| `customer.subscription.updated` | Sync plan / status changes      |
| `customer.subscription.deleted` | Downgrade to Free               |
| `invoice.payment_failed`        | Mark subscription as `past_due` |

---

## Compliance Frameworks

Audit Trail supports **8 frameworks** covering **63 controls** in total.

| Framework                                                                                                              | Controls | Focus                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| [ISO 27001:2022](https://www.iso.org/standard/27001)                                                                   | 19       | Information security management - Annex A.5 & A.8         |
| [Essential Eight](https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight) | 6        | ACSC baseline strategies for Australian organisations     |
| [NIST CSF 2.0](https://www.nist.gov/cyberframework)                                                                    | 7        | US cybersecurity framework - Govern, Protect, Detect      |
| [NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)                                | 7        | Federal controls - AC, CA, CM, SA, SI families            |
| [SOC 2](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)           | 5        | Trust Services Criteria - CC6, CC7, CC8                   |
| [GDPR](https://gdpr.eu/)                                                                                               | 9        | EU data protection - Art. 25 (privacy by design), Art. 32 |
| [SOCI Act](https://www.homeaffairs.gov.au/cyber-security-subsite/files/security-of-critical-infrastructure-act.pdf)    | 4        | AU critical infrastructure protection - PSO 1-4           |
| [PCI DSS 4.0](https://www.pcisecuritystandards.org/)                                                                   | 6        | Payment card industry - Requirements 6, 7, 8              |

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
        HE["Has Evidence\nStrong direct evidence"]
        PA["Partial\nSome but incomplete"]
        LI["Limited\nMinimal activity"]
        NE["No Evidence\n+ Gap analysis actions"]
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

## Compliance Scoring

Each of the 63 controls is evaluated against the GitHub artifacts collected during a sync. The compliance engine (`lib/compliance.ts`) runs entirely server-side and never touches source code. Only commit messages, PR metadata, branch protection settings, and workflow names.

```mermaid
flowchart TD
    A[Repository sync completes] --> B & C & D & E

    subgraph Artifacts ["Artifacts loaded from DB"]
        B[Commits\nmessage · author · GPG signature]
        C[Pull Requests\nreviews · approvals · merge strategy]
        D[Branch Protection\nrules · status checks · admin enforcement]
        E[CI Workflow Names\ndetected from check run names]
    end

    B & C & D & E --> F

    subgraph Engine ["Compliance Engine: lib/compliance.ts"]
        F[Pattern matching\nfor each of 63 controls]
        F --> G{Evidence strength}
    end

    G -->|Strong match| H["has_evidence (100%)"]
    G -->|Partial match| I["partial (60%)"]
    G -->|Weak match| J["limited (30%)"]
    G -->|No match| K["no_evidence (0%)"]

    H & I & J & K --> L[Weighted average\nper framework]
    L --> M[Overall compliance score]
    K --> N[Gap Analysis: lib/gap-analysis.ts\nActionable next steps per control]
```

Framework scores are periodically snapshotted into the `ComplianceSnapshot` table, enabling the trend chart on the dashboard to show score changes over time.

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

## API Surface

All API routes live under `/app/api/`. Dashboard routes require a valid NextAuth session; the public report endpoint and the Stripe webhook require no session.

```mermaid
graph TB
    subgraph Public ["Public - no auth required"]
        P1[GET /api/health]
        P2[GET /api/reports/public/:token]
        P3[POST /api/webhooks/stripe]
    end

    subgraph Auth ["Session-gated - NextAuth cookie required"]
        A1[GET /api/compliance/score]
        A2[GET /api/evidence]
        A3[GET /api/github/repos]
        A4[POST /api/github/sync]
        A5[GET · POST /api/exports]
        A6[GET · POST · DELETE /api/reports/shareable]
        A7[GET · PUT /api/settings]
        A8[GET · POST · DELETE /api/keys]
        A9[POST /api/stripe/checkout\nGET /api/stripe/portal]
        A10[POST /api/onboarding]
    end

    subgraph Cron ["Cron - Bearer CRON_SECRET"]
        C1[POST /api/cron/sync\ndaily at 02:00 UTC]
    end
```

| Route                         | Method(s)         | Description                                               |
| ----------------------------- | ----------------- | --------------------------------------------------------- |
| `/api/health`                 | GET               | Database + service health check                           |
| `/api/compliance/score`       | GET               | Overall + per-framework scores for the org                |
| `/api/evidence`               | GET               | Full 63-control evidence dataset with gap recommendations |
| `/api/github/repos`           | GET               | List connected repositories                               |
| `/api/github/sync`            | POST              | Trigger manual repository sync                            |
| `/api/exports`                | GET, POST         | List past exports / generate new PDF or CSV               |
| `/api/reports/shareable`      | GET, POST, DELETE | Manage shareable report tokens                            |
| `/api/reports/public/[token]` | GET               | Public evidence summary - no auth required                |
| `/api/settings`               | GET, PUT          | Org info + notification preferences                       |
| `/api/keys`                   | GET, POST, DELETE | API key management (create, list, revoke)                 |
| `/api/stripe/checkout`        | POST              | Create Stripe Checkout session                            |
| `/api/stripe/portal`          | GET               | Redirect to Stripe billing portal                         |
| `/api/webhooks/stripe`        | POST              | Stripe event handler - no auth, HMAC-verified             |
| `/api/cron/sync`              | POST              | Scheduled daily sync - bearer token auth                  |
| `/api/onboarding`             | POST              | Update onboarding step progress                           |

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
| Email         | [Resend](https://resend.com/)                                                   | Weekly digest emails via REST API           |
| Styling       | [Tailwind CSS](https://tailwindcss.com/)                                        | Utility-first, custom accent colour         |
| Animations    | [Framer Motion](https://www.framer.com/motion/)                                 | Page transitions, micro-interactions        |
| Charts        | [Recharts](https://recharts.org/)                                               | Bar + pie charts for compliance scores      |
| PDF           | [@react-pdf/renderer](https://react-pdf.org/)                                   | Server-side PDF generation                  |
| Caching       | [Upstash Redis](https://upstash.com/)                                           | Optional - falls back gracefully if unset   |
| Rate Limiting | Upstash Ratelimit                                                               | Optional - sliding window per endpoint type |
| Hosting       | [Vercel](https://vercel.com/)                                                   | Zero-config, cron jobs, edge middleware     |
| Analytics     | [Vercel Analytics](https://vercel.com/analytics)                                | Privacy-friendly, no cookie banner needed   |

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
│   ├── notifications.ts        # Resend email dispatch (weekly digest)
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

### Infrastructure Overview

```mermaid
graph TB
    subgraph Internet ["Internet"]
        USR["Users & Auditors\nbrowser"]
    end

    subgraph Vercel ["Vercel (Edge + Serverless)"]
        EDG["Edge Middleware\nauth routing guard"]
        SC["Server Components\nSSR pages"]
        API["API Routes\nserverless functions"]
        CRN["Cron Job\n/api/cron/sync\n02:00 UTC daily"]
    end

    subgraph Services ["External Services"]
        GH["GitHub API\nread-only OAuth"]
        SB[("Supabase\nPostgres + pgbouncer")]
        STR["Stripe\nbilling + webhooks"]
        RSD["Resend\nweekly digest email"]
        RDS[("Upstash Redis\noptional cache + rate-limit")]
    end

    USR -->|HTTPS| EDG
    EDG --> SC
    EDG --> API
    CRN -->|bearer auth| API
    SC --> SB
    API --> SB
    API --> GH
    API --> STR
    API --> RSD
    API -.->|optional| RDS
```

### Vercel

1. Fork this repo and push to your GitHub account.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Set all environment variables (see `.env.example`) in the Vercel project settings.
4. Set the **Build Command** to `npx prisma generate && npm run build`.
5. Deploy. Vercel detects Next.js automatically.

### Cron Job

The `vercel.json` at the repo root schedules the daily sync:

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

The endpoint validates `Authorization: Bearer $CRON_SECRET`. Vercel Cron sends this automatically.

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

## License

Proprietary. All rights reserved (c) 2026 Audit Trail.
