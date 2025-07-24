# Инструкция по настройке таблицы event_files

## Проблема
В данный момент функциональность сохранения пользовательских названий файлов временно отключена, так как таблица `event_files` не существует в базе данных.

## Решение

### 1. Откройте Supabase Dashboard
1. Перейдите на [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в раздел **SQL Editor** в левом меню

### 2. Выполните SQL скрипт
Скопируйте и вставьте следующий SQL код в SQL Editor:

```sql
-- Create event_files table for storing file metadata
-- Execute this script in Supabase Dashboard SQL Editor

-- Drop table if exists (for testing)
-- DROP TABLE IF EXISTS event_files CASCADE;

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

-- Enable RLS
ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Event creators can manage their event files" ON event_files;
DROP POLICY IF EXISTS "Users can read event files for events they have access to" ON event_files;

-- Event files policies with unique names
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
          AND role = 'administrator'::user_role_enum
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
          AND role = ANY(ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
        )
      )
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_event_files_event_id ON event_files(event_id);
CREATE INDEX IF NOT EXISTS idx_event_files_file_type ON event_files(file_type);

-- Verify table creation
SELECT 'Table event_files created successfully' as status;
```

### 3. Нажмите "Run"
Выполните скрипт, нажав кнопку **Run** в SQL Editor.

### 4. Проверьте создание таблицы
1. Перейдите в раздел **Table Editor**
2. Убедитесь, что таблица `event_files` появилась в списке таблиц

### 5. Включите функциональность в коде
После создания таблицы нужно будет раскомментировать код в файле `src/lib/eventFileStorage.ts`:

1. Откройте файл `src/lib/eventFileStorage.ts`
2. Найдите закомментированные блоки кода (обернутые в `/* */`)
3. Раскомментируйте их, удалив `/*` и `*/`

### 6. Перезапустите приложение
После внесения изменений перезапустите приложение командой:
```bash
npm run dev
```

## Что делает эта таблица

Таблица `event_files` хранит метаданные файлов мероприятий:

- **id** - уникальный идентификатор записи
- **event_id** - ссылка на мероприятие
- **file_name** - пользовательское название файла
- **file_url** - ссылка на файл в Storage
- **file_type** - тип файла ('presentation' или 'workbook')
- **file_size** - размер файла в байтах
- **uploaded_by** - пользователь, загрузивший файл
- **created_at** - дата создания записи

## Политики безопасности

Создаются две политики безопасности:

1. **event_files_manage_policy** - создатели мероприятий могут управлять файлами своих мероприятий
2. **event_files_read_policy** - пользователи могут читать файлы мероприятий, к которым у них есть доступ

**Примечание:** Используются уникальные названия политик, чтобы избежать конфликтов с существующими политиками Storage.

## После настройки

После выполнения всех шагов функциональность сохранения пользовательских названий файлов будет полностью работать:

- ✅ Автоматическое получение названия файла при загрузке
- ✅ Возможность переименования файла
- ✅ Сохранение пользовательского названия на сервере
- ✅ Отображение пользовательских названий при повторном открытии мероприятия 