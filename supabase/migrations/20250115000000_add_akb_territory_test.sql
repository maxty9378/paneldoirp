-- Добавление входного теста "Управление территорией для развития АКБ"
-- Миграция для создания теста с 10 вопросами по управлению территорией

DO $$
DECLARE
  akb_test_id UUID;
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

  -- Создаем тест
  INSERT INTO tests (title, description, type, passing_score, time_limit, event_type_id, status)
  VALUES (
    'Входной тест "Управление территорией для развития АКБ"',
    'Проверка базовых знаний по управлению территорией и развитию АКБ перед началом обучения',
    'entry',
    70, -- проходной балл 70%
    30, -- 30 минут на выполнение
    in_person_type_id,
    'active'
  )
  RETURNING id INTO akb_test_id;

  RAISE NOTICE 'Создан тест с ID: %', akb_test_id;

  -- Вопрос 1: Какая самая частая причина возникновения возражений при продаже?
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Какая самая частая причина возникновения возражений при продаже?', 'single_choice', 1, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, 'В торговой точке нет денег на товар ТП', FALSE, 1),
    (question_id, 'У ЛПР не сформировано доверие к предложению ТП', TRUE, 2),
    (question_id, 'В торговой точке нет места для товара ТП', FALSE, 3),
    (question_id, 'Товар ТП слишком дорогой для ЛПР торговой точки', FALSE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 2: Какие преимущества дает ТП соблюдение технологии продаж «8 этапов визита в ТТ»?
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Какие преимущества дает ТП соблюдение технологии продаж «8 этапов визита в ТТ»?', 'single_choice', 2, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, 'Технология продаж помогает ТП подключать новые торговые точки', FALSE, 1),
    (question_id, 'Технология – это самый простой способ достижения результата продаж', TRUE, 2),
    (question_id, 'Соблюдение технологии продаж нужно для обучения новых ТП', FALSE, 3),
    (question_id, 'По соблюдению технологии продаж руководство оценивает ТП', FALSE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 3: Расчет прибыли от продажи E-ON
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Рассчитайте прибыль в рублях, которую получит клиент от продажи одной банки при закупке партии E-ON по акции «10+6». При условии: 1) входная цена без акции составляла 65 р.; 2) на полке E-ON будет продаваться по 85 р.', 'single_choice', 3, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, '37,45 р.', FALSE, 1),
    (question_id, '24,38 р.', FALSE, 2),
    (question_id, '44,37 р.', TRUE, 3),
    (question_id, '47 р.', FALSE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 4: Проблемы при отсутствии анализа итогов визита
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Какие проблемы начинаются у ТП, когда он перестает анализировать итоги визита в ТТ, используя маршрутный лист?', 'single_choice', 4, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, 'ТП теряет продажи дня и бонусы в конце месяца', TRUE, 1),
    (question_id, 'ТП теряет лояльность клиента', FALSE, 2),
    (question_id, 'ТП забывает о своих договоренностях с ТТ', FALSE, 3),
    (question_id, 'ТП трудно вспомнить свои продажи на вечернем разборе', FALSE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 5: Правила составления маршрута
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Какими правилами составления маршрута нужно пользоваться с целью сокращения времени работы?', 'single_choice', 5, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, '"Закольцованности" и "Правой руки"', FALSE, 1),
    (question_id, '"Приоритетности ТТ"', FALSE, 2),
    (question_id, '"Кратчайшего расстояния между ТТ"', FALSE, 3),
    (question_id, 'Все варианты верные', TRUE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 6: Тактика планирования в начале месяца
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Какая тактика планирования в начале месяца позволит выполнить план ТП на 100% даже при наличии каких-либо форс-мажоров?', 'single_choice', 6, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, 'Разделить план месяца на 4 периода, и увеличить продажи на 25% в последнюю неделю месяца', FALSE, 1),
    (question_id, 'Разделить план месяца на 4 недели и распределить недельный объем продаж по ТТ маршрута', FALSE, 2),
    (question_id, 'Разделить план месяца на 4 недели и увеличить объем продаж на 20% в первые две недели месяца', TRUE, 3),
    (question_id, 'Разделить план месяца на количество рабочих дней и распределить полученную норму дневных продаж по ТТ', FALSE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 7: Конкуренция с сетевым магазином
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'ЛПР высоко проходимой ТТ говорит, что у него рядом работает сетевой магазин, где Fresh Bar дешевле. Какие условия ТП может предложить ЛПР для успешной конкуренции с сетевым магазином?', 'single_choice', 7, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, 'Предложить ЛПР работать с минимальным объемом по вкусам, которых нет у сетевого магазина', FALSE, 1),
    (question_id, 'Предложить ЛПР размещение ДМП и участие в полочных программах СНС', TRUE, 2),
    (question_id, 'Предложить ЛПР снизить наценку на FB за счет использования беспроцентной рассрочки от СНС', FALSE, 3),
    (question_id, 'Предложить действующую акцию по другим продуктам и пообещать скидку в будущем', FALSE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 8: Работа с высоко объемными ТТ
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Какая тактика наиболее эффективна в работе с высоко объемными ТТ, которые находятся в проходимом месте, берут все товары СНС и имеют покупателей с хорошим доходом?', 'single_choice', 8, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, 'Предлагать премиальную продукцию, размещение ДМП и холодильного оборудования', TRUE, 1),
    (question_id, 'Предлагать самые ходовые виды продукции и самые выгодные акции', FALSE, 2),
    (question_id, 'Ставить в торговую точку только то, что просит ЛПР, для сохранения лояльности', FALSE, 3),
    (question_id, 'Выявить трудности, которые возникают у клиента в работе с другими поставщиками, и не совершать их ошибок', FALSE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 9: Работа с низко объемными ТТ
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Какая тактика наиболее эффективна в работе с низко объемными ТТ, которые имеют низкую проходимость, делают минимальные заказы и обслуживают покупателей с небольшим доходом?', 'single_choice', 9, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, 'Предлагать премиальную продукцию, размещение ДМП и полочных программ', FALSE, 1),
    (question_id, 'Ставить в торговую точку только то, что просит ЛПР, для сохранения лояльности', FALSE, 2),
    (question_id, 'Предлагать самые ходовые виды продукции и самые выгодные акции', TRUE, 3),
    (question_id, 'Выявить трудности, которые возникают у клиента в работе с другими поставщиками, и не совершать их ошибок', FALSE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  -- Вопрос 10: Усиление этапа при возражении "товар не продается"
  INSERT INTO test_questions (test_id, question, question_type, "order", points)
  VALUES (akb_test_id, 'Какой этап визита нужно усилить в работе ТП, когда он часто слышит возражение: «Ваш товар не продается»?', 'single_choice', 10, 1)
  RETURNING id INTO question_id;

  INSERT INTO test_answers (question_id, text, is_correct, "order")
  VALUES
    (question_id, 'Начало встречи и установление контакта', FALSE, 1),
    (question_id, 'Презентация продукта', FALSE, 2),
    (question_id, 'Отработка возражений', FALSE, 3),
    (question_id, 'Мерчандайзинг', TRUE, 4),
    (question_id, 'Затрудняюсь ответить', FALSE, 5);

  RAISE NOTICE 'Тест "Управление территорией для развития АКБ" успешно создан с 10 вопросами';
  
END $$;
