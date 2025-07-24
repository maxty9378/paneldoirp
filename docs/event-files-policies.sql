-- SQL-скрипт для настройки политик bucket event-files
-- Выполните этот скрипт в Supabase Dashboard -> SQL Editor

-- Политика для загрузки файлов (только авторизованные пользователи)
CREATE POLICY "Users can upload event files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-files' AND 
  auth.role() = 'authenticated'
);

-- Политика для просмотра файлов (публичный доступ)
CREATE POLICY "Anyone can view event files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'event-files'
);

-- Политика для обновления файлов (только авторизованные пользователи)
CREATE POLICY "Users can update their event files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-files' AND 
  auth.role() = 'authenticated'
);

-- Политика для удаления файлов (только авторизованные пользователи)
CREATE POLICY "Users can delete their event files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-files' AND 
  auth.role() = 'authenticated'
); 