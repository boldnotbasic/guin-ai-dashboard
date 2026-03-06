-- =============================================
-- STORAGE POLICIES FIX
-- =============================================
-- De buckets bestaan maar kunnen niet worden gelezen
-- Dit fix voegt de juiste policies toe

-- 1. Verwijder eerst de 'ideas' bucket en maak opnieuw aan met policies
-- Dit kan alleen via Supabase UI, niet via SQL

-- 2. Voeg storage policies toe (voer dit uit in SQL Editor):

-- Policy om buckets te kunnen lezen
INSERT INTO storage.buckets (id, name, public)
VALUES ('ideas', 'ideas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy voor authenticated users om files te uploaden
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Authenticated users can upload to ideas',
  'ideas',
  '(bucket_id = ''ideas'' AND auth.role() = ''authenticated'')'
);

-- Policy voor iedereen om files te lezen (omdat bucket public is)
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Anyone can read from ideas',
  'ideas',
  '(bucket_id = ''ideas'')'
);

-- =============================================
-- ALTERNATIEF: Gebruik oude SQL API (deprecated maar werkt soms beter)
-- =============================================
-- Als bovenstaande niet werkt, probeer dit:

-- Eerst bucket verwijderen via UI, dan:
-- INSERT INTO storage.buckets (id, name, public, owner)
-- VALUES ('ideas', 'ideas', true, auth.uid());
