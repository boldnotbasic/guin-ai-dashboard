-- Add logo background color field to projects table
-- Voer dit uit in Supabase SQL Editor

-- Add logo_bg_color to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS logo_bg_color TEXT DEFAULT '#FFFFFF';
