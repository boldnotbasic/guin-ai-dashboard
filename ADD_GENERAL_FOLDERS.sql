-- Algemene Inspiration Folders (niet gelinkt aan specifieke inspiration)
-- Voer dit uit in Supabase SQL Editor

-- Modify inspiration_folders to make inspiration_id nullable (for general folders)
ALTER TABLE inspiration_folders 
ALTER COLUMN inspiration_id DROP NOT NULL;

-- Add user_id column to track ownership of general folders
ALTER TABLE inspiration_folders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policy to include user_id check for general folders
DROP POLICY IF EXISTS "inspiration_folders_all_access" ON inspiration_folders;
CREATE POLICY "inspiration_folders_user_access" ON inspiration_folders
  FOR ALL TO authenticated 
  USING (
    auth.uid() = user_id OR 
    inspiration_id IS NOT NULL
  ) 
  WITH CHECK (
    auth.uid() = user_id OR 
    inspiration_id IS NOT NULL
  );
