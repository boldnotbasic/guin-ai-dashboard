-- Add yahoo_finance_link column to investments table
-- This allows users to manually set a custom Yahoo Finance link
-- for investments where the auto-conversion doesn't work

ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS yahoo_finance_link TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN investments.yahoo_finance_link IS 'Custom Yahoo Finance link URL. If provided, this will be used instead of auto-converting the ticker symbol.';
