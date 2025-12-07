-- Monime Credits System Migration
-- This migration adds credit tracking, Monime financial accounts, and related tables

-- ============================================================================
-- 1. Extend users/user_profiles table for credit tracking
-- ============================================================================

-- Add Monime and credit columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS monime_financial_account_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS credit_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_balance_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sol_wallet_address TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_monime_account
  ON user_profiles(monime_financial_account_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_sol_wallet
  ON user_profiles(sol_wallet_address);

-- ============================================================================
-- 2. Extend polls_metadata table for variable vote costs
-- ============================================================================

-- Add credits_per_vote column to polls_metadata
ALTER TABLE polls_metadata
ADD COLUMN IF NOT EXISTS credits_per_vote INTEGER DEFAULT 10;

-- Add constraint to ensure positive vote costs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_credits_per_vote_positive'
  ) THEN
    ALTER TABLE polls_metadata
    ADD CONSTRAINT check_credits_per_vote_positive
      CHECK (credits_per_vote > 0);
  END IF;
END $$;

-- ============================================================================
-- 3. Credit Transactions Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'deposit', 'vote', 'poll_creation', 'refund'
  amount INTEGER NOT NULL, -- Positive for deposits/refunds, negative for spending
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  monime_transfer_id TEXT, -- Reference to Monime internal transfer ID
  monime_checkout_session_id TEXT, -- Reference to Monime checkout session ID
  poll_id BIGINT, -- NULL for deposits, set for votes/poll creation
  metadata JSONB DEFAULT '{}', -- Additional data (candidate name, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user
  ON credit_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
  ON credit_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_poll
  ON credit_transactions(poll_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_created
  ON credit_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_monime_transfer
  ON credit_transactions(monime_transfer_id);

-- Add constraint for transaction types (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_transaction_type'
  ) THEN
    ALTER TABLE credit_transactions
    ADD CONSTRAINT check_transaction_type
      CHECK (transaction_type IN ('deposit', 'vote', 'poll_creation', 'refund'));
  END IF;
END $$;

-- ============================================================================
-- 4. Monime Webhooks Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS monime_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'checkout_session.completed', 'internal_transfer.succeeded', etc.
  event_id TEXT UNIQUE, -- Monime event ID for idempotency
  financial_account_id TEXT, -- Affected financial account
  payload JSONB NOT NULL, -- Full webhook payload
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT, -- If processing failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for monime_webhooks
CREATE INDEX IF NOT EXISTS idx_monime_webhooks_event_type
  ON monime_webhooks(event_type);

CREATE INDEX IF NOT EXISTS idx_monime_webhooks_processed
  ON monime_webhooks(processed);

CREATE INDEX IF NOT EXISTS idx_monime_webhooks_financial_account
  ON monime_webhooks(financial_account_id);

CREATE INDEX IF NOT EXISTS idx_monime_webhooks_event_id
  ON monime_webhooks(event_id);

CREATE INDEX IF NOT EXISTS idx_monime_webhooks_created
  ON monime_webhooks(created_at DESC);

-- ============================================================================
-- 5. Credit Balance Sync Log (for debugging/audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_balance_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  balance_before INTEGER,
  balance_after INTEGER,
  sync_type TEXT NOT NULL, -- 'scheduled', 'action_triggered', 'manual'
  monime_balance INTEGER, -- Balance from Monime API
  cached_balance INTEGER, -- Balance in our database before sync
  discrepancy INTEGER GENERATED ALWAYS AS (monime_balance - cached_balance) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for credit_balance_syncs
CREATE INDEX IF NOT EXISTS idx_credit_balance_syncs_user
  ON credit_balance_syncs(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_balance_syncs_created
  ON credit_balance_syncs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_balance_syncs_discrepancy
  ON credit_balance_syncs(discrepancy) WHERE discrepancy != 0;

-- ============================================================================
-- 6. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monime_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balance_syncs ENABLE ROW LEVEL SECURITY;

-- Credit Transactions Policies
-- Users can view their own transactions
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles
    WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  ));

-- Service role can insert transactions
CREATE POLICY "Service can insert credit transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (true);

-- Monime Webhooks Policies (service role only)
CREATE POLICY "Service can manage webhooks"
  ON monime_webhooks FOR ALL
  USING (true);

-- Credit Balance Syncs Policies
-- Users can view their own sync logs
CREATE POLICY "Users can view own balance syncs"
  ON credit_balance_syncs FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles
    WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  ));

-- Service can insert sync logs
CREATE POLICY "Service can insert balance syncs"
  ON credit_balance_syncs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 7. Helpful Views
-- ============================================================================

-- View: User Credit Summary
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT
  up.id,
  up.wallet_address,
  up.display_name,
  up.credit_balance,
  up.last_balance_sync,
  up.monime_financial_account_id,
  COUNT(DISTINCT ct.id) FILTER (WHERE ct.transaction_type = 'deposit') as total_deposits,
  COUNT(DISTINCT ct.id) FILTER (WHERE ct.transaction_type = 'vote') as total_votes,
  COUNT(DISTINCT ct.id) FILTER (WHERE ct.transaction_type = 'poll_creation') as total_polls_created,
  SUM(ct.amount) FILTER (WHERE ct.transaction_type = 'deposit') as total_deposited,
  SUM(ABS(ct.amount)) FILTER (WHERE ct.transaction_type IN ('vote', 'poll_creation')) as total_spent,
  MAX(ct.created_at) as last_transaction_at
FROM user_profiles up
LEFT JOIN credit_transactions ct ON ct.user_id = up.id
GROUP BY up.id, up.wallet_address, up.display_name, up.credit_balance,
         up.last_balance_sync, up.monime_financial_account_id;

-- View: Poll Credit Stats
CREATE OR REPLACE VIEW poll_credit_stats AS
SELECT
  pm.poll_id,
  pm.credits_per_vote,
  COUNT(ct.id) as total_votes,
  SUM(ct.amount) as total_credits_collected,
  COUNT(DISTINCT ct.user_id) as unique_voters
FROM polls_metadata pm
LEFT JOIN credit_transactions ct
  ON ct.poll_id = pm.poll_id AND ct.transaction_type = 'vote'
GROUP BY pm.poll_id, pm.credits_per_vote;

-- ============================================================================
-- 8. Functions
-- ============================================================================

-- Function: Update user credit balance
CREATE OR REPLACE FUNCTION update_user_credit_balance(
  p_user_id UUID,
  p_new_balance INTEGER,
  p_sync_type TEXT DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT credit_balance INTO v_old_balance
  FROM user_profiles
  WHERE id = p_user_id;

  -- Update balance
  UPDATE user_profiles
  SET credit_balance = p_new_balance,
      last_balance_sync = NOW()
  WHERE id = p_user_id;

  -- Log the sync
  INSERT INTO credit_balance_syncs (
    user_id,
    balance_before,
    balance_after,
    sync_type,
    monime_balance,
    cached_balance
  ) VALUES (
    p_user_id,
    v_old_balance,
    p_new_balance,
    p_sync_type,
    p_new_balance,
    v_old_balance
  );
END;
$$;

-- Function: Record credit transaction
CREATE OR REPLACE FUNCTION record_credit_transaction(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_amount INTEGER,
  p_monime_transfer_id TEXT DEFAULT NULL,
  p_monime_checkout_session_id TEXT DEFAULT NULL,
  p_poll_id BIGINT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Get current balance
  SELECT credit_balance INTO v_balance_before
  FROM user_profiles
  WHERE id = p_user_id;

  -- Calculate new balance
  v_balance_after := v_balance_before + p_amount;

  -- Insert transaction record
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    monime_transfer_id,
    monime_checkout_session_id,
    poll_id,
    metadata
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_monime_transfer_id,
    p_monime_checkout_session_id,
    p_poll_id,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  -- Update user balance
  UPDATE user_profiles
  SET credit_balance = v_balance_after,
      last_balance_sync = NOW()
  WHERE id = p_user_id;

  RETURN v_transaction_id;
END;
$$;

-- ============================================================================
-- 9. Triggers
-- ============================================================================

-- Trigger: Update polls_metadata updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to polls_metadata if not exists
DROP TRIGGER IF EXISTS update_polls_metadata_updated_at ON polls_metadata;
CREATE TRIGGER update_polls_metadata_updated_at
  BEFORE UPDATE ON polls_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_profiles if not exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. Sample Data (for testing only - remove in production)
-- ============================================================================

-- Uncomment below for local testing
/*
-- Create a test user with credits
INSERT INTO user_profiles (wallet_address, display_name, credit_balance, monime_financial_account_id)
VALUES ('testWallet123', 'Test User', 100, 'fa_test_123')
ON CONFLICT (wallet_address) DO NOTHING;

-- Create test poll with variable cost
INSERT INTO polls_metadata (poll_id, creator_wallet, credits_per_vote)
VALUES (1, 'testWallet123', 5)
ON CONFLICT (poll_id) DO NOTHING;
*/

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all credit-related tables
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monime_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balance_syncs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for credit_transactions
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Service role can insert credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Service role can update credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Service role can delete credit transactions" ON credit_transactions;

-- Users can view their own transactions
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Only service role can insert transactions (via backend API)
CREATE POLICY "Service role can insert credit transactions"
  ON credit_transactions
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Only service role can update transactions
CREATE POLICY "Service role can update credit transactions"
  ON credit_transactions
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Only service role can delete transactions
CREATE POLICY "Service role can delete credit transactions"
  ON credit_transactions
  FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================================================
-- RLS Policies for monime_webhooks
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Service role can view webhook logs" ON monime_webhooks;
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON monime_webhooks;
DROP POLICY IF EXISTS "Service role can update webhook logs" ON monime_webhooks;

-- Only service role can access webhook logs (internal/admin only)
CREATE POLICY "Service role can view webhook logs"
  ON monime_webhooks
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can insert webhook logs"
  ON monime_webhooks
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can update webhook logs"
  ON monime_webhooks
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================================================
-- RLS Policies for credit_balance_syncs
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view own balance syncs" ON credit_balance_syncs;
DROP POLICY IF EXISTS "Service role can insert balance syncs" ON credit_balance_syncs;
DROP POLICY IF EXISTS "Service role can update balance syncs" ON credit_balance_syncs;

-- Users can view their own balance sync records
CREATE POLICY "Users can view own balance syncs"
  ON credit_balance_syncs
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Only service role can insert sync records
CREATE POLICY "Service role can insert balance syncs"
  ON credit_balance_syncs
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Only service role can update sync records
CREATE POLICY "Service role can update balance syncs"
  ON credit_balance_syncs
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Add comment to track migration
COMMENT ON TABLE credit_transactions IS 'Tracks all credit transactions (deposits, votes, poll creation, refunds)';
COMMENT ON TABLE monime_webhooks IS 'Logs all Monime webhook events for audit and idempotency';
COMMENT ON TABLE credit_balance_syncs IS 'Tracks credit balance synchronization between Monime and Supabase';
COMMENT ON VIEW user_credit_summary IS 'Aggregated view of user credit activity';
COMMENT ON VIEW poll_credit_stats IS 'Aggregated view of poll credit statistics';
