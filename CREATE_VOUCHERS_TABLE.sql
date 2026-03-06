-- =============================================
-- Create Vouchers Table
-- Voer dit uit in Supabase SQL Editor
-- =============================================

-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  expiry_date DATE,
  redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own vouchers" ON vouchers;
DROP POLICY IF EXISTS "Users can insert their own vouchers" ON vouchers;
DROP POLICY IF EXISTS "Users can update their own vouchers" ON vouchers;
DROP POLICY IF EXISTS "Users can delete their own vouchers" ON vouchers;

-- Create RLS policies
CREATE POLICY "Users can view their own vouchers"
  ON vouchers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vouchers"
  ON vouchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vouchers"
  ON vouchers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vouchers"
  ON vouchers FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_redeemed ON vouchers(redeemed);
CREATE INDEX IF NOT EXISTS idx_vouchers_expiry_date ON vouchers(expiry_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vouchers_updated_at ON vouchers;
CREATE TRIGGER vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW
  EXECUTE FUNCTION update_vouchers_updated_at();
