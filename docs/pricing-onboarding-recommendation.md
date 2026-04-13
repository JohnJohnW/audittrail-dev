# Pricing & Onboarding Model Recommendation

**Date:** 2026-04-01
**Status:** Historical (the product has since been repositioned to $5/mo with 6 frameworks)

---

## Problem Statement

The current free plan excludes exports and the auditor portal -- the exact features a buyer needs to evaluate whether Audit Trail works for their use case. A user who signs up can see compliance scores, but cannot:

1. Export evidence to show their auditor
2. Invite their auditor to review evidence directly
3. Generate a report for management or a customer security questionnaire

This creates a **dead-end evaluation experience**: the user sees promise but cannot validate it against their real workflow. In compliance software, the "aha moment" is showing evidence to an auditor and having them confirm it meets their requirements. That moment is currently behind a paywall.

---

## Current Model

### Pricing

|                        | Free   | Pro ($5/mo) | Enterprise (custom) |
| ---------------------- | ------ | ----------- | ------------------- |
| Repositories           | 2      | Unlimited   | Unlimited           |
| Frameworks             | 2 of 6 | All 6       | All + Custom        |
| Compliance Dashboard   | Yes    | Yes         | Yes                 |
| Evidence View          | Yes    | Yes         | Yes                 |
| Gap Analysis           | Yes    | Yes         | Yes                 |
| Exports (PDF/CSV)      | **No** | Yes         | Yes                 |
| Full Data Export       | **No** | Yes         | Yes                 |
| Auditor Portal         | **No** | Yes         | Yes                 |
| Risk Register          | **No** | Yes         | Yes                 |
| CISO Dashboard         | **No** | Yes         | Yes                 |
| GRC Dashboard          | **No** | Yes         | Yes                 |
| Executive Summary (AI) | **No** | Yes         | Yes                 |
| Evidence Upload        | **No** | Yes         | Yes                 |
| Custom Frameworks      | **No** | **No**      | Yes                 |
| SSO/SAML               | **No** | **No**      | Yes                 |

### Onboarding Flow

1. GitHub OAuth sign-in
2. Auto-create org + free subscription
3. Connect GitHub repositories (max 2)
4. Select compliance frameworks (max 3)
5. View compliance dashboard
6. Hit paywall when trying to export, invite auditor, or access GRC features

### Conversion Weakness

The user's journey ends at step 5 for evaluation purposes. They can see that evidence exists, but they cannot prove it to anyone outside the system. The features that generate buying conviction are all behind the paywall.

---

## Options Analysed

### Option A: 14-Day Pro Trial (Recommended)

Every new sign-up gets 14 days of full Pro access. After the trial, the account reverts to the free tier with read-only access to data created during the trial.

**Trial Parameters:**

- Duration: 14 days from first sign-in
- Scope: Full Pro features
- Usage caps during trial: 3 exports, 1 auditor session (prevents abuse while allowing real evaluation)
- Post-trial: Free tier + read-only view of trial data (scores, evidence, exports)
- Trial limit: One trial per GitHub organization (tracked via `trialUsed` flag)

**Pros:**

- Lets users experience the full product, including the auditor portal
- 14 days aligns with a typical compliance evaluation cycle (connect repos, review evidence, show auditor)
- Natural urgency: the trial expires, incentivizing conversion before access is lost
- Read-only data retention after trial creates switching cost (data is there, just locked)

**Cons:**

- Some users will complete a one-time audit during the trial and never convert
- Requires trial management infrastructure (expiry tracking, email sequences, billing integration)

### Option B: Usage-Limited Trial (Not Recommended)

No time limit, but cap Pro features: 1 export, 1 auditor session, 5 repositories. Users can take as long as they want to evaluate.

**Pros:**

- No time pressure reduces anxiety
- Users can evaluate at their own pace

**Cons:**

- No urgency to convert -- users may park on the usage-limited tier indefinitely
- Harder to implement (need per-feature usage counters)
- The compliance buying cycle is typically time-bound (upcoming audit, customer requirement), so urgency already exists externally

### Option C: Status Quo (Not Recommended)

Keep the current free + Pro model with no trial.

**Pros:**

- Simplest to maintain
- No risk of trial abuse

**Cons:**

- Low conversion rate -- compliance buyers need to prove value before purchasing
- Competitors offer trials or demos, putting Audit Trail at a disadvantage in evaluations
- Free tier provides enough value to understand the concept but not enough to validate the product

---

## Recommendation: Option A, 14-Day Pro Trial

### Conversion Rate Analysis

| Model                            | Expected Conversion Rate | Basis                                                                                                          |
| -------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Feature-gated freemium (current) | 2-5%                     | Industry average for SaaS freemium with high-value features gated                                              |
| 14-day Pro trial                 | 15-25%                   | Industry average for time-limited trials in B2B SaaS; compliance SaaS typically higher due to external urgency |
| Usage-limited trial              | 8-12%                    | Hybrid model; lower urgency reduces conversion pressure                                                        |

**Key insight:** Compliance buyers have externally-imposed urgency (upcoming audit, customer security review, regulatory deadline). A time-limited trial aligns with this urgency rather than fighting it.

### Trial Abuse Mitigation

| Risk                                  | Mitigation                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Multiple accounts                     | GitHub OAuth identity -- creating a new GitHub account is non-trivial and carries reputation cost |
| Repeated trials                       | One trial per GitHub org (`Subscription.trialUsed = true` after first trial)                      |
| Extract all data during trial         | 3-export cap during trial; watermark trial exports with "TRIAL"                                   |
| Use auditor portal without converting | 1 auditor session during trial; sufficient to validate but not to run a full audit                |
| Share trial access broadly            | Org-level trial, not user-level -- all org members share the same trial window                    |

### Trial Gating: Time-Based with Usage Caps

**Why both time and usage limits:**

- Time limit (14 days) creates urgency
- Usage caps (3 exports, 1 auditor session) prevent trial abuse while allowing meaningful evaluation
- The combination lets users do everything they need for evaluation but not run a full ongoing compliance program for free

### Post-Trial Free Tier

After the 14-day trial expires:

| Feature              | Post-Trial Free                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Repositories         | 2 (reduced from unlimited during trial)                                                     |
| Frameworks           | 3 (reduced from all 12 during trial)                                                        |
| Compliance Dashboard | Yes                                                                                         |
| Evidence View        | Yes (read-only for trial-period data, live for free-tier repos)                             |
| Trial Data           | Read-only (scores, evidence, exports created during trial are visible but not editable/new) |
| Exports              | No (trial exports remain downloadable from history)                                         |
| Auditor Portal       | No (trial session expires naturally)                                                        |
| Gap Analysis         | Visible, but recommendations gated                                                          |
| Upgrade Prompt       | At every gated touchpoint                                                                   |

**Read-only trial data** is the key retention mechanism: the user can see what they built during the trial, creating a sunk-cost incentive to convert rather than starting over elsewhere.

### Competitor Precedents

| Competitor Type               | Model                    | Detail                                                                           |
| ----------------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| **Enterprise platform A**     | Demo-gated, no free tier | Enterprise sales motion. Product access only after sales call.                   |
| **Mid-market platform B**     | 14-day trial             | Guided onboarding during trial. Self-serve to start, sales-assisted to convert.  |
| **Mid-market platform C**     | Free assessment          | Free compliance gap assessment. Paid for continuous monitoring and automation.   |
| **Mid-market platform D**     | Free compliance check    | Free initial compliance check. Paid for ongoing automation and audit management. |
| **Enterprise platform E**     | Demo only                | No self-serve. Sales-gated.                                                      |
| **Enterprise platform F**     | Demo only                | No self-serve. Sales-gated.                                                      |

**Pattern:** Self-serve compliance tools offer some form of free evaluation that demonstrates value before payment. Enterprise-focused tools gate access behind sales. Audit Trail's self-serve model aligns with the trial approach.

---

## Implementation Plan

### Database Changes

Add fields to `Subscription` model:

```prisma
model Subscription {
  // ... existing fields ...
  trialStartedAt   DateTime?
  trialEndsAt      DateTime?
  trialUsed        Boolean   @default(false)
  trialExportsUsed Int       @default(0)
  trialAuditorSessionsUsed Int @default(0)
}
```

### Logic Changes

**`hasProSubscription()` modification:**

```typescript
export async function hasProSubscription(orgId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub) return false;

  // Active paid subscription
  if (sub.plan === "pro" && ["active", "free"].includes(sub.status)) return true;

  // Active trial
  if (sub.trialEndsAt && sub.trialEndsAt > new Date()) return true;

  return false;
}
```

**Trial-specific usage checks:**

```typescript
export async function canUseTrialExport(orgId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub) return false;
  if (sub.plan === "pro") return true; // Paid users: unlimited
  if (sub.trialEndsAt && sub.trialEndsAt > new Date()) {
    return sub.trialExportsUsed < 3;
  }
  return false;
}
```

### Onboarding Flow Changes

1. **Sign-up:** Auto-create org + trial subscription (set `trialStartedAt = now()`, `trialEndsAt = now() + 14 days`, `trialUsed = true`)
2. **Dashboard banner:** Show "Trial: X days remaining" with a progress bar and conversion CTA
3. **Trial expiry:** Set `trialEndsAt` to past, revert to free tier behavior
4. **Upgrade during trial:** Convert to paid via Stripe, clear trial fields

### Email Sequence

| Day | Email           | Content                                                                   |
| --- | --------------- | ------------------------------------------------------------------------- |
| 0   | Welcome         | "Your 14-day Pro trial has started. Here's how to make the most of it."   |
| 3   | Getting started | "Connect your repositories and select your frameworks." (If they haven't) |
| 7   | Mid-trial       | "You're halfway through your trial. Have you invited your auditor?"       |
| 12  | Urgency         | "2 days left. Export your evidence before the trial ends."                |
| 14  | Expiry          | "Your trial has ended. Upgrade to continue with Pro features."            |
| 21  | Win-back        | "Your compliance data is still there. Upgrade to unlock it."              |

### Stripe Integration

Use Stripe's native trial support:

```typescript
const session = await stripe.checkout.sessions.create({
  // ... existing config ...
  subscription_data: {
    trial_period_days: 14,
  },
});
```

This creates a subscription that starts billing after 14 days. If the user doesn't provide payment info upfront, use Stripe's "trial without payment method" flow and collect payment at conversion.

---

## Proposed Updated Pricing Structure

|                          | Free  | Trial (14 days) | Pro ($5/mo) | Enterprise (custom) |
| ------------------------ | ----- | --------------- | ----------- | ------------------- |
| **Repositories**         | 2     | Unlimited       | Unlimited   | Unlimited           |
| **Frameworks**           | 3     | All 6           | All 6       | All + Custom        |
| **Compliance Dashboard** | Yes   | Yes             | Yes         | Yes                 |
| **Evidence View**        | Yes   | Yes             | Yes         | Yes                 |
| **Gap Analysis**         | Basic | Full            | Full        | Full                |
| **Exports**              | No    | 3 max           | Unlimited   | Unlimited           |
| **Auditor Portal**       | No    | 1 session       | Unlimited   | Unlimited           |
| **Risk Register**        | No    | Yes             | Yes         | Yes                 |
| **CISO Dashboard**       | No    | Yes             | Yes         | Yes                 |
| **GRC Dashboard**        | No    | Yes             | Yes         | Yes                 |
| **Executive Summary**    | No    | Yes             | Yes         | Yes                 |
| **Evidence Upload**      | No    | Yes             | Yes         | Yes                 |
| **Industry Benchmarks**  | Basic | Full            | Full        | Full                |
| **Custom Frameworks**    | No    | No              | No          | Yes                 |
| **SSO/SAML**             | No    | No              | No          | Yes                 |
| **Priority Support**     | No    | No              | Yes         | Yes                 |
| **SLA**                  | No    | No              | No          | Yes                 |

### Pricing Page Messaging

- **Trial CTA:** "Start your 14-day Pro trial -- no credit card required"
- **Value prop:** "Connect your repos, generate evidence, and show your auditor -- all in 14 days"
- **Post-trial CTA:** "Your compliance data is ready. Upgrade to keep it working for you."

---

## Risk Assessment

| Risk                                             | Likelihood | Impact | Mitigation                                                                                                       |
| ------------------------------------------------ | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| Users complete audit during trial, never convert | Medium     | Medium | Usage caps (3 exports, 1 auditor session) limit what can be done in trial. Real audits require ongoing evidence. |
| Trial abuse via multiple GitHub accounts         | Low        | Low    | GitHub accounts carry reputation; creating throwaway accounts is costly for professional users.                  |
| Existing free users expect trial                 | Low        | Low    | Grandfather existing free users with a one-time trial offer.                                                     |
| Conversion rate doesn't improve                  | Low        | Medium | A/B test trial vs. current model. If trial doesn't outperform, revert.                                           |
| Trial creates support burden                     | Medium     | Low    | Add guided onboarding (automated email sequence + in-app tooltips) to reduce support needs during trial.         |

---

## Decision Required

1. **Approve 14-day trial model** -- proceed with implementation as described
2. **Adjust trial parameters** -- modify duration, usage caps, or post-trial behavior
3. **Defer** -- gather more data on current conversion rates before changing the model
