/*
  # Добавление тестовых данных для мероприятий

  1. Новые данные
    - Добавление типов мероприятий
    - Добавление тестовых мероприятий
  2. Безопасность
    - Проверка на существование данных перед вставкой
*/

-- Проверяем и добавляем типы мероприятий, если они еще не существуют
DO $$
BEGIN
  -- Проверяем, существует ли тип мероприятия 'online_training'
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'online_training') THEN
    INSERT INTO event_types (name, name_ru, description, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) 
    VALUES ('online_training', 'Онлайн-тренинг', 'Дистанционное обучение с интерактивными элементами', true, false, true, true, true);
  END IF;

  -- Проверяем, существует ли тип мероприятия 'webinar'
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'webinar') THEN
    INSERT INTO event_types (name, name_ru, description, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) 
    VALUES ('webinar', 'Вебинар', 'Онлайн-семинар с презентацией и обсуждением', true, false, false, false, true);
  END IF;

  -- Проверяем, существует ли тип мероприятия 'workshop'
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'workshop') THEN
    INSERT INTO event_types (name, name_ru, description, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) 
    VALUES ('workshop', 'Мастер-класс', 'Практическое занятие с отработкой навыков', false, true, false, true, true);
  END IF;

  -- Проверяем, существует ли тип мероприятия 'in_person_training'
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'in_person_training') THEN
    INSERT INTO event_types (name, name_ru, description, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) 
    VALUES ('in_person_training', 'Очный тренинг', 'Обучение в аудитории с тренером', false, true, true, true, true);
  END IF;

  -- Проверяем, существует ли тип мероприятия 'exam'
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'exam') THEN
    INSERT INTO event_types (name, name_ru, description, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) 
    VALUES ('exam', 'Экзамен', 'Проверка знаний и навыков', false, true, true, false, false);
  END IF;

  -- Проверяем, существует ли тип мероприятия 'conference'
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE name = 'conference') THEN
    INSERT INTO event_types (name, name_ru, description, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) 
    VALUES ('conference', 'Конференция', 'Крупное мероприятие с несколькими докладчиками', false, true, false, false, true);
  END IF;
END $$;

-- Добавляем тестовые мероприятия
DO $$
DECLARE
    admin_user_id uuid;
    training_type_id uuid;
    webinar_type_id uuid;
    workshop_type_id uuid;
    exam_type_id uuid;
BEGIN
    -- Получаем ID администратора
    SELECT id INTO admin_user_id FROM users WHERE role = 'administrator' LIMIT 1;
    
    -- Получаем ID типов мероприятий
    SELECT id INTO training_type_id FROM event_types WHERE name = 'online_training' LIMIT 1;
    SELECT id INTO webinar_type_id FROM event_types WHERE name = 'webinar' LIMIT 1;
    SELECT id INTO workshop_type_id FROM event_types WHERE name = 'workshop' LIMIT 1;
    SELECT id INTO exam_type_id FROM event_types WHERE name = 'exam' LIMIT 1;
    
    -- Проверяем, есть ли уже мероприятия в системе
    IF NOT EXISTS (SELECT 1 FROM events LIMIT 1) AND admin_user_id IS NOT NULL THEN
        -- Добавляем тестовые мероприятия
        INSERT INTO events (title, description, event_type_id, creator_id, start_date, end_date, location, meeting_link, points, status, max_participants) VALUES
        (
            'Продажи в розничной торговле - базовый курс',
            'Комплексное обучение основам продаж для новых сотрудников. Изучение техник продаж, работы с клиентами и увеличения конверсии.',
            training_type_id,
            admin_user_id,
            NOW() + INTERVAL '3 days',
            NOW() + INTERVAL '3 days' + INTERVAL '2 hours',
            NULL,
            'https://zoom.us/j/123456789',
            50,
            'published',
            25
        ),
        (
            'Работа с возражениями клиентов',
            'Практический тренинг по технике работы с возражениями. Разбор реальных кейсов и отработка навыков.',
            workshop_type_id,
            admin_user_id,
            NOW() + INTERVAL '5 days',
            NOW() + INTERVAL '5 days' + INTERVAL '3 hours',
            'Конференц-зал, офис Москва',
            NULL,
            75,
            'published',
            15
        ),
        (
            'Новые тренды в ритейле 2024',
            'Вебинар о современных тенденциях в розничной торговле, цифровизации и омниканальности.',
            webinar_type_id,
            admin_user_id,
            NOW() + INTERVAL '1 day',
            NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
            NULL,
            'https://zoom.us/j/987654321',
            25,
            'published',
            100
        ),
        (
            'Аттестация торговых представителей',
            'Ежегодная аттестация знаний и навыков торговых представителей.',
            exam_type_id,
            admin_user_id,
            NOW() + INTERVAL '10 days',
            NOW() + INTERVAL '10 days' + INTERVAL '2 hours',
            'Учебный центр SNS',
            NULL,
            0,
            'published',
            50
        ),
        (
            'Управление командой продаж',
            'Тренинг для супервайзеров по эффективному управлению командой и мотивации сотрудников.',
            training_type_id,
            admin_user_id,
            NOW() - INTERVAL '5 days',
            NOW() - INTERVAL '5 days' + INTERVAL '4 hours',
            NULL,
            'https://zoom.us/j/555666777',
            100,
            'completed',
            20
        ),
        (
            'Черновик: Планирование продаж на 2025',
            'Методология планирования продаж и постановки целей на следующий год.',
            workshop_type_id,
            admin_user_id,
            NOW() + INTERVAL '20 days',
            NOW() + INTERVAL '20 days' + INTERVAL '3 hours',
            'Офис SNS, переговорная 1',
            NULL,
            60,
            'draft',
            12
        );
    END IF;
END $$;