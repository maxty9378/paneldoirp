-- Добавление роли 'expert' в enum user_role_enum
-- Выполните этот скрипт в Supabase Dashboard SQL Editor

-- Этап 1: Добавляем роль 'expert' в существующий enum
ALTER TYPE user_role_enum ADD VALUE 'expert';

-- Коммитим изменения
COMMIT;

-- Этап 2: Проверяем, что роль добавлена (выполните отдельно после коммита)
-- SELECT unnest(enum_range(NULL::user_role_enum)) as available_roles;
