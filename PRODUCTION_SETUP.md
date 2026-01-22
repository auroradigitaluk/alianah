# Production Setup Guide

This guide will help you configure all the necessary services to make your Alianah Humanity Welfare app production-ready.

## Prerequisites

- A Neon database account (https://neon.tech)
- A Resend account (https://resend.com)
- A Vercel account (https://vercel.com)
- A Stripe account (https://stripe.com)

## Step 1: Set Up Neon Database (PostgreSQL)

1. **Create a Neon Account**
   - Go to https://neon.tech and sign up
   - Create a new project

2. **Get Your Connection String**
   - In your Neon dashboard, go to your project
   - Click on "Connection Details"
   - Copy the connection string (it will look like: `postgresql://user:password@host.neon.tech/database?sslmode=require`)

3. **Update Environment Variables**
   - Add to your `.env` file:
     ```bash
     DATABASE_URL="your-neon-connection-string"
     DIRECT_URL="your-neon-connection-string"
     ```

4. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

## Step 2: Set Up Resend (Email Service)

1. **Create a Resend Account**
   - Go to https://resend.com and sign up
   - Verify your email

2. **Create an API Key**
   - Go to https://resend.com/api-keys
   - Click "Create API Key"
   - Give it a name (e.g., "Alianah Production")
   - Copy the API key (starts with `re_`)

3. **Verify Your Domain** (Optional but recommended)
   - Go to https://resend.com/domains
   - Add your domain (e.g., `alianah.org`)
   - Follow the DNS verification steps

4. **Update Environment Variables**
   ```bash
   RESEND_API_KEY="re_your_api_key_here"
   FROM_EMAIL="noreply@alianah.org"  # or your verified domain
   ```

## Step 3: Set Up Vercel Blob (File Storage)

1. **Create a Vercel Account**
   - Go to https://vercel.com and sign up
   - Link your GitHub account if deploying from GitHub

2. **Create a Blob Store**
   - Go to https://vercel.com/dashboard/stores
   - Click "Create Store"
   - Choose "Blob" as the store type
   - Give it a name (e.g., "alianah-files")
   - Copy the `BLOB_READ_WRITE_TOKEN`

3. **Update Environment Variables**
   ```bash
   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_your_token_here"
   ```

## Step 4: Set Up Stripe (Payment Processing)

1. **Create a Stripe Account**
   - Go to https://stripe.com and sign up
   - Complete the account setup

2. **Get Your API Keys**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy your "Secret key" (starts with `sk_test_` for test mode, `sk_live_` for production)
   - Copy your "Publishable key" (starts with `pk_test_` for test mode, `pk_live_` for production)

3. **Set Up Webhooks** (Important for payment confirmations)
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Enter your webhook URL: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`
   - Copy the webhook signing secret (starts with `whsec_`)

4. **Update Environment Variables**
   ```bash
   STRIPE_SECRET_KEY="sk_live_your_secret_key"
   STRIPE_PUBLISHABLE_KEY="pk_live_your_publishable_key"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your_publishable_key"
   STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
   ```

## Step 5: Deploy to Vercel

1. **Push Your Code to GitHub**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Import Project to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables in Vercel**
   - In your Vercel project settings, go to "Environment Variables"
   - Add all the variables from your `.env.example`:
     - `DATABASE_URL`
     - `DIRECT_URL`
     - `RESEND_API_KEY`
     - `FROM_EMAIL`
     - `BLOB_READ_WRITE_TOKEN`
     - `STRIPE_SECRET_KEY`
     - `STRIPE_PUBLISHABLE_KEY`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_APP_URL` (your Vercel deployment URL)

4. **Deploy**
   - Vercel will automatically deploy when you push to main
   - Or click "Deploy" in the Vercel dashboard

5. **Run Database Migrations**
   - After deployment, run migrations:
     ```bash
     npx prisma migrate deploy
     ```
   - Or use Vercel's build command (already configured in `package.json`)

## Step 6: Post-Deployment Checklist

- [ ] Database migrations completed successfully
- [ ] Test email sending (create a test donation)
- [ ] Test file uploads (upload an image in admin)
- [ ] Test payment processing (use Stripe test mode first)
- [ ] Verify webhook endpoint is receiving events
- [ ] Check all environment variables are set correctly
- [ ] Test admin login functionality
- [ ] Verify all API routes are working

## Environment Variables Summary

Here's a complete list of all environment variables needed:

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Email
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@alianah.org"

# File Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Payments
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Troubleshooting

### Database Connection Issues
- Verify your Neon connection string is correct
- Check that your IP is allowed (Neon allows all IPs by default)
- Ensure `sslmode=require` is in the connection string

### Email Not Sending
- Verify your Resend API key is correct
- Check Resend dashboard for any errors
- Ensure `FROM_EMAIL` matches a verified domain

### File Upload Issues
- Verify `BLOB_READ_WRITE_TOKEN` is correct
- Check Vercel Blob store is active
- Ensure file size limits are within Vercel's limits (4.5MB)

### Payment Issues
- Verify Stripe keys are in production mode (not test mode)
- Check webhook endpoint is correctly configured
- Verify webhook secret matches in Stripe dashboard

## Support

If you encounter any issues:
1. Check the service dashboards for error logs
2. Review Vercel deployment logs
3. Check browser console for client-side errors
4. Review server logs in Vercel dashboard
