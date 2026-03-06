-- =============================================
-- AUTO DATABASE SETUP
-- =============================================
-- Voer deze queries uit in Supabase SQL Editor

-- 1. AUTOS TABLE
CREATE TABLE IF NOT EXISTS autos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  photos TEXT[], -- Array of photo URLs
  items JSONB DEFAULT '[]'::jsonb, -- Array of {key: '', value: ''} objects voor specs
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE autos ENABLE ROW LEVEL SECURITY;

-- Users can view their own autos
CREATE POLICY "Users can view their own autos"
  ON autos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own autos
CREATE POLICY "Users can insert their own autos"
  ON autos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own autos
CREATE POLICY "Users can update their own autos"
  ON autos FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own autos
CREATE POLICY "Users can delete their own autos"
  ON autos FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_autos_user_id ON autos(user_id);
CREATE INDEX IF NOT EXISTS idx_autos_created_at ON autos(created_at);
CREATE INDEX IF NOT EXISTS idx_autos_position ON autos(position);

-- =============================================
-- STORAGE BUCKET SETUP
-- =============================================
-- BELANGRIJK: Maak een storage bucket aan via de Supabase UI:
-- 1. Ga naar Storage in Supabase Dashboard
-- 2. Klik "New bucket"
-- 3. Naam: autos
-- 4. Public bucket: AAN (zodat afbeeldingen publiek toegankelijk zijn)
-- 5. File size limit: Unset (of 100 MB)
-- 6. Allowed MIME types: Unset (of image/*)

-- =============================================
-- OPTIONEEL: RLS UITSCHAKELEN VOOR TESTEN
-- =============================================
-- Als je zonder authenticatie wilt testen, voer uit:
-- ALTER TABLE autos DISABLE ROW LEVEL SECURITY;
