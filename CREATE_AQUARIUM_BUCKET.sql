-- Create aquarium storage bucket for fish/creature image uploads
-- Voer dit uit in Supabase SQL Editor

-- Create the aquarium bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('aquarium', 'aquarium', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the aquarium bucket
CREATE POLICY "Users can upload fish images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'aquarium' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view fish images" ON storage.objects
FOR SELECT USING (bucket_id = 'aquarium');

CREATE POLICY "Users can update fish images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'aquarium' AND 
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'aquarium' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete fish images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'aquarium' AND 
  auth.role() = 'authenticated'
);
