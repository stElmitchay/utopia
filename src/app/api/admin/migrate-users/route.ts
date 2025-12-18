/**
 * Admin API: Migrate Existing Users to Credits System
 *
 * This endpoint creates Monime financial accounts for users who existed
 * before the credits system was implemented.
 *
 * In TEST MODE (mon_test_ key): Sets up local credits tracking without Monime accounts
 * In LIVE MODE (mon_ key): Creates real Monime financial accounts
 *
 * Usage: POST /api/admin/migrate-users
 * Headers: Authorization: Bearer <ADMIN_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMonimeClient } from '@/lib/monime'

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Check if we're using a test key (financial account creation not supported)
const isTestMode = process.env.MONIME_SECRET_KEY?.startsWith('mon_test_')

export async function POST(req: NextRequest) {
  try {
    // Verify admin authorization
    const authHeader = req.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users without Monime accounts, or with local placeholder IDs
    // Local IDs start with "local_" and need to be upgraded to real Monime accounts in live mode
    const { data: usersToMigrate, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, wallet_address, display_name, email, monime_financial_account_id, credit_balance')
      .or(`monime_financial_account_id.is.null,credit_balance.is.null${!isTestMode ? ',monime_financial_account_id.like.local_%' : ''}`)

    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    if (!usersToMigrate || usersToMigrate.length === 0) {
      return NextResponse.json({
        message: 'No users need migration',
        migrated: 0,
        mode: isTestMode ? 'test' : 'live'
      })
    }

    console.log(`Found ${usersToMigrate.length} users to migrate (${isTestMode ? 'TEST' : 'LIVE'} mode)`)

    const results = {
      total: usersToMigrate.length,
      success: 0,
      failed: 0,
      mode: isTestMode ? 'test' : 'live',
      errors: [] as { userId: string; wallet: string; error: string }[]
    }

    // Process users
    for (const user of usersToMigrate) {
      try {
        if (isTestMode) {
          // TEST MODE: Just set up local credits tracking without Monime
          // Use a placeholder ID that indicates local-only tracking
          const localAccountId = `local_${user.id}`

          const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
              monime_financial_account_id: localAccountId,
              credit_balance: user.credit_balance ?? 0,
              last_balance_sync: new Date().toISOString()
            })
            .eq('id', user.id)

          if (updateError) {
            throw new Error(`Failed to update profile: ${updateError.message}`)
          }

          results.success++
          console.log(`Set up local credits for user ${user.wallet_address}: ${localAccountId}`)
        } else {
          // LIVE MODE: Create real Monime financial account
          const monimeClient = getMonimeClient()

          const account = await monimeClient.createFinancialAccount({
            name: user.display_name || `User ${user.wallet_address.slice(0, 8)}`,
            metadata: {
              utopia_user_id: user.id,
              wallet_address: user.wallet_address,
              migrated_at: new Date().toISOString()
            }
          })

          const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
              monime_financial_account_id: account.id,
              credit_balance: 0,
              last_balance_sync: new Date().toISOString()
            })
            .eq('id', user.id)

          if (updateError) {
            throw new Error(`Failed to update profile: ${updateError.message}`)
          }

          results.success++
          console.log(`Migrated user ${user.wallet_address}: ${account.id}`)

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error: any) {
        results.failed++
        results.errors.push({
          userId: user.id,
          wallet: user.wallet_address,
          error: error.message
        })
        console.error(`Failed to migrate user ${user.wallet_address}:`, error.message)
      }
    }

    return NextResponse.json({
      message: 'Migration complete',
      results
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    )
  }
}

// GET endpoint to check migration status
export async function GET(req: NextRequest) {
  try {
    // Verify admin authorization
    const authHeader = req.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Count users with and without Monime accounts
    const { data: withAccount, error: error1 } = await supabaseAdmin
      .from('user_profiles')
      .select('id', { count: 'exact' })
      .not('monime_financial_account_id', 'is', null)

    const { data: withoutAccount, error: error2 } = await supabaseAdmin
      .from('user_profiles')
      .select('id, wallet_address', { count: 'exact' })
      .is('monime_financial_account_id', null)

    if (error1 || error2) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    return NextResponse.json({
      totalUsers: (withAccount?.length || 0) + (withoutAccount?.length || 0),
      migratedUsers: withAccount?.length || 0,
      pendingMigration: withoutAccount?.length || 0,
      pendingWallets: withoutAccount?.map(u => u.wallet_address) || []
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
