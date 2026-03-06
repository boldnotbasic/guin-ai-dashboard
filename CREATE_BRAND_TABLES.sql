-- Create brand_colors table
CREATE TABLE IF NOT EXISTS brand_colors (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hex TEXT NOT NULL,
  rgb TEXT NOT NULL,
  cmyk TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create brand_fonts table
CREATE TABLE IF NOT EXISTS brand_fonts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('heading', 'body')),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE brand_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_fonts ENABLE ROW LEVEL SECURITY;

-- Create policies for brand_colors
CREATE POLICY "Users can view their own brand colors"
  ON brand_colors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand colors"
  ON brand_colors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand colors"
  ON brand_colors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand colors"
  ON brand_colors FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for brand_fonts
CREATE POLICY "Users can view their own brand fonts"
  ON brand_fonts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand fonts"
  ON brand_fonts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand fonts"
  ON brand_fonts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand fonts"
  ON brand_fonts FOR DELETE
  USING (auth.uid() = user_id);
