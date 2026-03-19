# Migration: Add RLS Tenant Isolation

## Purpose

This migration implements Zero Trust Architecture (ZTA) defense-in-depth at the database layer via PostgreSQL Row-Level Security (RLS).

## What it does

Enables RLS on all tables that contain org-scoped data and creates per-table policies that restrict row access to the `org_id` matching the `app.current_org_id` session variable.

## Why this matters (ZTA "never trust, always verify")

The application already filters all queries by `orgId` at the API layer. However, defense-in-depth means we do not rely solely on that check. If:

- An application-layer bug accidentally omits the `orgId` WHERE clause
- A compromised non-service-role database connection is used
- A developer or tool connects directly to the database with limited credentials

...the RLS policies will prevent cross-tenant data leakage even though the application-layer check failed or was bypassed.

## Prisma / service role note

Prisma connects to Supabase using the **service role** (set via `DATABASE_URL` / `DIRECT_URL` with the service key). The PostgreSQL service role bypasses RLS by design. This is **correct and intentional**. Prisma's server-side queries already enforce `orgId` filtering and the service role must remain unrestricted to function properly.

The RLS policies protect against **non-service-role** connections: direct psql access with the anon key, compromised row-level API keys, or any future integration that uses a lower-privilege connection string.

## Applying this migration

Do NOT run `prisma migrate dev` in production. Apply via:

```
prisma migrate deploy
```

or apply the SQL directly in the Supabase SQL editor for environments where `migrate deploy` is not available.
