# Vercel Deployment Guide

## Step 1: Prepare and Commit Code

```bash
# Check what files need to be committed
git status

# Add all new files
git add .

# Commit changes
git commit -m "Add production setup: Stripe, loading states, cron sync, additional controls"

# Push to GitHub
git push origin main
```

## Step 2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

## Step 3: Configure Build Settings

Vercel should auto-detect from `vercel.json`, but verify:
- **Framework Preset**: Next.js
- **Build Command**: `npx prisma generate && npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`

## Step 4: Add Environment Variables

In Vercel project settings → **Environment Variables**, add all of these:

### Database (Supabase)
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```
⚠️ **Important**: Use your Supabase connection strings. `DIRECT_URL` should use port 5432 (direct connection, not pooler).

### Authentication
```
NEXTAUTH_SECRET=[your-secret-from-local-.env]
NEXTAUTH_URL=https://your-app-name.vercel.app
```
⚠️ **Important**: Generate a new `NEXTAUTH_SECRET` for production:
```bash
openssl rand -base64 32
```

### Email (Resend)
```
RESEND_API_KEY=re_[your-resend-api-key]
EMAIL_FROM=AuditTrail <noreply@yourdomain.com>
```

### GitHub OAuth
```
GITHUB_CLIENT_ID=[your-github-client-id]
GITHUB_CLIENT_SECRET=[your-github-client-secret]
```

### Stripe
```
STRIPE_SECRET_KEY=sk_live_[your-secret-key]
STRIPE_PUBLISHABLE_KEY=pk_live_[your-publishable-key]
STRIPE_PRO_PRICE_ID=price_[your-price-id]
STRIPE_WEBHOOK_SECRET=whsec_[your-webhook-secret]
```

### Cron Job
```
CRON_SECRET=[your-cron-secret-from-local-.env]
```

## Step 5: Update GitHub OAuth App

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Edit your OAuth App
3. Add to **Authorization callback URL**:
   ```
   https://your-app-name.vercel.app/api/auth/callback/github
   ```
4. Save changes

## Step 6: Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-app-name.vercel.app/api/webhooks/stripe`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 7: Deploy

1. Click **"Deploy"** in Vercel
2. Wait for build to complete (should take 2-3 minutes)
3. Check build logs for any errors

## Step 8: Verify Deployment

1. Visit `https://your-app-name.vercel.app`
2. Test sign-up flow
3. Test GitHub OAuth connection
4. Test repository selection
5. Test export functionality (requires Pro subscription)

## Step 9: Set Up Custom Domain (Optional)

1. In Vercel project → Settings → Domains
2. Add your custom domain
3. Update `NEXTAUTH_URL` in environment variables
4. Update GitHub OAuth callback URL
5. Update Stripe webhook URL

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify `DATABASE_URL` and `DIRECT_URL` are correct
- Check build logs in Vercel dashboard

### Database Connection Errors
- Ensure `DIRECT_URL` uses port 5432 (direct connection)
- Verify Supabase allows connections from Vercel IPs
- Check Supabase connection pooling settings

### Authentication Not Working
- Verify `NEXTAUTH_SECRET` is set and matches production
- Check `NEXTAUTH_URL` matches your Vercel domain
- Ensure GitHub OAuth callback URL is correct

### Cron Job Not Running
- Vercel Cron requires Pro plan or Hobby with limits
- Verify `CRON_SECRET` is set
- Check Vercel Cron logs in dashboard
- Alternative: Use external cron service (e.g., cron-job.org) to call `/api/cron/sync` with `Authorization: Bearer [CRON_SECRET]` header

### Stripe Webhooks Not Working
- Verify webhook URL is correct
- Check webhook secret matches
- View webhook events in Stripe dashboard

## Post-Deployment Checklist

- [ ] Landing page loads correctly
- [ ] Sign-up with email works
- [ ] Magic link email is received
- [ ] GitHub OAuth connection works
- [ ] Repository selection works
- [ ] Data sync works
- [ ] Stripe checkout works
- [ ] Webhook receives events
- [ ] Exports generate correctly
- [ ] Cron job runs (check logs after 2 AM UTC)
