# Utopia Credits System - Implementation Guide

## 📋 What Has Been Built

### ✅ Completed Components

#### 1. **Backend Infrastructure**
- **Monime Service Layer** (`src/lib/monime.ts`)
  - MonimeClient class with full API integration
  - Methods for financial accounts, internal transfers, checkout sessions
  - Webhook signature verification
  - Unit conversion helpers (major/minor units)

- **Credits Service** (`src/lib/credits-service.ts`)
  - User account management
  - Balance syncing (hybrid: scheduled + action-triggered)
  - Credit purchases (checkout sessions)
  - Credit deductions (votes & polls)
  - Refund handling
  - Transaction history

- **API Routes**
  - `POST /api/onboarding/setup` - User onboarding with SOL airdrop
  - `GET /api/onboarding/setup` - Check onboarding status
  - `GET /api/credits/balance` - Get user credit balance
  - `POST /api/credits/purchase` - Create checkout session
  - `POST /api/credits/refresh` - Manually refresh balance
  - `GET /api/credits/transactions` - Get transaction history
  - `POST /api/webhooks/monime` - Handle Monime webhook events
  - `GET /api/cron/sync-balances` - Scheduled balance sync

#### 2. **Frontend Components**
- **Credits Data Access** (`src/components/credits/credits-data-access.tsx`)
  - React Query hooks for credit operations
  - `useUserCredits()` - Get balance with auto-refresh
  - `usePurchaseCredits()` - Initiate purchase flow
  - `useRefreshCredits()` - Manual balance refresh
  - `useCreditTransactions()` - Transaction history
  - Helper hooks: `useHasSufficientCredits()`, `useFormattedCredits()`

- **Credits UI** (`src/components/credits/credits-ui.tsx`)
  - `CreditBalanceDisplay` - Compact balance in header
  - `CreditBalanceCard` - Large balance card with purchase button
  - `PurchaseCreditsModal` - Purchase flow with amount selection
  - `InsufficientCreditsWarning` - Warning component
  - `CreditCostBadge` - Display credit costs

- **Onboarding Hook** (`src/components/onboarding/use-onboarding.tsx`)
  - Auto-detects first-time users
  - Creates Supabase profile
  - Creates Monime account
  - Airdrops 2 SOL
  - Shows welcome toast

#### 3. **Database**
- **Supabase Migration** (`supabase/migrations/002_credits_system.sql`)
  - Extended `user_profiles` table with:
    - `monime_financial_account_id`
    - `credit_balance`
    - `last_balance_sync`
    - `sol_wallet_address`
  - Extended `polls_metadata` table with:
    - `credits_per_vote`
  - New tables:
    - `credit_transactions` - Transaction log
    - `monime_webhooks` - Webhook event log
    - `credit_balance_syncs` - Sync audit trail
  - Views:
    - `user_credit_summary` - Aggregated user stats
    - `poll_credit_stats` - Poll credit statistics
  - Functions:
    - `update_user_credit_balance()` - Update balance with logging
    - `record_credit_transaction()` - Record transaction atomically

#### 4. **Documentation**
- **Setup Guide** (`.claude/plans/monime-credits-setup.md`)
  - Step-by-step Monime account creation
  - API credential retrieval
  - Webhook configuration
  - Environment variable setup
  - Testing & troubleshooting

- **Environment Configuration** (`.env.example`)
  - All required environment variables documented
  - Separate test/live mode configurations

---

## 🚧 Integration Steps (What You Need to Do)

### Step 1: Set Up Monime Account
1. Follow `.claude/plans/monime-credits-setup.md`
2. Create Monime account at https://monime.io
3. Get API credentials (Space ID, Secret Key)
4. Create main financial account
5. Set up webhook endpoint
6. Update `.env.local` with credentials

### Step 2: Run Database Migration
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard
# Go to SQL Editor → Copy contents of supabase/migrations/002_credits_system.sql → Run
```

### Step 3: Add Credits to UI Layout
Update `src/components/ui/ui-layout.tsx` to show credit balance in header:

```typescript
import { CreditBalanceDisplay } from '@/components/credits/credits-ui'
import { useOnboarding } from '@/components/onboarding/use-onboarding'

// In your layout component
export function UiLayout({ children }: { children: React.Node }) {
  useOnboarding() // Auto-onboard users

  return (
    <div>
      <header>
        {/* Existing nav items */}
        <CreditBalanceDisplay /> {/* Add this */}
      </header>
      {children}
    </div>
  )
}
```

### Step 4: Integrate Credits with Poll Creation

**File**: `src/components/poll/create-poll-feature.tsx`

**A. Add Credits Per Vote Input**

In the poll details form (around line 800-1000 in the Canvas component), add:

```typescript
// Add to PollDetails interface
interface PollDetails {
  pollId: number
  description: string
  pollStart: number
  pollEnd: number
  imageUrl?: string
  creditsPerVote: number  // ADD THIS
}

// In the form JSX, add this input:
<div>
  <label className="block text-sm font-medium mb-2">
    Credits Per Vote
  </label>
  <input
    type="number"
    min="1"
    max="1000"
    value={creditsPerVote}
    onChange={(e) => setCreditsPerVote(parseInt(e.target.value) || 10)}
    className="w-full px-4 py-2 border rounded"
    placeholder="10"
  />
  <p className="text-sm text-muted-foreground mt-1">
    How many credits will voters need to cast a vote?
  </p>
</div>
```

**B. Add Credit Balance Check & Deduction**

Before creating the poll (around line 1445 in `handleConfirmCreate`):

```typescript
const handleConfirmCreate = async () => {
  if (!finalDetails || !walletPublicKey) return

  setShowConfirmation(false)
  setIsSubmitting(true)
  setErrorMessage(null)

  try {
    // ✅ ADD THIS: Check and deduct credits FIRST
    const balanceResponse = await fetch(
      `/api/credits/balance?wallet=${walletPublicKey.toString()}`
    )
    const { balance } = await balanceResponse.json()

    if (balance < 2) {
      setErrorMessage('Insufficient credits. You need 2 credits to create a poll.')
      setIsSubmitting(false)
      // Show purchase modal
      return
    }

    toast.loading('Deducting 2 credits...', { id: 'deduct-credits' })

    // Deduct 2 credits via internal transfer
    const deductResponse = await fetch('/api/credits/deduct-poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: walletPublicKey.toString(),
        pollId: finalDetails.pollId,
        pollDescription: finalDetails.description
      })
    })

    if (!deductResponse.ok) {
      throw new Error('Failed to deduct credits')
    }

    toast.dismiss('deduct-credits')
    toast.success('Credits deducted!')

    // ✅ NOW proceed with on-chain poll creation
    // ... existing code ...
    const [pollPda] = PublicKey.findProgramAddressSync(...)

    // ... rest of the existing poll creation code ...

    // ✅ After successful on-chain creation, save metadata with creditsPerVote
    await createPollMetadata(
      finalDetails.pollId,
      walletPublicKey.toString(),
      imageUrl,
      finalDetails.creditsPerVote  // ADD THIS PARAMETER
    )

    toast.success('Poll created successfully!')
    router.push('/voting')
  } catch (error: any) {
    // If on-chain transaction fails, refund credits
    await fetch('/api/credits/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: walletPublicKey.toString(),
        amount: 2,
        reason: 'Poll creation failed'
      })
    })

    console.error('Error creating poll:', error)
    setErrorMessage(`Failed to create poll: ${error.message}`)
  } finally {
    setIsSubmitting(false)
  }
}
```

### Step 5: Create Credit Deduction API Routes

**File**: `src/app/api/credits/deduct-poll/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { deductCreditsForPollCreation } from '@/lib/credits-service'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { walletAddress, pollId, pollDescription } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: user } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const result = await deductCreditsForPollCreation({
      userId: user.id,
      pollId,
      pollDescription
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**File**: `src/app/api/credits/deduct-vote/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { deductCreditsForVote } from '@/lib/credits-service'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { walletAddress, pollId, candidateName, voteAmount } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: user } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const result = await deductCreditsForVote({
      userId: user.id,
      pollId,
      candidateName,
      voteAmount
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**File**: `src/app/api/credits/refund/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { refundCreditsToUser } from '@/lib/credits-service'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { walletAddress, amount, reason } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: user } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const result = await refundCreditsToUser({
      userId: user.id,
      amount,
      reason
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### Step 6: Integrate Credits with Voting

**File**: Find your voting component (likely `src/components/voting/voting-feature.tsx` or similar)

**A. Fetch Poll's Credits Per Vote**

When displaying a poll, fetch the `credits_per_vote` from Supabase:

```typescript
const { data: pollMetadata } = await supabase
  .from('polls_metadata')
  .select('credits_per_vote')
  .eq('poll_id', pollId)
  .single()

const voteCost = pollMetadata?.credits_per_vote || 10
```

**B. Add Credit Check Before Voting**

```typescript
const handleVote = async (candidateName: string) => {
  try {
    // 1. Check balance
    const balanceResponse = await fetch(
      `/api/credits/balance?wallet=${walletAddress}`
    )
    const { balance } = await balanceResponse.json()

    if (balance < voteCost) {
      // Show insufficient credits warning
      setShowInsufficientCreditsModal(true)
      return
    }

    // 2. Deduct credits
    toast.loading(`Deducting ${voteCost} credits...`, { id: 'deduct' })

    const deductResponse = await fetch('/api/credits/deduct-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        pollId,
        candidateName,
        voteAmount: voteCost
      })
    })

    if (!deductResponse.ok) {
      throw new Error('Failed to deduct credits')
    }

    toast.dismiss('deduct')

    // 3. Submit vote on-chain
    const voteSignature = await submitVoteToSolana(candidateName)

    toast.success('Vote submitted!')

    // Refresh credits balance
    queryClient.invalidateQueries({ queryKey: ['credits'] })

  } catch (error) {
    // Refund if vote failed
    await fetch('/api/credits/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        amount: voteCost,
        reason: 'Vote failed'
      })
    })

    toast.error('Vote failed. Credits refunded.')
  }
}
```

**C. Show Credit Cost in UI**

```typescript
import { CreditCostBadge, InsufficientCreditsWarning } from '@/components/credits/credits-ui'

// In poll display
<div>
  <h3>{pollDescription}</h3>
  <CreditCostBadge cost={voteCost} label="per vote" />

  {balance < voteCost && (
    <InsufficientCreditsWarning
      required={voteCost}
      current={balance}
      action="vote"
    />
  )}

  <Button
    onClick={() => handleVote(candidate)}
    disabled={balance < voteCost}
  >
    Vote ({voteCost} credits)
  </Button>
</div>
```

### Step 7: Update Polls Service

**File**: `src/lib/polls-service.ts`

Update `createPollMetadata` to accept `creditsPerVote`:

```typescript
export async function createPollMetadata(
  pollId: number,
  creatorWallet: string,
  imageUrl: string | null,
  creditsPerVote: number = 10  // ADD THIS PARAMETER
) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('polls_metadata')
    .insert({
      poll_id: pollId,
      creator_wallet: creatorWallet,
      image_url: imageUrl,
      credits_per_vote: creditsPerVote,  // ADD THIS FIELD
      is_deleted: false
    })

  if (error) {
    throw new Error(`Failed to create poll metadata: ${error.message}`)
  }
}
```

### Step 8: Set Up Scheduled Balance Sync

**Option A: Vercel Cron (if deploying to Vercel)**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-balances",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**Option B: External Cron Service**

Use https://cron-job.org or similar:
- URL: `https://your-domain.com/api/cron/sync-balances`
- Method: GET
- Schedule: Every 10 minutes
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Step 9: Test the Complete Flow

1. **Onboarding**:
   - Connect wallet → Should auto-create profile + Monime account + airdrop SOL
   - Check Supabase `user_profiles` table for new entry

2. **Buy Credits**:
   - Click "Buy Credits" → Select amount → Redirected to Monime checkout
   - Complete payment (use test mode)
   - Webhook should fire → Balance updates in Supabase

3. **Create Poll**:
   - Should deduct 2 credits
   - Set credits per vote (e.g., 5)
   - Poll created successfully
   - Check `polls_metadata` for `credits_per_vote`

4. **Vote**:
   - Should show required credits (5 in example)
   - Click vote → Deducts 5 credits → Submits vote on-chain
   - Balance updates immediately

5. **Check Transaction History**:
   - View in `credit_transactions` table
   - All deposits, votes, poll creations logged

---

## 🔧 Troubleshooting

### Credits Not Updating
- Check webhook is configured correctly in Monime Dashboard
- Check webhook secret matches `.env`
- View webhook logs in Supabase `monime_webhooks` table
- Manually trigger balance sync: `POST /api/credits/refresh`

### Poll Creation Fails
- Check user has at least 2 credits
- Check Monime account exists (`monime_financial_account_id` not null)
- Check Solana wallet has SOL for gas fees

### Voting Fails
- Check user has sufficient credits for poll's `credits_per_vote`
- Check VoterRecord PDA (on-chain double-vote prevention)
- Check if poll is still active (within start/end time)

### Webhook Not Firing
- Check URL is publicly accessible (use ngrok for local dev)
- Check HTTPS is enabled (required by Monime)
- Verify webhook secret is correct
- Check Monime Dashboard → Webhooks → Delivery Logs

---

## 📊 Monitoring & Analytics

### Important Queries

**Check User Balances**:
```sql
SELECT * FROM user_credit_summary ORDER BY credit_balance DESC;
```

**Check Poll Credit Stats**:
```sql
SELECT * FROM poll_credit_stats ORDER BY total_credits_collected DESC;
```

**Find Discrepancies**:
```sql
SELECT * FROM credit_balance_syncs WHERE discrepancy != 0;
```

**Recent Transactions**:
```sql
SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 50;
```

**Webhook Failures**:
```sql
SELECT * FROM monime_webhooks WHERE processed = false;
```

---

## 🚀 Deployment Checklist

- [ ] Set up Monime account and get live API keys
- [ ] Update `.env.production` with live credentials
- [ ] Run database migrations on production Supabase
- [ ] Configure webhooks with production URL
- [ ] Set up cron job for balance sync
- [ ] Test onboarding flow in production
- [ ] Test credit purchase with real mobile money
- [ ] Test poll creation and voting
- [ ] Monitor webhook logs for first 24 hours
- [ ] Set up alerts for failed transactions

---

## 📚 Additional Resources

- Monime API Docs: https://docs.monime.io
- Monime Dashboard: https://dashboard.monime.io
- Supabase Docs: https://supabase.com/docs
- Solana Devnet Faucet: https://faucet.solana.com

---

**Last Updated**: 2025-12-05
**Version**: 1.0.0
**Status**: Ready for Integration
