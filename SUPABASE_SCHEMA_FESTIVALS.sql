-- Festivals (Privé) schema

-- Create festivals table
CREATE TABLE IF NOT EXISTS festivals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  tickets_url TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_festivals_user_id ON festivals(user_id);
CREATE INDEX IF NOT EXISTS idx_festivals_created_at ON festivals(created_at DESC);

-- Enable Row Level Security
ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own festivals"
  ON festivals FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own festivals"
  ON festivals FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own festivals"
  ON festivals FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own festivals"
  ON festivals FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Storage bucket for festival images
INSERT INTO storage.buckets (id, name, public)
VALUES ('festivals', 'festivals', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'festivals' bucket
CREATE POLICY "Public read access for festival images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'festivals');

CREATE POLICY "Authenticated users can upload festival images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'festivals' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update festival images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'festivals' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete festival images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'festivals' AND auth.role() = 'authenticated');
