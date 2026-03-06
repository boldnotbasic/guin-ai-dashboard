-- =============================================
-- AQUARIUM DATABASE SETUP
-- =============================================
-- Voer deze queries uit in Supabase SQL Editor
-- (Supabase Dashboard -> SQL Editor -> New Query)

-- 1. AQUARIUM CLEANING LOGS TABLE
CREATE TABLE IF NOT EXISTS aquarium_cleaning_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aquarium_name TEXT NOT NULL DEFAULT 'Juwel 450l', -- 'Juwel 450l' or 'Superfish 30l'
  cleaning_type TEXT NOT NULL DEFAULT 'waterverversing', -- 'waterverversing' or 'grondige_schoonmaak'
  type TEXT DEFAULT 'cleaning', -- Legacy field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AQUARIUM NOTES TABLE
CREATE TABLE IF NOT EXISTS aquarium_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AQUARIUM FISH TABLE (met foto support)
CREATE TABLE IF NOT EXISTS aquarium_fish (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  birth_date DATE, -- Geboortedatum van vis
  notes TEXT,
  image_url TEXT, -- URL to uploaded image
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE aquarium_cleaning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aquarium_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aquarium_fish ENABLE ROW LEVEL SECURITY;

-- Aquarium Cleaning Logs Policies
CREATE POLICY "Users can view their own cleaning logs"
  ON aquarium_cleaning_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cleaning logs"
  ON aquarium_cleaning_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cleaning logs"
  ON aquarium_cleaning_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Aquarium Notes Policies
CREATE POLICY "Users can view their own notes"
  ON aquarium_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON aquarium_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON aquarium_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Aquarium Fish Policies
CREATE POLICY "Users can view their own fish"
  ON aquarium_fish FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fish"
  ON aquarium_fish FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fish"
  ON aquarium_fish FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fish"
  ON aquarium_fish FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- INDEXES voor betere performance
-- =============================================
CREATE INDEX IF NOT EXISTS aquarium_cleaning_logs_user_id_idx ON aquarium_cleaning_logs(user_id);
CREATE INDEX IF NOT EXISTS aquarium_cleaning_logs_date_idx ON aquarium_cleaning_logs(date DESC);

CREATE INDEX IF NOT EXISTS aquarium_notes_user_id_idx ON aquarium_notes(user_id);
CREATE INDEX IF NOT EXISTS aquarium_notes_date_idx ON aquarium_notes(date DESC);

CREATE INDEX IF NOT EXISTS aquarium_fish_user_id_idx ON aquarium_fish(user_id);
CREATE INDEX IF NOT EXISTS aquarium_fish_added_date_idx ON aquarium_fish(added_date DESC);
