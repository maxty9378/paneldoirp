/*
  # Add test data for events and event types

  1. Event Types
    - Insert event types with ON CONFLICT handling
    - Includes online training, webinars, workshops, exams, etc.

  2. Sample Events
    - Creates test events with different statuses
    - Links to event types and admin user
    - Includes both upcoming and completed events

  3. Safety
    - Uses ON CONFLICT DO NOTHING to prevent duplicates
    - Checks for admin user existence before creating events
*/

-- Insert event types with conflict handling
INSERT INTO event_types (name, name_ru, description, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) VALUES
('online_training', 'Онлайн-тренинг', 'Дистанционное обучение с интерактивными элементами', true, false, true, true, true),
('webinar', 'Вебинар', 'Онлайн-семинар с презентацией и обсуждением', true, false, false, false, true),
('workshop', 'Мастер-класс', 'Практическое занятие с отработкой навыков', false, true, false, true, true),
('in_person_training', 'Очный тренинг', 'Обучение в аудитории с тренером', false, true, true, true, true),
('exam', 'Экзамен', 'Проверка знаний и навыков', false, true, true, false, false),
('conference', 'Конференция', 'Крупное мероприятие с несколькими докладчиками', false, true, false, false, true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample events
DO $$
DECLARE
    admin_user_id uuid;
    training_type_id uuid;
    webinar_type_id uuid;
    workshop_type_id uuid;
    exam_type_id uuid;
    in_person_type_id uuid;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM users WHERE role = 'administrator' LIMIT 1;
    
    -- Get event type IDs
    SELECT id INTO training_type_id FROM event_types WHERE name = 'online_training' LIMIT 1;
    SELECT id INTO webinar_type_id FROM event_types WHERE name = 'webinar' LIMIT 1;
    SELECT id INTO workshop_type_id FROM event_types WHERE name = 'workshop' LIMIT 1;
    SELECT id INTO exam_type_id FROM event_types WHERE name = 'exam' LIMIT 1;
    SELECT id INTO in_person_type_id FROM event_types WHERE name = 'in_person_training' LIMIT 1;
    
    -- Only insert if admin user exists and we haven't already inserted events
    IF admin_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM events WHERE title = 'Продажи в розничной торговле - базовый курс') THEN
        -- Insert sample events
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
            in_person_type_id,
            admin_user_id,
            NOW() - INTERVAL '5 days',
            NOW() - INTERVAL '5 days' + INTERVAL '4 hours',
            'Конференц-зал SNS',
            NULL,
            100,
            'completed',
            20
        ),
        (
            'Планирование продаж на 2025',
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
        ),
        (
            'Цифровые инструменты продаж',
            'Обучение работе с CRM системами и цифровыми платформами для увеличения эффективности продаж.',
            training_type_id,
            admin_user_id,
            NOW() + INTERVAL '7 days',
            NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
            NULL,
            'https://zoom.us/j/111222333',
            40,
            'published',
            30
        ),
        (
            'Мерчандайзинг и выкладка товара',
            'Практические навыки правильной выкладки товара и создания привлекательных витрин.',
            workshop_type_id,
            admin_user_id,
            NOW() + INTERVAL '12 days',
            NOW() + INTERVAL '12 days' + INTERVAL '4 hours',
            'Учебный магазин SNS',
            NULL,
            65,
            'published',
            18
        );
    END IF;
END $$;