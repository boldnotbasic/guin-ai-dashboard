-- Fix RLS policy for autos table to allow authenticated users to insert
-- This fixes the "new row violates row-level security policy" error

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own autos" ON autos;
DROP POLICY IF EXISTS "Users can insert their own autos" ON autos;
DROP POLICY IF EXISTS "Users can update their own autos" ON autos;
DROP POLICY IF EXISTS "Users can delete their own autos" ON autos;

-- Create new policies that allow authenticated users to manage autos
CREATE POLICY "Authenticated users can view autos" ON autos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert autos" ON autos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update autos" ON autos
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete autos" ON autos
  FOR DELETE USING (auth.role() = 'authenticated');
