-- Create inspirations table for Inspiration Center
CREATE TABLE IF NOT EXISTS inspirations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  local_folder_path TEXT,
  photos TEXT[] DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inspirations_user_id ON inspirations(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirations_position ON inspirations(position);
CREATE INDEX IF NOT EXISTS idx_inspirations_created_at ON inspirations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE inspirations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own inspirations"
  ON inspirations FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own inspirations"
  ON inspirations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own inspirations"
  ON inspirations FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own inspirations"
  ON inspirations FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create storage bucket for inspiration images (singular to match app config)
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspiration', 'inspiration', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for inspirations bucket
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspiration');

CREATE POLICY "Authenticated users can upload inspiration images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspiration' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own inspiration images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'inspiration' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own inspiration images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'inspiration' AND auth.role() = 'authenticated');
