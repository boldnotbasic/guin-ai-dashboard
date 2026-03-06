-- Create tab_quick_links table for homepage and other tab-specific quick links
CREATE TABLE IF NOT EXISTS tab_quick_links (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_name TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT 'Globe',
  external BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tab_quick_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tab quick links"
  ON tab_quick_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tab quick links"
  ON tab_quick_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tab quick links"
  ON tab_quick_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tab quick links"
  ON tab_quick_links FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tab_quick_links_user_tab ON tab_quick_links(user_id, tab_name);
