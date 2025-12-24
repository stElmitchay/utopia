/**
 * Monime Webhook Handler
 *
 * Handles webhook events from Monime for:
 * - checkout_session.completed (user deposits)
 * - internal_transfer.completed (credit transfers)
 * - internal_transfer.failed (failed transfers for refunds)
 */

import { NextRequest, NextResponse } from 'next/server'
import { MonimeClient } from '@/lib/monime'
import { syncUserBalance } from '@/lib/credits-service'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Webhook Event Types
// ============================================================================

interface MonimeWebhookEvent {
  id: string
  type: string
  created: string
  data: {
    object: any
  }
}

interface CheckoutSessionCompletedData {
  id: string
  amount: {
    currency: string
    value: number
  }
  financialAccountId: string
  status: string
  metadata?: {
    utopia_user_id?: string
    wallet_address?: string
  }
}

interface InternalTransferData {
  id: string
  amount: {
    currency: string
    value: number
  }
  sourceFinancialAccount: { id: string }
  destinationFinancialAccount: { id: string }
  status: string
  metadata?: {
    utopia_user_id?: string
    action?: string
    poll_id?: number
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

async function logWebhookEvent(
  eventType: string,
  eventId: string,
  financialAccountId: string | null,
  payload: any
): Promise<void> {
  const supabase = getSupabaseClient()

  await supabase.from('monime_webhooks').insert({
    event_type: eventType,
    event_id: eventId,
    financial_account_id: financialAccountId,
    payload,
    processed: false
  })
}

async function markWebhookProcessed(
  eventId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabaseClient()

  await supabase
    .from('monime_webhooks')
    .update({
      processed: success,
      processed_at: new Date().toISOString(),
      error_message: errorMessage || null
    })
    .eq('event_id', eventId)
}

// ============================================================================
// Event Handlers
// ============================================================================

async function handleCheckoutSessionCompleted(
  data: CheckoutSessionCompletedData
): Promise<void> {
  const supabase = getSupabaseClient()

  console.log('Processing checkout_session.completed:', data.id)

  // Find user by financial account ID
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('id, wallet_address, monime_financial_account_id')
    .eq('monime_financial_account_id', data.financialAccountId)
    .single()

  if (error || !user) {
    throw new Error(`User not found for financial account: ${data.financialAccountId}`)
  }

  // Sync user balance from Monime
  const newBalance = await syncUserBalance(
    user.id,
    data.financialAccountId,
    'action_triggered'
  )

  // Record deposit transaction
  const depositAmount = MonimeClient.toMajorUnits(data.amount.value)

  await supabase.rpc('record_credit_transaction', {
    p_user_id: user.id,
    p_transaction_type: 'deposit',
    p_amount: depositAmount,
    p_monime_checkout_session_id: data.id,
    p_metadata: {
      checkout_session_id: data.id,
      currency: data.amount.currency
    }
  })

  console.log(`✅ User ${user.wallet_address} deposited ${depositAmount} credits. New balance: ${newBalance}`)
}

async function handleInternalTransferSucceeded(
  data: InternalTransferData
): Promise<void> {
  console.log('Processing internal_transfer.succeeded:', data.id)

  // Determine if this is a deduction or refund based on accounts
  const mainAccountId = process.env.MONIME_MAIN_FINANCIAL_ACCOUNT_ID
  const isDeduction = data.destinationFinancialAccount.id === mainAccountId
  const isRefund = data.sourceFinancialAccount.id === mainAccountId

  if (isDeduction) {
    // Credit was deducted (vote or poll creation)
    // Balance should already be synced by the deductCreditsFor* functions
    console.log(`✅ Credit deduction succeeded: ${data.id}`)
  } else if (isRefund) {
    // Credit was refunded
    const supabase = getSupabaseClient()

    // Find user by destination account
    const { data: user } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('monime_financial_account_id', data.destinationFinancialAccount.id)
      .single()

    if (user) {
      await syncUserBalance(
        user.id,
        data.destinationFinancialAccount.id,
        'action_triggered'
      )
      console.log(`✅ Credit refund succeeded for user: ${user.id}`)
    }
  }
}

async function handleInternalTransferFailed(
  data: InternalTransferData
): Promise<void> {
  console.error('Internal transfer failed:', data.id)

  // If a transfer fails, we should investigate
  // In most cases, this shouldn't happen if we check balance beforehand
  // Log for monitoring
  console.error('Transfer failure details:', {
    transferId: data.id,
    sourceAccount: data.sourceFinancialAccount.id,
    destinationAccount: data.destinationFinancialAccount.id,
    amount: data.amount,
    metadata: data.metadata
  })

  // TODO: Send alert to admin/monitoring system
}

// ============================================================================
// Main Webhook Handler
// ============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Get webhook secret
    const webhookSecret = process.env.MONIME_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('MONIME_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // 2. Get raw body and signature
    const rawBody = await req.text()
    const signature = req.headers.get('monime-signature') || req.headers.get('x-monime-signature')

    if (!signature) {
      console.error('Missing webhook signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // 3. Verify webhook signature
    const isValid = await MonimeClient.verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    )

    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 4. Parse webhook event
    const event: MonimeWebhookEvent = JSON.parse(rawBody)

    console.log(`📥 Received Monime webhook: ${event.type} (${event.id})`)

    // 5. Check for duplicate events (idempotency)
    const supabase = getSupabaseClient()
    const { data: existingEvent } = await supabase
      .from('monime_webhooks')
      .select('id, processed')
      .eq('event_id', event.id)
      .single()

    if (existingEvent) {
      if (existingEvent.processed) {
        console.log(`⏭️  Event ${event.id} already processed, skipping`)
        return NextResponse.json({ received: true, skipped: true })
      }
    } else {
      // Log new event
      await logWebhookEvent(
        event.type,
        event.id,
        event.data.object?.financialAccountId || null,
        event
      )
    }

    // 6. Handle event based on type
    try {
      switch (event.type) {
        case 'checkout_session.completed':
          await handleCheckoutSessionCompleted(
            event.data.object as CheckoutSessionCompletedData
          )
          break

        case 'internal_transfer.succeeded':
        case 'internal_transfer.completed':
          await handleInternalTransferSucceeded(
            event.data.object as InternalTransferData
          )
          break

        case 'internal_transfer.failed':
          await handleInternalTransferFailed(
            event.data.object as InternalTransferData
          )
          break

        default:
          console.log(`ℹ️  Unhandled event type: ${event.type}`)
      }

      // Mark as processed
      await markWebhookProcessed(event.id, true)

      return NextResponse.json({ received: true, processed: true })
    } catch (processingError: any) {
      // Mark as failed
      await markWebhookProcessed(event.id, false, processingError.message)

      console.error('Error processing webhook event:', processingError)

      // Return 200 to prevent Monime from retrying immediately
      // (We've logged the error for manual investigation)
      return NextResponse.json({
        received: true,
        processed: false,
        error: processingError.message
      })
    }
  } catch (error: any) {
    console.error('Webhook handler error:', error)

    // Return 500 for infrastructure errors (Monime will retry)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET endpoint for webhook verification (optional)
// ============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/monime',
    events: [
      'checkout_session.completed',
      'internal_transfer.completed',
      'internal_transfer.failed'
    ]
  })
}
