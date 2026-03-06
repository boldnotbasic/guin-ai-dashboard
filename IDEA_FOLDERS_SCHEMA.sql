-- IdeaCenter Folders & Screenshots Schema
-- Allows users to create folders under ideas and add screenshots with notes

-- Table for idea folders
CREATE TABLE IF NOT EXISTS idea_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id BIGINT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for screenshots within folders
CREATE TABLE IF NOT EXISTS idea_screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID NOT NULL REFERENCES idea_folders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  note TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_idea_folders_idea_id ON idea_folders(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_folders_position ON idea_folders(position);
CREATE INDEX IF NOT EXISTS idx_idea_screenshots_folder_id ON idea_screenshots(folder_id);
CREATE INDEX IF NOT EXISTS idx_idea_screenshots_position ON idea_screenshots(position);

-- Enable RLS
ALTER TABLE idea_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON idea_folders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON idea_screenshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_idea_folders_updated_at
  BEFORE UPDATE ON idea_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_idea_screenshots_updated_at
  BEFORE UPDATE ON idea_screenshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSPIRATION FOLDERS & SCREENSHOTS
-- ============================================

-- Table for inspiration folders
CREATE TABLE IF NOT EXISTS inspiration_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspiration_id BIGINT NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
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

-- RLS Policies (allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON inspiration_folders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON inspiration_screenshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_inspiration_folders_updated_at
  BEFORE UPDATE ON inspiration_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspiration_screenshots_updated_at
  BEFORE UPDATE ON inspiration_screenshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
