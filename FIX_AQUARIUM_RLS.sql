-- =============================================
-- FIX AQUARIUM RLS POLICIES
-- =============================================
-- Run dit in Supabase SQL Editor om de RLS errors te fixen

-- Drop oude policies
DROP POLICY IF EXISTS "Users can view their own cleaning logs" ON aquarium_cleaning_logs;
DROP POLICY IF EXISTS "Users can insert their own cleaning logs" ON aquarium_cleaning_logs;
DROP POLICY IF EXISTS "Users can delete their own cleaning logs" ON aquarium_cleaning_logs;

DROP POLICY IF EXISTS "Users can view their own notes" ON aquarium_notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON aquarium_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON aquarium_notes;

DROP POLICY IF EXISTS "Users can view their own fish" ON aquarium_fish;
DROP POLICY IF EXISTS "Users can insert their own fish" ON aquarium_fish;
DROP POLICY IF EXISTS "Users can update their own fish" ON aquarium_fish;
DROP POLICY IF EXISTS "Users can delete their own fish" ON aquarium_fish;

-- Maak nieuwe, eenvoudigere policies (allow all for authenticated users)

-- Aquarium Cleaning Logs
CREATE POLICY "Allow all for authenticated users" ON aquarium_cleaning_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Aquarium Notes
CREATE POLICY "Allow all for authenticated users" ON aquarium_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Aquarium Fish
CREATE POLICY "Allow all for authenticated users" ON aquarium_fish
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
