-- ============================================================================
-- IHSG Portfolio Tracker — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. CASH FLOWS
-- Logs deposits (top-ups), withdrawals, and dividends.
-- Precise timestamps are CRITICAL for Time-Weighted Return (TWR) calculations.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TYPE cash_flow_type AS ENUM ('TOPUP', 'WITHDRAWAL', 'DIVIDEND');

CREATE TABLE cash_flows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        cash_flow_type NOT NULL,
  amount      NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  flow_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cash flows"
  ON cash_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cash flows"
  ON cash_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash flows"
  ON cash_flows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cash flows"
  ON cash_flows FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_cash_flows_user_date ON cash_flows (user_id, flow_date);


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. TRANSACTIONS
-- Logs BUY and SELL actions with ticker, price, lots, fees.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TYPE transaction_type AS ENUM ('BUY', 'SELL');

CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            transaction_type NOT NULL,
  ticker          VARCHAR(10) NOT NULL,
  price           NUMERIC(18, 2) NOT NULL CHECK (price > 0),
  lots            INTEGER NOT NULL CHECK (lots > 0),
  fee             NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_transactions_user_date ON transactions (user_id, transaction_date);
CREATE INDEX idx_transactions_user_ticker ON transactions (user_id, ticker);


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. IPO ORDERS
-- Tracks IPO lifecycle: ORDERED (cash locked), ALLOTTED (shares received),
-- REFUNDED (cash returned — NOT a new top-up for TWR purposes).
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TYPE ipo_status AS ENUM ('ORDERED', 'ALLOTTED', 'REFUNDED');

CREATE TABLE ipo_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker          VARCHAR(10) NOT NULL,
  status          ipo_status NOT NULL DEFAULT 'ORDERED',
  shares_ordered  INTEGER NOT NULL CHECK (shares_ordered > 0),
  price_per_share NUMERIC(18, 2) NOT NULL CHECK (price_per_share > 0),
  locked_amount   NUMERIC(18, 2) NOT NULL CHECK (locked_amount > 0),
  shares_allotted INTEGER DEFAULT 0 CHECK (shares_allotted >= 0),
  refund_amount   NUMERIC(18, 2) DEFAULT 0 CHECK (refund_amount >= 0),
  order_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  allotment_date  TIMESTAMPTZ,
  refund_date     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ipo_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own IPO orders"
  ON ipo_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IPO orders"
  ON ipo_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IPO orders"
  ON ipo_orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IPO orders"
  ON ipo_orders FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_ipo_orders_user_status ON ipo_orders (user_id, status);
CREATE INDEX idx_ipo_orders_user_date ON ipo_orders (user_id, order_date);


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. WATCHLIST
-- Planned trades with reasoning and target prices.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE watchlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker          VARCHAR(10) NOT NULL,
  target_buy_price NUMERIC(18, 2) CHECK (target_buy_price > 0),
  reasoning       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist items"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist items"
  ON watchlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_watchlist_user_active ON watchlist (user_id, is_active);


-- ──────────────────────────────────────────────────────────────────────────────
-- 5. JOURNALS
-- Historical record of closed trades with post-trade reflections.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE journals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker          VARCHAR(10) NOT NULL,
  buy_date        TIMESTAMPTZ NOT NULL,
  sell_date       TIMESTAMPTZ NOT NULL,
  buy_price       NUMERIC(18, 2) NOT NULL CHECK (buy_price > 0),
  sell_price      NUMERIC(18, 2) NOT NULL CHECK (sell_price > 0),
  lots            INTEGER NOT NULL CHECK (lots > 0),
  fee_buy         NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (fee_buy >= 0),
  fee_sell        NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (fee_sell >= 0),
  initial_reasoning TEXT,
  target_price    NUMERIC(18, 2) CHECK (target_price > 0),
  stop_loss       NUMERIC(18, 2) CHECK (stop_loss > 0),
  reflection      TEXT,
  realized_pnl    NUMERIC(18, 2) GENERATED ALWAYS AS (
                    (sell_price - buy_price) * lots * 100 - fee_buy - fee_sell
                  ) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal entries"
  ON journals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
  ON journals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON journals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON journals FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_journals_user_date ON journals (user_id, sell_date);
CREATE INDEX idx_journals_user_ticker ON journals (user_id, ticker);


-- ──────────────────────────────────────────────────────────────────────────────
-- 6. PORTFOLIO SNAPSHOTS
-- Daily End-of-Day snapshots for fast chart rendering without recalculating
-- the entire ledger on every page load.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE portfolio_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  total_equity    NUMERIC(18, 2) NOT NULL DEFAULT 0,
  portfolio_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  cash_balance    NUMERIC(18, 2) NOT NULL DEFAULT 0,
  daily_pnl       NUMERIC(18, 2) DEFAULT 0,
  daily_pnl_pct   NUMERIC(8, 4) DEFAULT 0,
  cumulative_twr  NUMERIC(12, 6) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_snapshot_date UNIQUE (user_id, snapshot_date)
);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON portfolio_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON portfolio_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON portfolio_snapshots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON portfolio_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_snapshots_user_date ON portfolio_snapshots (user_id, snapshot_date);


-- ──────────────────────────────────────────────────────────────────────────────
-- 7. UPDATED_AT TRIGGER
-- Automatically updates `updated_at` on row modification.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_cash_flows
  BEFORE UPDATE ON cash_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ipo_orders
  BEFORE UPDATE ON ipo_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_watchlist
  BEFORE UPDATE ON watchlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_journals
  BEFORE UPDATE ON journals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
