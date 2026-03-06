-- =============================================
-- JERKY DATABASE SETUP
-- =============================================
-- Voer deze queries uit in Supabase SQL Editor

-- 1. JERKY BATCHES TABLE
CREATE TABLE IF NOT EXISTS jerky_batches (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  weight_before DECIMAL(10,2) NOT NULL,
  weight_after DECIMAL(10,2) NOT NULL,
  score INTEGER DEFAULT 3 CHECK (score >= 1 AND score <= 5),
  notes TEXT,
  image_url TEXT,
  photo_before TEXT,
  photo_after TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE jerky_batches ENABLE ROW LEVEL SECURITY;

-- Users can view their own batches
CREATE POLICY "Users can view their own jerky batches"
  ON jerky_batches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own batches
CREATE POLICY "Users can insert their own jerky batches"
  ON jerky_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own batches
CREATE POLICY "Users can update their own jerky batches"
  ON jerky_batches FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own batches
CREATE POLICY "Users can delete their own jerky batches"
  ON jerky_batches FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_jerky_batches_user_id ON jerky_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_jerky_batches_created_at ON jerky_batches(created_at DESC);

-- =============================================
-- STORAGE BUCKET SETUP
-- =============================================
-- BELANGRIJK: Maak een storage bucket aan via de Supabase UI:
-- 1. Ga naar Storage in Supabase Dashboard
-- 2. Klik "New bucket"
-- 3. Naam: jerky
-- 4. Public bucket: AAN (zodat afbeeldingen publiek toegankelijk zijn)
-- 5. File size limit: Unset (of 100 MB)
-- 6. Allowed MIME types: Unset (of image/*)

-- =============================================
-- OPTIONEEL: RLS UITSCHAKELEN VOOR TESTEN
-- =============================================
-- Als je zonder authenticatie wilt testen, voer uit:
-- ALTER TABLE jerky_batches DISABLE ROW LEVEL SECURITY;
