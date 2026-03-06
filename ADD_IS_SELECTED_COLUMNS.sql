-- Add is_selected column to hotels table
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false;

-- Add is_selected column to flights table
ALTER TABLE flights
ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false;
