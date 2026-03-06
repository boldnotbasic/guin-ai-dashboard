-- =============================================
-- IDEA CENTER DATABASE SETUP
-- =============================================
-- Voer deze queries uit in Supabase SQL Editor

-- 1. IDEAS TABLE
CREATE TABLE IF NOT EXISTS ideas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  local_folder_path TEXT,
  photos TEXT[], -- Array of photo URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Ideas Policies
CREATE POLICY "Users can view their own ideas"
  ON ideas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ideas"
  ON ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ideas"
  ON ideas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas"
  ON ideas FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- INDEXES voor betere performance
-- =============================================
CREATE INDEX IF NOT EXISTS ideas_user_id_idx ON ideas(user_id);
CREATE INDEX IF NOT EXISTS ideas_created_at_idx ON ideas(created_at DESC);

-- =============================================
-- STORAGE BUCKET SETUP (via Supabase UI)
-- =============================================
-- BELANGRIJK: Voer dit uit in de Supabase Dashboard UI, NIET via SQL!
-- 
-- Stappen:
-- 1. Ga naar Supabase Dashboard -> Storage (links in menu)
-- 2. Klik "New Bucket" (groene knop rechtsboven)
-- 3. Vul in:
--    - Name: ideas
--    - Public bucket: AAN (toggle naar rechts)
-- 4. Klik "Create bucket"
-- 5. Bucket is nu klaar voor gebruik!
--
-- Policies worden automatisch ingesteld voor public buckets.
