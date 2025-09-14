    -- Восстановление данных в базу данных SNS Panel
    -- Выполните этот скрипт после restore_structure.sql

    -- 1. Вставка типов мероприятий
    INSERT INTO event_types (id, name, description) VALUES 
    ('e6b6854b-37cc-4a6f-929c-446b64345b0a', 'in_person_training', 'Очный тренинг'),
    ('f7c6854b-37cc-4a6f-929c-446b64345b0b', 'online_training', 'Онлайн тренинг'),
    ('a8d6854b-37cc-4a6f-929c-446b64345b0c', 'webinar', 'Вебинар')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Вставка должностей
    INSERT INTO positions (id, name, description, created_at, updated_at, is_active, level, department, permissions) VALUES 
    ('17b75ea9-b552-43f1-a7b6-4d7d9a2a177b', 'Тренер СПП', 'Обучение и развитие сотрудников', '2025-07-01 13:47:02.002486+00', '2025-07-03 11:31:42.95514+00', true, 1, null, '[]'),
    ('2b7788d9-2ec5-4269-bdad-a64211a5282d', 'Директор филиала', 'Управление филиалом компании', '2025-07-01 13:47:02.002486+00', '2025-07-01 13:47:02.002486+00', true, 1, null, '[]'),
    ('4457b9e4-a3bb-466f-9bd9-3263b969a73f', 'Администратор системы', 'Администрирование портала обучения', '2025-07-01 13:47:02.002486+00', '2025-07-01 13:47:02.002486+00', true, 1, null, '[]'),
    ('4924539c-5ec3-425e-8a63-59092c6d4124', 'Супервайзер', 'Управление командой торговых представителей', '2025-07-01 13:47:02.002486+00', '2025-07-01 13:47:02.002486+00', true, 1, null, '[]'),
    ('89c3e15f-0ac7-4c98-904c-a00f96e88dc7', 'Торговый представитель', 'Работа с клиентами и продажи', '2025-07-01 13:47:02.002486+00', '2025-07-01 13:47:02.002486+00', true, 1, null, '[]'),
    ('934cbf75-a5bf-49be-96bf-1191acc274c0', 'Менеджер', 'Управление командой', '2025-07-02 09:48:23.116533+00', '2025-07-02 09:48:23.116533+00', true, 7, 'Management', '[]'),
    ('bd4c27e3-a49f-433f-9561-14e57a593d5b', 'Сотрудник', 'Базовая должность', '2025-07-02 09:48:23.116533+00', '2025-07-02 09:48:23.116533+00', true, 1, 'General', '[]')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Вставка территорий
    INSERT INTO territories (id, name, description, created_at, updated_at, is_active) VALUES 
    ('33ed449d-bb4e-4fda-a415-3d8534487d9c', 'Московский регион', 'Москва и Московская область', '2025-07-01 13:47:02.002486+00', '2025-07-01 13:47:02.002486+00', true),
    ('e591aaf8-319e-4463-b12f-266758350f87', 'Санкт-Петербург', 'Санкт-Петербург и Ленинградская область', '2025-07-01 13:47:02.002486+00', '2025-07-01 13:47:02.002486+00', true),
    ('3297d103-2273-4230-a570-40318659eb3a', 'Урал', 'Уральский федеральный округ', '2025-07-01 13:47:02.002486+00', '2025-07-01 13:47:02.002486+00', true),
    ('f0f81fcf-624f-40af-9c55-85ca33ba6b56', 'Сибирь', 'Сибирский федеральный округ', '2025-07-01 13:47:02.002486+00', '2025-07-01 13:47:02.002486+00', true)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Вставка пользователей
    INSERT INTO users (id, email, sap_number, full_name, phone, avatar_url, role, subdivision, branch_subrole, branch_id, status, work_experience_days, last_sign_in_at, created_at, updated_at, is_active, department, is_leaving, position_id, territory_id, last_activity_at, password_changed_at, failed_login_attempts, locked_until, preferences, notes) VALUES 
    ('345f0a3d-4da1-4ac1-8f2d-dd4d7ae9e4e4', 'Maksim.Kadochkin@sns.ru', null, 'Кадочкин Максим', null, null, 'trainer', 'management_company', null, null, 'active', 0, null, '2025-07-03 11:33:29.293768+00', '2025-07-03 13:32:45.473624+00', true, 'management_company', false, '17b75ea9-b552-43f1-a7b6-4d7d9a2a177b', '33ed449d-bb4e-4fda-a415-3d8534487d9c', null, '2025-07-03 11:33:29.368+00', 0, null, '{}', null),
    ('89bd7958-b424-4d08-889c-bd870d76a784', 'sidorov.sidor@sns.ru', '54321', 'Сидоров Сидор Сидорович', '+79005554433', null, 'employee', 'management_company', null, null, 'active', 1095, null, '2025-07-03 13:48:53.76937+00', '2025-07-03 14:26:05.656003+00', true, 'management_company', false, '89c3e15f-0ac7-4c98-904c-a00f96e88dc7', '33ed449d-bb4e-4fda-a415-3d8534487d9c', null, '2025-07-03 13:48:53.817+00', 0, null, '{}', null),
    ('975e216b-56af-4025-871c-af297b67bfca', 'doirp@sns.ru', '7777777', 'Кадочкин Максим', null, null, 'administrator', 'management_company', null, null, 'active', 365, null, '2025-07-16 11:20:03.209+00', '2025-07-17 12:51:10.582437+00', true, 'management_company', false, '4457b9e4-a3bb-466f-9bd9-3263b969a73f', 'f0f81fcf-624f-40af-9c55-85ca33ba6b56', null, null, 0, null, '{}', null),
    ('de17541d-633e-4282-ad13-2147b8f5eaa0', 'ivan.ivanov@sns.ru', '12345', 'Иванов Иван Иванович', '+79001234567', null, 'employee', 'management_company', null, null, 'active', 365, null, '2025-07-03 11:54:53.26369+00', '2025-07-03 14:02:47.09746+00', true, 'management_company', false, '89c3e15f-0ac7-4c98-904c-a00f96e88dc7', 'e591aaf8-319e-4463-b12f-266758350f87', null, '2025-07-03 11:54:53.34+00', 0, null, '{}', null),
    ('e1c41914-7bf7-45cc-811f-8b9e44950f4f', 'petr.petrov@sns.ru', '67890', 'Петров Петр Петрович', '+79009876543', null, 'employee', 'management_company', null, null, 'active', 730, null, '2025-07-03 13:48:54.469418+00', '2025-07-03 14:04:56.898136+00', true, 'management_company', false, '89c3e15f-0ac7-4c98-904c-a00f96e88dc7', '3297d103-2273-4230-a570-40318659eb3a', null, '2025-07-03 13:48:54.512+00', 0, null, '{}', null)
    ON CONFLICT (id) DO NOTHING;

    -- 5. Вставка тестов
    INSERT INTO tests (id, title, description, type, passing_score, time_limit, event_type_id, status, created_at, updated_at) VALUES 
    ('3b1f04e5-d35c-42eb-837d-16515cd8b4f9', 'Итоговый тест "Технология эффективных продаж"', 'Проверка знаний после прохождения обучения', 'final', 0, 0, 'e6b6854b-37cc-4a6f-929c-446b64345b0a', 'active', '2025-07-03 16:40:20.59122+00', '2025-07-14 10:33:04.447787+00'),
    ('bfd93506-374c-416f-9ad4-118baa92da09', 'Годовой тест "Технология эффективных продаж"', 'Проверка знаний спустя 3 месяца после обучения', 'annual', 75, 45, 'e6b6854b-37cc-4a6f-929c-446b64345b0a', 'active', '2025-07-03 16:40:20.59122+00', '2025-07-03 16:40:20.59122+00'),
    ('c846511a-6518-4dd4-b7ee-b6a6cdbed519', 'Входной тест "Технология эффективных продаж"', 'Проверка базовых знаний перед началом обучения', 'entry', 0, 0, 'e6b6854b-37cc-4a6f-929c-446b64345b0a', 'active', '2025-07-03 16:40:20.59122+00', '2025-07-14 14:19:09.332515+00')
    ON CONFLICT (id) DO NOTHING;

    SELECT 'Данные восстановлены успешно' as status;


