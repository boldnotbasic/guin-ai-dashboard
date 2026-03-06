-- =============================================
-- VOEG POSITION VELD TOE AAN IDEAS
-- =============================================
-- Voer deze SQL uit in Supabase SQL Editor

-- Voeg position kolom toe
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Update bestaande rijen met position gebaseerd op created_at
WITH numbered_ideas AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM ideas
)
UPDATE ideas 
SET position = numbered_ideas.row_num
FROM numbered_ideas
WHERE ideas.id = numbered_ideas.id;

-- Voeg index toe voor snellere queries
CREATE INDEX IF NOT EXISTS idx_ideas_position ON ideas(position);
