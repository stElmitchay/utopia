# Monime Credits System Setup Guide

## Overview
This guide walks you through setting up Monime integration for the Utopia credits system. The system allows users to purchase credits via mobile money (Orange Money, Afrimoney) and use them to vote and create polls.

## Architecture Summary
- **1 Main Utopia Account**: Your business account that receives all credit spending
- **1 Financial Account per User**: Created automatically on signup, holds user's credit balance
- **Credits = SLE (1:1)**: 100 Sierra Leone Leones = 100 credits
- **Vote Cost**: Variable (set by poll creator, e.g., 5, 10, 20 credits)
- **Poll Creation Cost**: 2 credits (fixed)

---

## Step 1: Create Monime Account

### 1.1 Sign Up for Monime
1. Go to https://monime.io
2. Click "Get Started" or "Sign Up"
3. Complete the registration form:
   - Business name: "Utopia Voting Platform"
   - Email address
   - Password
   - Country: Sierra Leone (or your target market)
4. Verify your email address

### 1.2 Complete Business Verification
1. Log in to the Monime Dashboard
2. Navigate to "Settings" → "Business Information"
3. Complete KYC (Know Your Customer) verification:
   - Upload business registration documents
   - Provide tax identification number
   - Upload ID for authorized signatory
4. Wait for verification approval (typically 1-3 business days)

---

## Step 2: Get API Credentials

### 2.1 Access API Keys
1. Log in to Monime Dashboard (https://dashboard.monime.io)
2. Go to "Developers" → "API Keys" (or "Settings" → "API")
3. You'll see two environments:
   - **Test Mode**: For development and testing
   - **Live Mode**: For production

### 2.2 Copy API Credentials

**For Development (Test Mode)**:
1. Click "Test API Keys"
2. Copy these values:
   - **Space ID**: `space_test_xxxxx` → `MONIME_SPACE_ID`
   - **Secret Key**: `sk_test_xxxxx` → `MONIME_SECRET_KEY`
   - **Publishable Key**: `pk_test_xxxxx` → `NEXT_PUBLIC_MONIME_PUBLISHABLE_KEY` (if needed for client-side)

**For Production (Live Mode)**:
1. Switch to "Live API Keys"
2. Copy:
   - **Space ID**: `space_live_xxxxx`
   - **Secret Key**: `sk_live_xxxxx`
   - **Publishable Key**: `pk_live_xxxxx`

> ⚠️ **Security Note**: NEVER commit secret keys to git. Store them in `.env.local` only.

---

## Step 3: Create Main Financial Account

### 3.1 Create via Dashboard
1. In Monime Dashboard, go to "Financial Accounts"
2. Click "Create New Account"
3. Enter details:
   - **Name**: "Utopia Main Account"
   - **Currency**: SLE (Sierra Leone Leone)
   - **Type**: Business Account
4. Click "Create"
5. **Copy the Account ID**: `fa_xxxxx` → `MONIME_MAIN_FINANCIAL_ACCOUNT_ID`

### 3.2 Create via API (Alternative)
If the dashboard method doesn't work, you can create it via API:

```bash
curl -X POST https://api.monime.io/v1/financial-accounts \
  -H "Authorization: Bearer sk_test_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Utopia Main Account",
    "currency": "SLE",
    "metadata": {
      "type": "main_business_account"
    }
  }'
```

Save the returned `id` field as `MONIME_MAIN_FINANCIAL_ACCOUNT_ID`.

---

## Step 4: Configure Mobile Money Providers

### 4.1 Check Available Providers
1. In Monime Dashboard, go to "Settings" → "Payment Methods"
2. Enable the mobile money providers you want to support:
   - ✅ Orange Money (Sierra Leone)
   - ✅ Afrimoney (Sierra Leone)
3. Complete provider-specific setup if required

### 4.2 Verify Providers via API
Test which providers are available in your region:

```bash
curl -X GET "https://api.monime.io/v1/momos?country=SL" \
  -H "Authorization: Bearer sk_test_xxxxx"
```

This will return a list of available mobile money operators in Sierra Leone.

---

## Step 5: Set Up Webhooks

Webhooks notify your app when deposits complete or transfers succeed/fail.

### 5.1 Create Webhook Endpoint
Your app needs to expose an endpoint at:
```
https://your-domain.com/api/webhooks/monime
```

This endpoint will be created in the implementation (see Step 6).

### 5.2 Register Webhook in Monime
1. Go to Monime Dashboard → "Developers" → "Webhooks"
2. Click "Add Endpoint"
3. Enter:
   - **URL**: `https://your-domain.com/api/webhooks/monime`
   - **Events to listen to**:
     - `checkout_session.completed` (user deposit succeeded)
     - `internal_transfer.succeeded` (credit deduction succeeded)
     - `internal_transfer.failed` (credit deduction failed - for refunds)
4. Click "Save"
5. **Copy the Webhook Secret**: `whsec_xxxxx` → `MONIME_WEBHOOK_SECRET`

### 5.3 Test Webhook (Development)
For local development, use a tool like **ngrok** to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Use the ngrok URL (e.g., https://xxxx.ngrok.io) in webhook settings
```

---

## Step 6: Add Environment Variables

Add these to your `.env.local` file:

```env
# Monime API Credentials (Test Mode)
MONIME_SPACE_ID=space_test_xxxxxxxxxxxxx
MONIME_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_MONIME_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Monime Main Financial Account
MONIME_MAIN_FINANCIAL_ACCOUNT_ID=fa_xxxxxxxxxxxxx

# Monime Webhook Secret
MONIME_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Monime API Base URL (default)
MONIME_API_URL=https://api.monime.io

# API Version (current)
MONIME_API_VERSION=v1
```

**For Production**, create `.env.production` with live keys:

```env
# Monime API Credentials (Live Mode)
MONIME_SPACE_ID=space_live_xxxxxxxxxxxxx
MONIME_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_MONIME_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
MONIME_MAIN_FINANCIAL_ACCOUNT_ID=fa_xxxxxxxxxxxxx
MONIME_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
MONIME_API_URL=https://api.monime.io
MONIME_API_VERSION=v1
```

---

## Step 7: Verify Setup

### 7.1 Test API Connection
Create a test script `scripts/test-monime.ts`:

```typescript
import fetch from 'node-fetch'

async function testMonimeConnection() {
  const response = await fetch('https://api.monime.io/v1/financial-accounts', {
    headers: {
      'Authorization': `Bearer ${process.env.MONIME_SECRET_KEY}`
    }
  })

  if (response.ok) {
    console.log('✅ Monime API connection successful!')
    const accounts = await response.json()
    console.log('Financial Accounts:', accounts)
  } else {
    console.error('❌ Monime API connection failed:', response.statusText)
  }
}

testMonimeConnection()
```

Run with:
```bash
npx tsx scripts/test-monime.ts
```

### 7.2 Test Account Creation
Test creating a user financial account:

```bash
curl -X POST https://api.monime.io/v1/financial-accounts \
  -H "Authorization: Bearer sk_test_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User Account",
    "currency": "SLE",
    "metadata": {
      "test": true,
      "utopia_user_id": "test_user_123"
    }
  }'
```

If you get a successful response with an `id` field, setup is complete!

---

## Step 8: Understand Monime Pricing

### Transaction Fees
Monime charges fees on transactions. Typical structure:
- **Deposits (Mobile Money)**: 1-3% + fixed fee
- **Internal Transfers**: Usually free or minimal
- **Payouts**: 1-3% + fixed fee

**Important**: Check your specific pricing in the Monime Dashboard under "Settings" → "Pricing" or contact Monime support.

### Cost Considerations for Utopia
- **User deposits credits**: Monime charges deposit fee (you decide if you absorb this or pass to user)
- **User votes/creates poll**: Internal transfer (free or minimal) from user account → your main account
- **No withdrawal**: Since credits are one-way (can't cash out), you only deal with deposit fees

---

## Troubleshooting

### Issue: "Invalid API Key" error
**Solution**:
- Verify you're using the correct key for the environment (test vs live)
- Check that you've copied the full key without extra spaces
- Ensure the key is prefixed correctly (`sk_test_` or `sk_live_`)

### Issue: "Account not found" error
**Solution**:
- Verify `MONIME_MAIN_FINANCIAL_ACCOUNT_ID` is correct
- Check that the account exists in the correct environment (test vs live)

### Issue: Mobile money providers not showing
**Solution**:
- Ensure your Monime account is verified
- Check that providers are enabled in Dashboard → Payment Methods
- Verify your business operates in Sierra Leone (or target country)

### Issue: Webhook not receiving events
**Solution**:
- Check webhook URL is publicly accessible
- Use ngrok for local development
- Verify webhook secret is correct
- Check Monime Dashboard → Webhooks → Logs for delivery attempts

---

## Security Best Practices

1. **Never commit secrets to git**:
   - Add `.env.local` to `.gitignore`
   - Use environment variables in production (Vercel, Netlify, etc.)

2. **Verify webhook signatures**:
   - Always validate HMAC signature on webhook events
   - Reject requests with invalid signatures

3. **Use HTTPS**:
   - Webhook endpoints must use HTTPS in production
   - Monime will reject HTTP endpoints

4. **Rotate keys regularly**:
   - Generate new API keys every 6-12 months
   - Update in all environments

5. **Monitor transactions**:
   - Set up alerts for unusual activity
   - Review transaction logs regularly in Monime Dashboard

---

## Next Steps

After completing this setup:
1. ✅ You have Monime API credentials
2. ✅ You have a main financial account for receiving payments
3. ✅ You have webhooks configured
4. ✅ Environment variables are set

Now proceed with the implementation:
- Monime service layer (`src/lib/monime.ts`)
- Supabase schema updates for credit tracking
- User onboarding flow with automatic account creation
- Credit purchase UI with Checkout Sessions
- Credit deduction logic for voting and poll creation

Refer to the main implementation plan for detailed steps.

---

## Useful Resources

- **Monime Documentation**: https://docs.monime.io
- **API Reference**: https://docs.monime.io/api-reference
- **Dashboard**: https://dashboard.monime.io
- **Support**: support@monime.io
- **Discord Community**: (if available)

---

## FAQ

**Q: Can I test without actual mobile money transactions?**
A: Yes! Use Monime's test mode (`sk_test_xxx`) to simulate transactions without real money.

**Q: How do I handle refunds if a vote fails?**
A: Use internal transfers to move credits back from your main account to the user's account.

**Q: Can users withdraw credits back to mobile money?**
A: Not in the current architecture (one-way system). If you want withdrawals, you'll need to implement payout functionality.

**Q: What happens if Monime API is down?**
A: Implement retry logic and queue failed operations. Use cached balances for display, sync when API recovers.

**Q: How do I switch from test to live mode?**
A: Update environment variables with live keys and deploy. Ensure all testing is complete first!

---

**Last Updated**: 2025-12-05
**Version**: 1.0
