-- Добавление итогового теста "Управление территорией для развития АКБ"
-- Тест с открытыми вопросами для самостоятельных ответов сотрудников

DO $$
DECLARE
  akb_final_test_id UUID;
  question_id UUID;
  in_person_type_id UUID;
BEGIN
  -- Получаем ID типа мероприятия "Очный тренинг"
  SELECT id INTO in_person_type_id 
  FROM event_types 
  WHERE name = 'in_person_training' 
  LIMIT 1;
  
  IF in_person_type_id IS NULL THEN
    RAISE EXCEPTION 'Тип мероприятия "in_person_training" не найден';
  END IF;

  -- Создаем итоговый тест
  INSERT INTO tests (title, description, type, passing_score, time_limit, event_type_id, status)
  VALUES (
    'Итоговый тест "Управление территорией для развития АКБ"',
    'Проверка полученных знаний по управлению территорией и развитию АКБ после прохождения обучения. Ответы проверяются тренером вручную.',
    'final',
    70, -- проходной балл 70%
    60, -- 60 минут на выполнение (больше времени для развернутых ответов)
    in_person_type_id,
    'active'
  )
  RETURNING id INTO akb_final_test_id;

  RAISE NOTICE 'Создан итоговый тест с ID: %', akb_final_test_id;

  -- Вопрос 1: Анализ территории
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Опишите, как вы будете анализировать свою территорию для выявления новых возможностей развития АКБ. Какие критерии и методы используете?', 'text', 1, 10)
  RETURNING id INTO question_id;

  -- Вопрос 2: Планирование маршрута
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Составьте план маршрута на неделю для территории с 15 торговыми точками. Объясните принципы группировки ТТ и приоритизации визитов.', 'text', 2, 10)
  RETURNING id INTO question_id;

  -- Вопрос 3: Работа с возражениями
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Опишите алгоритм работы с возражением "У нас нет места для вашего товара". Приведите конкретные аргументы и техники убеждения.', 'text', 3, 10)
  RETURNING id INTO question_id;

  -- Вопрос 4: Развитие клиентской базы
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Как вы будете развивать клиентскую базу на своей территории? Опишите стратегию привлечения новых клиентов и удержания существующих.', 'text', 4, 10)
  RETURNING id INTO question_id;

  -- Вопрос 5: Анализ конкурентов
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Опишите, как вы будете анализировать конкурентную среду на своей территории. Какие данные собираете и как используете для повышения продаж?', 'text', 5, 10)
  RETURNING id INTO question_id;

  -- Вопрос 6: Работа с разными типами ТТ
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Опишите различия в подходе к работе с крупными сетевыми магазинами и небольшими торговыми точками. Какие стратегии применяете для каждого типа?', 'text', 6, 10)
  RETURNING id INTO question_id;

  -- Вопрос 7: Мотивация и стимулирование
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Как вы будете мотивировать торговых представителей на своей территории для достижения плановых показателей? Опишите систему стимулирования.', 'text', 7, 10)
  RETURNING id INTO question_id;

  -- Вопрос 8: Контроль и отчетность
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Опишите систему контроля и отчетности по территории. Какие KPI отслеживаете и как анализируете результаты?', 'text', 8, 10)
  RETURNING id INTO question_id;

  -- Вопрос 9: Решение проблем
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Опишите, как вы будете решать конфликтные ситуации с клиентами на территории. Приведите примеры и алгоритм действий.', 'text', 9, 10)
  RETURNING id INTO question_id;

  -- Вопрос 10: Стратегия развития
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_final_test_id, 'Разработайте стратегию развития территории на следующие 6 месяцев. Включите цели, задачи, методы достижения и ожидаемые результаты.', 'text', 10, 10)
  RETURNING id INTO question_id;

  RAISE NOTICE 'Итоговый тест "Управление территорией для развития АКБ" успешно создан с 10 открытыми вопросами';
  
END $$;
