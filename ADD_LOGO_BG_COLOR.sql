-- Add logo background color field to inspirations and ideas tables
-- Voer dit uit in Supabase SQL Editor

-- Add logo_bg_color to inspirations table
ALTER TABLE inspirations 
ADD COLUMN IF NOT EXISTS logo_bg_color TEXT DEFAULT '#FFFFFF';

-- Add logo_bg_color to ideas table
ALTER TABLE ideas 
ADD COLUMN IF NOT EXISTS logo_bg_color TEXT DEFAULT '#FFFFFF';
