-- Expenses (Kosten) schema for Bijberoep

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','annual','one_time')) DEFAULT 'monthly',
  category TEXT,
  website TEXT,
  notes TEXT,
  logo_url TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_position ON expenses(position);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Storage bucket for expense logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('expenses', 'expenses', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'expenses' bucket
CREATE POLICY "Public read access for expense logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'expenses');

CREATE POLICY "Authenticated users can upload expense logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'expenses' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update expense logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'expenses' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete expense logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'expenses' AND auth.role() = 'authenticated');
