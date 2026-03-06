-- Test of de tab_quick_links tabel bestaat
-- Voer dit uit in Supabase SQL Editor

-- 1. Check of tabel bestaat
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'tab_quick_links'
);

-- 2. Als tabel bestaat, toon alle data
SELECT * FROM tab_quick_links;

-- 3. Toon alle policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tab_quick_links';
