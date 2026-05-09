-- Fix RLS policies for all user-specific tables
-- This allows authenticated users to manage all their data

-- Autos
DROP POLICY IF EXISTS "Users can view their own autos" ON autos;
DROP POLICY IF EXISTS "Users can insert their own autos" ON autos;
DROP POLICY IF EXISTS "Users can update their own autos" ON autos;
DROP POLICY IF EXISTS "Users can delete their own autos" ON autos;

CREATE POLICY "Authenticated users can view autos" ON autos
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert autos" ON autos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update autos" ON autos
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete autos" ON autos
  FOR DELETE USING (auth.role() = 'authenticated');

-- Aquarium Fish
DROP POLICY IF EXISTS "Users can view their own aquarium_fish" ON aquarium_fish;
DROP POLICY IF EXISTS "Users can insert their own aquarium_fish" ON aquarium_fish;
DROP POLICY IF EXISTS "Users can update their own aquarium_fish" ON aquarium_fish;
DROP POLICY IF EXISTS "Users can delete their own aquarium_fish" ON aquarium_fish;

CREATE POLICY "Authenticated users can view aquarium_fish" ON aquarium_fish
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert aquarium_fish" ON aquarium_fish
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update aquarium_fish" ON aquarium_fish
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete aquarium_fish" ON aquarium_fish
  FOR DELETE USING (auth.role() = 'authenticated');

-- Jerky Batches
DROP POLICY IF EXISTS "Users can view their own jerky_batches" ON jerky_batches;
DROP POLICY IF EXISTS "Users can insert their own jerky_batches" ON jerky_batches;
DROP POLICY IF EXISTS "Users can update their own jerky_batches" ON jerky_batches;
DROP POLICY IF EXISTS "Users can delete their own jerky_batches" ON jerky_batches;

CREATE POLICY "Authenticated users can view jerky_batches" ON jerky_batches
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert jerky_batches" ON jerky_batches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update jerky_batches" ON jerky_batches
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete jerky_batches" ON jerky_batches
  FOR DELETE USING (auth.role() = 'authenticated');

-- Festivals
DROP POLICY IF EXISTS "Users can view their own festivals" ON festivals;
DROP POLICY IF EXISTS "Users can insert their own festivals" ON festivals;
DROP POLICY IF EXISTS "Users can update their own festivals" ON festivals;
DROP POLICY IF EXISTS "Users can delete their own festivals" ON festivals;

CREATE POLICY "Authenticated users can view festivals" ON festivals
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert festivals" ON festivals
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update festivals" ON festivals
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete festivals" ON festivals
  FOR DELETE USING (auth.role() = 'authenticated');

-- Recipes
DROP POLICY IF EXISTS "Users can view their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON recipes;

CREATE POLICY "Authenticated users can view recipes" ON recipes
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert recipes" ON recipes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update recipes" ON recipes
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete recipes" ON recipes
  FOR DELETE USING (auth.role() = 'authenticated');

-- Expenses
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;

CREATE POLICY "Authenticated users can view expenses" ON expenses
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert expenses" ON expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update expenses" ON expenses
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete expenses" ON expenses
  FOR DELETE USING (auth.role() = 'authenticated');

-- Ideas
DROP POLICY IF EXISTS "Users can view their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can insert their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete their own ideas" ON ideas;

CREATE POLICY "Authenticated users can view ideas" ON ideas
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert ideas" ON ideas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update ideas" ON ideas
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete ideas" ON ideas
  FOR DELETE USING (auth.role() = 'authenticated');

-- Inspirations
DROP POLICY IF EXISTS "Users can view their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can insert their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can update their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can delete their own inspirations" ON inspirations;

CREATE POLICY "Authenticated users can view inspirations" ON inspirations
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert inspirations" ON inspirations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update inspirations" ON inspirations
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete inspirations" ON inspirations
  FOR DELETE USING (auth.role() = 'authenticated');
