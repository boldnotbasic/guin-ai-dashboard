-- Create stock_counts table for Stoktelling (Stock Counting)
-- Voer dit uit in Supabase SQL Editor

-- Create the stock_counts table
CREATE TABLE IF NOT EXISTS stock_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress' or 'completed'
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of scanned items
  total_items INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_counts_user_id ON stock_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stock_counts(date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts(status);

-- Enable Row Level Security
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own stock counts"
  ON stock_counts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stock counts"
  ON stock_counts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock counts"
  ON stock_counts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock counts"
  ON stock_counts FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_counts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS stock_counts_updated_at ON stock_counts;
CREATE TRIGGER stock_counts_updated_at
  BEFORE UPDATE ON stock_counts
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_counts_updated_at();

-- Add comment to table
COMMENT ON TABLE stock_counts IS 'Stoktelling (Stock Counting) - Barcode scanner inventory counts';
COMMENT ON COLUMN stock_counts.items IS 'JSONB array containing: [{barcode, product, size, quantity, scannedAt}]';
COMMENT ON COLUMN stock_counts.status IS 'Status: in_progress or completed';
COMMENT ON COLUMN stock_counts.total_items IS 'Total number of unique products';
COMMENT ON COLUMN stock_counts.total_quantity IS 'Total quantity of all items combined';
