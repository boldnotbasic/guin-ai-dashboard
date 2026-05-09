-- ============================================
-- STAP 1: Database kolommen toevoegen
-- ============================================
ALTER TABLE investments ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS circular_thumbnail BOOLEAN DEFAULT FALSE;

-- ============================================
-- STAP 2: Fix RLS policies voor investments
-- ============================================
DROP POLICY IF EXISTS "Users can view their own investments" ON investments;
DROP POLICY IF EXISTS "Users can insert their own investments" ON investments;
DROP POLICY IF EXISTS "Users can update their own investments" ON investments;
DROP POLICY IF EXISTS "Users can delete their own investments" ON investments;
DROP POLICY IF EXISTS "Authenticated users can view investments" ON investments;
DROP POLICY IF EXISTS "Authenticated users can insert investments" ON investments;
DROP POLICY IF EXISTS "Authenticated users can update investments" ON investments;
DROP POLICY IF EXISTS "Authenticated users can delete investments" ON investments;

CREATE POLICY "Authenticated users can view investments" ON investments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert investments" ON investments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update investments" ON investments
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete investments" ON investments
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- STAP 3: Fix RLS policies voor investment_links
-- ============================================
DROP POLICY IF EXISTS "Users can view their own investment_links" ON investment_links;
DROP POLICY IF EXISTS "Users can insert their own investment_links" ON investment_links;
DROP POLICY IF EXISTS "Users can update their own investment_links" ON investment_links;
DROP POLICY IF EXISTS "Users can delete their own investment_links" ON investment_links;
DROP POLICY IF EXISTS "Authenticated users can view investment_links" ON investment_links;
DROP POLICY IF EXISTS "Authenticated users can insert investment_links" ON investment_links;
DROP POLICY IF EXISTS "Authenticated users can update investment_links" ON investment_links;
DROP POLICY IF EXISTS "Authenticated users can delete investment_links" ON investment_links;

CREATE POLICY "Authenticated users can view investment_links" ON investment_links
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert investment_links" ON investment_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update investment_links" ON investment_links
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete investment_links" ON investment_links
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- STAP 4: Storage bucket voor thumbnails
-- Maak EERST de bucket aan via Supabase Dashboard:
--   1. Ga naar Storage (linker menu)
--   2. Klik "New bucket"
--   3. Naam: investments
--   4. Vink "Public bucket" AAN
--   5. Klik "Create bucket"
-- Voer DAARNA onderstaande policies uit:
-- ============================================

-- Storage policies (voer uit NA het aanmaken van de bucket)
DROP POLICY IF EXISTS "Authenticated users can upload investment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view investment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete investment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update investment images" ON storage.objects;

CREATE POLICY "Authenticated users can upload investment images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'investments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view investment images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'investments');

CREATE POLICY "Authenticated users can update investment images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'investments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete investment images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'investments' AND auth.role() = 'authenticated');
