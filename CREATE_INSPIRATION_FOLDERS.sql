-- ALLEEN INSPIRATION FOLDERS & SCREENSHOTS
-- Voer dit uit in Supabase SQL Editor

-- Table for inspiration folders
CREATE TABLE IF NOT EXISTS inspiration_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspiration_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for screenshots within inspiration folders
CREATE TABLE IF NOT EXISTS inspiration_screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID NOT NULL REFERENCES inspiration_folders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  note TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inspiration_folders_inspiration_id ON inspiration_folders(inspiration_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_folders_position ON inspiration_folders(position);
CREATE INDEX IF NOT EXISTS idx_inspiration_screenshots_folder_id ON inspiration_screenshots(folder_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_screenshots_position ON inspiration_screenshots(position);

-- Enable RLS
ALTER TABLE inspiration_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies met unieke namen
DROP POLICY IF EXISTS "inspiration_folders_all_access" ON inspiration_folders;
CREATE POLICY "inspiration_folders_all_access" ON inspiration_folders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inspiration_screenshots_all_access" ON inspiration_screenshots;
CREATE POLICY "inspiration_screenshots_all_access" ON inspiration_screenshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_inspiration_folders_updated_at ON inspiration_folders;
CREATE TRIGGER update_inspiration_folders_updated_at
  BEFORE UPDATE ON inspiration_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inspiration_screenshots_updated_at ON inspiration_screenshots;
CREATE TRIGGER update_inspiration_screenshots_updated_at
  BEFORE UPDATE ON inspiration_screenshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
