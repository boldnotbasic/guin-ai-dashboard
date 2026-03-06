-- =============================================
-- QUICK FIX: Create missing tables
-- Voer dit uit in Supabase SQL Editor
-- =============================================

-- 1. Tab Quick Links Table
CREATE TABLE IF NOT EXISTS tab_quick_links (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_name TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT 'Globe',
  external BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tab_quick_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tab quick links" ON tab_quick_links;
DROP POLICY IF EXISTS "Users can insert their own tab quick links" ON tab_quick_links;
DROP POLICY IF EXISTS "Users can update their own tab quick links" ON tab_quick_links;
DROP POLICY IF EXISTS "Users can delete their own tab quick links" ON tab_quick_links;

CREATE POLICY "Users can view their own tab quick links"
  ON tab_quick_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tab quick links"
  ON tab_quick_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tab quick links"
  ON tab_quick_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tab quick links"
  ON tab_quick_links FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tab_quick_links_user_tab ON tab_quick_links(user_id, tab_name);

-- 2. Brand Colors Table
CREATE TABLE IF NOT EXISTS brand_colors (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hex TEXT NOT NULL,
  rgb TEXT NOT NULL,
  cmyk TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own brand colors" ON brand_colors;
DROP POLICY IF EXISTS "Users can insert their own brand colors" ON brand_colors;
DROP POLICY IF EXISTS "Users can update their own brand colors" ON brand_colors;
DROP POLICY IF EXISTS "Users can delete their own brand colors" ON brand_colors;

CREATE POLICY "Users can view their own brand colors"
  ON brand_colors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand colors"
  ON brand_colors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand colors"
  ON brand_colors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand colors"
  ON brand_colors FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Brand Fonts Table
CREATE TABLE IF NOT EXISTS brand_fonts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('heading', 'body')),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_fonts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own brand fonts" ON brand_fonts;
DROP POLICY IF EXISTS "Users can insert their own brand fonts" ON brand_fonts;
DROP POLICY IF EXISTS "Users can update their own brand fonts" ON brand_fonts;
DROP POLICY IF EXISTS "Users can delete their own brand fonts" ON brand_fonts;

CREATE POLICY "Users can view their own brand fonts"
  ON brand_fonts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand fonts"
  ON brand_fonts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand fonts"
  ON brand_fonts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand fonts"
  ON brand_fonts FOR DELETE
  USING (auth.uid() = user_id);
