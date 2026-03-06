-- Create project_colors table for dynamic color management per project
CREATE TABLE IF NOT EXISTS project_colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  hex TEXT NOT NULL,
  rgb TEXT NOT NULL,
  cmyk TEXT NOT NULL,
  name TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_fonts table for dynamic font management per project
CREATE TABLE IF NOT EXISTS project_fonts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  font_type TEXT NOT NULL CHECK (font_type IN ('heading', 'body', 'accent')),
  font_family TEXT NOT NULL,
  font_url TEXT,
  example_text TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_project_colors_project_id ON project_colors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_colors_position ON project_colors(position);
CREATE INDEX IF NOT EXISTS idx_project_fonts_project_id ON project_fonts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_fonts_position ON project_fonts(position);

-- Enable Row Level Security
ALTER TABLE project_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_fonts ENABLE ROW LEVEL SECURITY;

-- Create policies for project_colors
CREATE POLICY "Users can view project colors"
  ON project_colors FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert project colors"
  ON project_colors FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project colors"
  ON project_colors FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project colors"
  ON project_colors FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create policies for project_fonts
CREATE POLICY "Users can view project fonts"
  ON project_fonts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert project fonts"
  ON project_fonts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project fonts"
  ON project_fonts FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project fonts"
  ON project_fonts FOR DELETE
  USING (auth.role() = 'authenticated');
