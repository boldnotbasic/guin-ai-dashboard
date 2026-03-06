-- =============================================
-- TIJDELIJK RLS UITSCHAKELEN (ALLEEN VOOR TESTEN!)
-- =============================================
-- WAARSCHUWING: Dit maakt de tabel ONVEILIG
-- Gebruik dit ALLEEN voor lokale development!

-- Schakel RLS uit voor ideas tabel
ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;

-- Om RLS weer AAN te zetten (na testen):
-- ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
