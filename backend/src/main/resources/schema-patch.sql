-- Idempotent schema patches for columns added after initial DB creation

-- Add 'stars' column to loyalty if it doesn't exist yet (only if table already exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loyalty') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loyalty' AND column_name = 'stars') THEN
            ALTER TABLE loyalty ADD COLUMN stars INTEGER DEFAULT 0 NOT NULL;
        END IF;
    END IF;
END $$;
