# Быстрое исправление ошибки с политиками

## Проблема
При выполнении SQL скрипта возникает ошибка:
```
ERROR: 42710: policy "Users can upload event files" for table "objects" already exists
```

## Решение

### Вариант 1: Использовать исправленный скрипт
Используйте файл `docs/create_event_files_table_fixed.sql` вместо оригинального скрипта.

### Вариант 2: Выполнить команды по отдельности

1. **Сначала создайте таблицу:**
```sql
CREATE TABLE IF NOT EXISTS event_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('presentation', 'workbook')),
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;
```

2. **Затем создайте политики с уникальными названиями:**
```sql
CREATE POLICY "event_files_manage_policy"
  ON event_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_files.event_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = 'administrator'
        )
      )
    )
  );

CREATE POLICY "event_files_read_policy"
  ON event_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_files.event_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_participants
          WHERE event_id = event_files.event_id
          AND user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = ANY(ARRAY['administrator', 'moderator'])
        )
      )
    )
  );
```

3. **Создайте индексы:**
```sql
CREATE INDEX IF NOT EXISTS idx_event_files_event_id ON event_files(event_id);
CREATE INDEX IF NOT EXISTS idx_event_files_file_type ON event_files(file_type);
```

## Причина ошибки
Ошибка возникает потому, что политика с названием "Users can upload event files" уже существует для таблицы Storage (objects). Исправленный скрипт использует уникальные названия политик для избежания конфликтов. 