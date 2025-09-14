# Инструкция по восстановлению базы данных

## Шаг 1: Выполните полный скрипт восстановления

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Скопируйте и выполните содержимое файла `complete_restore.sql`
4. Дождитесь завершения выполнения

## Шаг 2: Примените миграции

После выполнения полного скрипта восстановления, выполните:

```bash
npx supabase db push --include-all
```

## Шаг 3: Проверьте результат

Проверьте, что все таблицы созданы и данные загружены:

```sql
-- Проверка таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Проверка уникальных ограничений в event_participants
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'event_participants' 
AND indexname LIKE '%event%user%';
```

## Ожидаемый результат

После восстановления у вас должно быть:
- ✅ Все таблицы созданы
- ✅ Один уникальный индекс на (event_id, user_id) в event_participants
- ✅ Все данные загружены
- ✅ Работающее добавление участников в мероприятия

