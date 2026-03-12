-- Idempotent schema patches for columns added after initial DB creation

-- Add 'stars' column to loyalty if it doesn't exist yet
ALTER TABLE loyalty ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0 NOT NULL;
