/*
  # Создание администратора портала

  1. Новые записи
    - Добавление администратора в таблицу `users`
    - Email: doirp@sns.ru
    - Роль: administrator
    - Статус: active

  2. Безопасность
    - Пользователь создается с полными правами администратора
    - Готов к использованию после создания в Supabase Auth

  3. Примечания
    - Пароль нужно будет установить через Supabase Auth Dashboard
    - Или использовать функцию сброса пароля
*/

-- Вставка администратора в таблицу users
INSERT INTO users (
  id,
  email,
  full_name,
  position,
  role,
  subdivision,
  status,
  work_experience_days,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'doirp@sns.ru',
  'Администратор портала',
  'Администратор системы',
  'administrator',
  'management_company',
  'active',
  0,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  position = EXCLUDED.position,
  role = EXCLUDED.role,
  subdivision = EXCLUDED.subdivision,
  status = EXCLUDED.status,
  updated_at = now();

-- Добавление нескольких тестовых филиалов
INSERT INTO branches (name, code, address) VALUES
('Центральный офис', 'HQ', 'г. Москва, ул. Тверская, д. 1'),
('Филиал Санкт-Петербург', 'SPB', 'г. Санкт-Петербург, Невский пр., д. 50'),
('Филиал Екатеринбург', 'EKB', 'г. Екатеринбург, ул. Ленина, д. 25'),
('Филиал Новосибирск', 'NSK', 'г. Новосибирск, ул. Красный пр., д. 100')
ON CONFLICT (code) DO NOTHING;

-- Добавление нескольких тестовых пользователей
INSERT INTO users (
  email,
  sap_number,
  full_name,
  position,
  role,
  subdivision,
  branch_subrole,
  status,
  work_experience_days
) VALUES
('trainer1@sns.ru', '100001', 'Иванов Иван Иванович', 'Старший тренер', 'trainer', 'management_company', NULL, 'active', 365),
('trainer2@sns.ru', '100002', 'Петрова Анна Сергеевна', 'Тренер-методист', 'trainer', 'management_company', NULL, 'active', 730),
('employee1@sns.ru', '200001', 'Сидоров Петр Александрович', 'Менеджер по продажам', 'employee', 'branches', 'sales_representative', 'active', 180),
('employee2@sns.ru', '200002', 'Козлова Мария Викторовна', 'Супервайзер', 'employee', 'branches', 'supervisor', 'active', 450)
ON CONFLICT (email) DO NOTHING;

-- Обновление branch_id для пользователей филиалов
UPDATE users 
SET branch_id = (SELECT id FROM branches WHERE code = 'SPB' LIMIT 1)
WHERE email IN ('employee1@sns.ru', 'employee2@sns.ru') AND subdivision = 'branches';