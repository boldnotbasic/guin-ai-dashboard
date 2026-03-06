-- Add profile_photo_url column to profiles table
-- Voer dit uit in Supabase SQL Editor

-- Add profile_photo_url to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
