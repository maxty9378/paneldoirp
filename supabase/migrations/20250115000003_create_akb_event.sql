-- Создание мероприятия "Управление территорией для развития АКБ" и функции автоматического назначения тестов

DO $$
DECLARE
  admin_id UUID;
  in_person_type_id UUID;
  akb_event_id UUID;
BEGIN
  -- Получаем ID администратора
  SELECT id INTO admin_id FROM users WHERE email = 'doirp@sns.ru' LIMIT 1;
  
  -- Получаем ID типа мероприятия "Очный тренинг"
  SELECT id INTO in_person_type_id FROM event_types WHERE name = 'in_person_training' LIMIT 1;
  
  IF admin_id IS NOT NULL AND in_person_type_id IS NOT NULL THEN
    -- Создаем мероприятие "Управление территорией для развития АКБ"
    INSERT INTO events (
      title, 
      description, 
      event_type_id, 
      creator_id, 
      start_date, 
      end_date, 
      status, 
      points, 
      location,
      max_participants,
      files
    )
    VALUES (
      'Управление территорией для развития АКБ',
      'Комплексное обучение управлению территорией и развитию агентской клиентской базы для торговых представителей',
      in_person_type_id,
      admin_id,
      NOW() + INTERVAL '7 days',
      NOW() + INTERVAL '7 days 8 hours',
      'published',
      100,
      'Офис СНС, Москва',
      25,
      '[]'::jsonb
    )
    RETURNING id INTO akb_event_id;
    
    RAISE NOTICE 'Создано мероприятие "Управление территорией для развития АКБ" с ID: %', akb_event_id;
  ELSE
    RAISE NOTICE 'Не удалось создать мероприятие: admin_id=%, in_person_type_id=%', admin_id, in_person_type_id;
  END IF;
END $$;

-- Создаем функцию для автоматического назначения тестов для очных тренингов по АКБ
CREATE OR REPLACE FUNCTION assign_tests_for_akb_training()
RETURNS trigger AS $$
DECLARE
    training_type_id UUID;
    is_akb_training BOOLEAN;
    entry_test_id UUID;
    final_test_id UUID;
    annual_test_id UUID;
BEGIN
    -- Проверяем, является ли это мероприятие очным тренингом
    SELECT id INTO training_type_id
    FROM event_types
    WHERE name = 'in_person_training'
    LIMIT 1;

    -- Проверяем, это "Управление территорией для развития АКБ"
    is_akb_training := NEW.title ILIKE '%Управление территорией для развития АКБ%';
    
    -- Если это не очный тренинг или не курс по АКБ, выходим
    IF NEW.event_type_id != training_type_id OR NOT is_akb_training THEN
        RETURN NEW;
    END IF;

    -- Находим ID тестов для очного тренинга
    SELECT id INTO entry_test_id
    FROM tests
    WHERE event_type_id = training_type_id
      AND type = 'entry'
      AND title ILIKE '%Управление территорией для развития АКБ%'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO final_test_id
    FROM tests
    WHERE event_type_id = training_type_id
      AND type = 'final'
      AND title ILIKE '%Управление территорией для развития АКБ%'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO annual_test_id
    FROM tests
    WHERE event_type_id = training_type_id
      AND type = 'annual'
      AND title ILIKE '%Управление территорией для развития АКБ%'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Логируем назначение тестов
    INSERT INTO admin_logs (
        action,
        resource_type,
        resource_id,
        new_values,
        success
    ) VALUES (
        'auto_assign_akb_tests',
        'events',
        NEW.id,
        jsonb_build_object(
            'event_id', NEW.id,
            'event_title', NEW.title,
            'entry_test_id', entry_test_id,
            'final_test_id', final_test_id,
            'annual_test_id', annual_test_id
        ),
        TRUE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического назначения тестов АКБ
CREATE OR REPLACE TRIGGER trigger_assign_tests_for_akb_training
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION assign_tests_for_akb_training();

-- Создаем функцию для автоматического назначения тестов участникам АКБ тренинга
CREATE OR REPLACE FUNCTION assign_akb_tests_to_participants()
RETURNS trigger AS $$
DECLARE
    event_type_id UUID;
    is_akb_training BOOLEAN;
    event_title TEXT;
    user_full_name TEXT;
    entry_test_id UUID;
    final_test_id UUID;
    annual_test_id UUID;
    new_attempt_id UUID;
BEGIN
    -- Получаем информацию о мероприятии и его типе
    SELECT 
        e.event_type_id, 
        et.name = 'in_person_training',
        e.title,
        u.full_name INTO 
        event_type_id, 
        is_akb_training, 
        event_title,
        user_full_name
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    LEFT JOIN users u ON u.id = NEW.user_id
    WHERE e.id = NEW.event_id;
    
    -- Проверяем, это очный тренинг и это тренинг "Управление территорией для развития АКБ"
    IF NOT (is_akb_training AND event_title ILIKE '%Управление территорией для развития АКБ%') THEN
        RETURN NEW;
    END IF;
    
    -- Находим тесты для АКБ тренинга
    SELECT id INTO entry_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'entry'
    AND title ILIKE '%Управление территорией для развития АКБ%'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO final_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'final'
    AND title ILIKE '%Управление территорией для развития АКБ%'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO annual_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'annual'
    AND title ILIKE '%Управление территорией для развития АКБ%'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Создаем тестовые попытки для пользователя
    IF NEW.attended THEN
        -- Входной тест
        IF entry_test_id IS NOT NULL THEN
            INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
            VALUES (NEW.user_id, entry_test_id, NEW.event_id, 'in_progress')
            RETURNING id INTO new_attempt_id;
            
            RAISE NOTICE 'Назначен входной тест АКБ пользователю % для мероприятия %', user_full_name, event_title;
        END IF;
        
        -- Итоговый тест (назначается после прохождения входного)
        IF final_test_id IS NOT NULL THEN
            INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
            VALUES (NEW.user_id, final_test_id, NEW.event_id, 'pending')
            RETURNING id INTO new_attempt_id;
            
            RAISE NOTICE 'Назначен итоговый тест АКБ пользователю % для мероприятия %', user_full_name, event_title;
        END IF;
        
        -- Годовой тест (назначается через 3 месяца)
        IF annual_test_id IS NOT NULL THEN
            INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
            VALUES (NEW.user_id, annual_test_id, NEW.event_id, 'pending')
            RETURNING id INTO new_attempt_id;
            
            RAISE NOTICE 'Назначен годовой тест АКБ пользователю % для мероприятия %', user_full_name, event_title;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического назначения тестов участникам
CREATE OR REPLACE TRIGGER trigger_assign_akb_tests_to_participants
AFTER INSERT ON event_participants
FOR EACH ROW
EXECUTE FUNCTION assign_akb_tests_to_participants();
