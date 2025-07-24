# Настройка Storage для файлов мероприятий

## 1. Создание bucket в Supabase Dashboard

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в раздел **Storage** в левом меню
4. Нажмите **Create a new bucket**
5. Заполните форму:
   - **Name**: `event-files`
   - **Public bucket**: ✅ Включено
   - **File size limit**: `50 MB`
   - **Allowed MIME types**: 
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.presentationml.presentation`
     - `application/vnd.ms-powerpoint`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/msword`
     - `application/vnd.ms-excel`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

## 2. Настройка политик доступа

После создания bucket выполните SQL-скрипт в **SQL Editor**:

1. Перейдите в **SQL Editor** в Supabase Dashboard
2. Скопируйте и вставьте содержимое файла `docs/event-files-policies.sql`
3. Нажмите **Run** для выполнения скрипта

Или создайте политики вручную через **Storage → Policies**:

### Политика для загрузки файлов
- **Policy name**: `Users can upload event files`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'event-files'::text) AND (auth.role() = 'authenticated'::text)
```

### Политика для просмотра файлов
- **Policy name**: `Anyone can view event files`
- **Target roles**: `anon, authenticated`
- **Policy definition**:
```sql
(bucket_id = 'event-files'::text)
```

### Политика для обновления файлов
- **Policy name**: `Users can update their event files`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'event-files'::text) AND (auth.role() = 'authenticated'::text)
```

### Политика для удаления файлов
- **Policy name**: `Users can delete their event files`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'event-files'::text) AND (auth.role() = 'authenticated'::text)
```

## 3. Структура файлов

Файлы будут храниться в следующей структуре:
```
event-files/
├── {event_id}/
│   ├── presentation/
│   │   ├── {timestamp}-{random}.pdf
│   │   └── {timestamp}-{random}.pptx
│   └── workbook/
│       ├── {timestamp}-{random}.docx
│       └── {timestamp}-{random}.xlsx
```

## 4. Использование в коде

После настройки bucket вы можете использовать функции из `src/lib/eventFileStorage.ts`:

```typescript
import { uploadEventFile, deleteEventFile, getEventFiles } from '../lib/eventFileStorage';

// Загрузка файла
const result = await uploadEventFile(file, eventId, 'presentation');

// Получение файлов мероприятия
const files = await getEventFiles(eventId);

// Удаление файла
const deleteResult = await deleteEventFile(filePath);
```

## 5. Проверка настройки

После настройки проверьте:
1. Bucket создан и доступен
2. Политики применены корректно
3. Можно загружать файлы через интерфейс
4. Файлы доступны по публичным ссылкам 