-- Migration to configure Supabase Storage Buckets and RLS Policies

-- 1. Create or configure Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('pet-avatars', 'pet-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('audio-analysis', 'audio-analysis', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg']::text[]),
  ('video-analysis', 'video-analysis', false, 209715200, ARRAY['video/mp4', 'video/quicktime', 'video/webm']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Ensure RLS is enabled on storage.objects
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Policies for pet-avatars (Public read, Authenticated write to their own folder)
DROP POLICY IF EXISTS "pet_avatars_public_read" ON storage.objects;
CREATE POLICY "pet_avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-avatars');

DROP POLICY IF EXISTS "pet_avatars_owner_write" ON storage.objects;
CREATE POLICY "pet_avatars_owner_write" ON storage.objects
  FOR ALL USING (
    bucket_id = 'pet-avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policies for audio-analysis (Private, owner only read/write)
DROP POLICY IF EXISTS "audio_analysis_owner_all" ON storage.objects;
CREATE POLICY "audio_analysis_owner_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'audio-analysis'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policies for video-analysis (Private, owner only read/write)
DROP POLICY IF EXISTS "video_analysis_owner_all" ON storage.objects;
CREATE POLICY "video_analysis_owner_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'video-analysis'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
