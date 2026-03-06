-- =============================================
-- RECIPES (KOKEN) TABLE + STORAGE
-- Voer dit script uit in de Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_url TEXT,
  ingredients TEXT,
  shopping_list TEXT,
  checklist TEXT,
  notes TEXT,
  tags TEXT[],
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recipes" ON recipes;
CREATE POLICY "Users can view own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKET: recipes
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipes', 'recipes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read recipes" ON storage.objects;
CREATE POLICY "Public read recipes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipes');

DROP POLICY IF EXISTS "Authenticated upload recipes" ON storage.objects;
CREATE POLICY "Authenticated upload recipes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recipes' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update recipes" ON storage.objects;
CREATE POLICY "Authenticated update recipes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'recipes' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete recipes" ON storage.objects;
CREATE POLICY "Authenticated delete recipes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'recipes' AND auth.role() = 'authenticated');
