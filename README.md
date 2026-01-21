# AuditTrail.dev

Turn GitHub activity into audit-ready compliance evidence automatically.

## Overview

AuditTrail.dev helps CTOs, technical founders, and security/GRC leads at small to mid-sized organizations prepare for compliance audits (ISO 27001, Essential Eight) by automatically collecting and mapping GitHub activity to compliance controls.

## Features

- **GitHub Integration**: Connect repositories via OAuth (read-only access)
- **Automatic Data Collection**: Ingests commits, pull requests, reviews, and branch protection rules
- **Compliance Mapping**: Maps GitHub data to ISO 27001 and Essential Eight controls
- **Evidence Dashboard**: View compliance coverage and supporting evidence
- **Export Reports**: Generate audit-ready PDF and CSV exports (Pro plan)
- **Stripe Billing**: Free tier with 3 repos, Pro plan for unlimited access

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5 (magic link + GitHub OAuth)
- **Email**: Resend
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **PDF Generation**: @react-pdf/renderer

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- GitHub OAuth App
- Stripe account
- Resend account

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="AuditTrail <noreply@yourdomain.com>"

# GitHub OAuth
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed compliance controls
npm run db:seed

# Start development server
npm run dev
```

### Database Setup

Run the SQL migrations in `prisma/migrations/` in your Supabase SQL editor, or use Prisma:

```bash
npx prisma db push
npm run db:seed
```

## Project Structure

```
├── app/
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth handlers
│   │   ├── github/        # GitHub integration
│   │   ├── evidence/      # Compliance evidence
│   │   ├── exports/       # PDF/CSV generation
│   │   ├── stripe/        # Billing
│   │   └── webhooks/      # Stripe webhooks
│   ├── auth/              # Auth pages
│   ├── (dashboard)/       # Protected app pages
│   └── page.tsx           # Landing page
├── components/
│   ├── landing/           # Landing page components
│   ├── dashboard/         # Dashboard components
│   └── ui/                # Reusable UI components
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── db.ts              # Prisma client
│   ├── github.ts          # GitHub API client
│   ├── compliance.ts      # Compliance mapping logic
│   ├── stripe.ts          # Stripe client
│   └── pdf.tsx            # PDF generation
└── prisma/
    ├── schema.prisma      # Database schema
    ├── seed.ts            # Compliance controls seed
    └── migrations/        # SQL migrations
```

## Compliance Frameworks

### ISO 27001:2022 (10 controls)
- A.8.9: Configuration Management
- A.8.32: Change Management
- A.8.4: Access to Source Code
- A.8.25: Secure Development Life Cycle
- A.8.26: Application Security Requirements
- A.8.27: Secure System Architecture
- A.8.28: Secure Coding
- A.8.29: Security Testing
- A.8.31: Environment Separation
- A.5.17: Authentication Information

### Essential Eight (5 controls)
- E8-1: Application Control
- E8-2: Patch Applications
- E8-4: Restrict Administrative Privileges
- E8-5: Patch Operating Systems
- E8-8: Regular Backups

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Stripe Webhook Setup

1. Create webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
2. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
3. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## License

Proprietary - All rights reserved.
