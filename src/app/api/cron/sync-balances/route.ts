/**
 * Scheduled Balance Sync Endpoint
 *
 * This endpoint is called periodically (every 10 minutes) to sync
 * all user credit balances from Monime to Supabase cache.
 *
 * Can be triggered by:
 * - Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Manual trigger for testing
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncAllUserBalances } from '@/lib/credits-service'

export const dynamic = 'force-dynamic' // Disable caching
export const maxDuration = 60 // Allow up to 60 seconds for execution

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }

    // Check for Bearer token or x-cron-secret header
    const providedSecret =
      authHeader?.replace('Bearer ', '') ||
      req.headers.get('x-cron-secret')

    if (providedSecret !== cronSecret) {
      console.error('Invalid cron secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Perform balance sync
    console.log('🔄 Starting scheduled balance sync...')
    const startTime = Date.now()

    await syncAllUserBalances()

    const duration = Date.now() - startTime

    console.log(`✅ Balance sync completed in ${duration}ms`)

    // 3. Return success response
    return NextResponse.json({
      success: true,
      message: 'All user balances synced successfully',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Balance sync failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Balance sync failed',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST endpoint for manual triggers
export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req)
}
