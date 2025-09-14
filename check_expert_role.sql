-- Проверка добавления роли 'expert' в enum user_role_enum
-- Выполните этот скрипт после add_expert_role_to_enum.sql

-- Проверяем, что роль добавлена
SELECT unnest(enum_range(NULL::user_role_enum)) as available_roles;
