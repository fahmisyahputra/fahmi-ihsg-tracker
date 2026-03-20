-- Relax constraints on journals to allow for open trades (Step 28C)
-- Run this in your Supabase SQL Editor

ALTER TABLE journals ALTER COLUMN sell_date DROP NOT NULL;
ALTER TABLE journals ALTER COLUMN sell_price DROP NOT NULL;

-- Drop the old constraint that forced sell_price > 0
ALTER TABLE journals DROP CONSTRAINT IF EXISTS journals_sell_price_check;

-- Add a new constraint that allows NULL sell_price or enforces > 0 if present
ALTER TABLE journals ADD CONSTRAINT journals_sell_price_check CHECK (sell_price > 0 OR sell_price IS NULL);
