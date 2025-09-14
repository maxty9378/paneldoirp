-- Создание мероприятия "Управление территорией для развития АКБ"
-- Выполните этот скрипт перед назначением тестов

DO $$
DECLARE
  v_event_id UUID;
  in_person_type_id UUID;
  trainer_id UUID;
BEGIN
  -- Получаем ID типа мероприятия "Очный тренинг"
  SELECT id INTO in_person_type_id 
  FROM event_types 
  WHERE name = 'in_person_training' 
  LIMIT 1;
  
  IF in_person_type_id IS NULL THEN
    RAISE EXCEPTION 'Тип мероприятия "in_person_training" не найден. Сначала выполните complete_restore.sql';
  END IF;

  -- Получаем ID тренера (первого пользователя с ролью trainer)
  SELECT id INTO trainer_id 
  FROM users 
  WHERE role = 'trainer' 
  AND is_active = true
  LIMIT 1;
  
  IF trainer_id IS NULL THEN
    RAISE EXCEPTION 'Тренер не найден. Сначала выполните restore_data.sql';
  END IF;

  -- Создаем мероприятие
  INSERT INTO events (title, description, start_date, end_date, event_type_id, creator_id, status)
  VALUES (
    'Управление территорией для развития АКБ',
    'Обучение торговых представителей и супервайзеров по управлению территорией и развитию активных клиентских баз',
    '2025-01-20 09:00:00+00',
    '2025-01-20 18:00:00+00',
    in_person_type_id,
    trainer_id,
    'planned'
  )
  RETURNING id INTO v_event_id;

  RAISE NOTICE 'Создано мероприятие "Управление территорией для развития АКБ" с ID: %', v_event_id;

  -- Добавляем участников (всех активных пользователей с ролью employee)
  INSERT INTO event_participants (event_id, user_id, attended)
  SELECT 
    v_event_id,
    u.id,
    false
  FROM users u
  WHERE u.role = 'employee' 
  AND u.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM event_participants ep2 
    WHERE ep2.event_id = v_event_id AND ep2.user_id = u.id
  );

  RAISE NOTICE 'Добавлены участники мероприятия';

  -- Проверим результат
  SELECT 
    e.id,
    e.title,
    e.start_date,
    e.status,
    COUNT(ep.id) as participants_count
  FROM events e
  LEFT JOIN event_participants ep ON ep.event_id = e.id
  WHERE e.id = v_event_id
  GROUP BY e.id, e.title, e.start_date, e.status;

END $$;
