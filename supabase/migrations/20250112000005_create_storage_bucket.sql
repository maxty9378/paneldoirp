-- Создание bucket для хранения фото досье
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dossier-photos',
  'dossier-photos',
  true,
  5242880, -- 5MB в байтах
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Политики RLS для bucket
CREATE POLICY "Anyone can view dossier photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'dossier-photos');

CREATE POLICY "Authenticated users can upload dossier photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'dossier-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own dossier photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'dossier-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own dossier photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'dossier-photos' 
    AND auth.role() = 'authenticated'
  );
