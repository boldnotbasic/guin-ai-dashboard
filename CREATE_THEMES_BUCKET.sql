-- Create themes storage bucket for image uploads
-- Voer dit uit in Supabase SQL Editor

-- Create the themes bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('themes', 'themes', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the themes bucket
CREATE POLICY "Public uploads are allowed" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'themes');

CREATE POLICY "Public downloads are allowed" ON storage.objects
FOR SELECT WITH CHECK (bucket_id = 'themes');

CREATE POLICY "Users can upload their own theme images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'themes' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view all theme images" ON storage.objects
FOR SELECT USING (bucket_id = 'themes');

CREATE POLICY "Users can update their own theme images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'themes' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own theme images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'themes' AND 
  auth.role() = 'authenticated'
);
