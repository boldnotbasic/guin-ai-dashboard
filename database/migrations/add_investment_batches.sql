-- Create investment_batches table for tracking multiple purchases of same stock
-- This allows users to add multiple purchase batches to a single investment
-- Example: Buy 3x VWCE @ €150 in January, then 4x VWCE @ €160 in March

CREATE TABLE IF NOT EXISTS investment_batches (
  id BIGSERIAL PRIMARY KEY,
  investment_id BIGINT NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shares DECIMAL(18, 8) NOT NULL,
  purchase_price DECIMAL(18, 2) NOT NULL,
  amount DECIMAL(18, 2) NOT NULL, -- shares * purchase_price
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_short column to investments table for short position support
ALTER TABLE investments ADD COLUMN IF NOT EXISTS is_short BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_investment_batches_investment_id ON investment_batches(investment_id);
CREATE INDEX IF NOT EXISTS idx_investment_batches_purchase_date ON investment_batches(purchase_date);

-- Add RLS (Row Level Security) policies
ALTER TABLE investment_batches ENABLE ROW LEVEL SECURITY;

-- Users can only see batches for their own investments
CREATE POLICY "Users can view their own investment batches"
  ON investment_batches FOR SELECT
  USING (
    investment_id IN (
      SELECT id FROM investments WHERE user_id = auth.uid()
    )
  );

-- Users can insert batches for their own investments
CREATE POLICY "Users can insert batches for their own investments"
  ON investment_batches FOR INSERT
  WITH CHECK (
    investment_id IN (
      SELECT id FROM investments WHERE user_id = auth.uid()
    )
  );

-- Users can update their own investment batches
CREATE POLICY "Users can update their own investment batches"
  ON investment_batches FOR UPDATE
  USING (
    investment_id IN (
      SELECT id FROM investments WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own investment batches
CREATE POLICY "Users can delete their own investment batches"
  ON investment_batches FOR DELETE
  USING (
    investment_id IN (
      SELECT id FROM investments WHERE user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investment_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_investment_batches_updated_at
  BEFORE UPDATE ON investment_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_batches_updated_at();
