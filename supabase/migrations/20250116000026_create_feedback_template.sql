-- Создание базового шаблона обратной связи

-- 1. Создаем шаблон обратной связи для типа "in_person_training" на основе существующего общего шаблона
INSERT INTO public.feedback_templates (id, name, description, event_type_id, is_default, created_at)
VALUES (
  gen_random_uuid(),
  'Обратная связь по очному мероприятию',
  'Стандартная форма обратной связи для очных мероприятий',
  'e6b6854b-37cc-4a6f-929c-446b64345b0a', -- ID типа "in_person_training"
  true,
  now()
)
ON CONFLICT DO NOTHING;

-- 2. Получаем ID созданного шаблона
DO $$
DECLARE
  template_id uuid;
BEGIN
  SELECT id INTO template_id 
  FROM public.feedback_templates 
  WHERE event_type_id = 'e6b6854b-37cc-4a6f-929c-446b64345b0a' 
  AND is_default = true 
  LIMIT 1;

  -- 3. Создаем вопросы для шаблона на основе существующего общего шаблона
  IF template_id IS NOT NULL THEN
    INSERT INTO public.feedback_questions (id, template_id, question_text, question_type, is_required, order_index, options, created_at)
    VALUES 
      (gen_random_uuid(), template_id, 'Оцените общее качество мероприятия (1-5)', 'rating', true, 1, '{"min": 1, "max": 5, "labels": ["1 - Плохо", "2 - Удовлетворительно", "3 - Хорошо", "4 - Очень хорошо", "5 - Отлично"]}', now()),
      (gen_random_uuid(), template_id, 'Оцените полезность полученной информации (1-5)', 'rating', true, 2, '{"min": 1, "max": 5, "labels": ["1 - Не полезно", "2 - Мало полезно", "3 - Полезно", "4 - Очень полезно", "5 - Невероятно полезно"]}', now()),
      (gen_random_uuid(), template_id, 'Оцените качество организации мероприятия (1-5)', 'rating', true, 3, '{"min": 1, "max": 5, "labels": ["1 - Плохо", "2 - Удовлетворительно", "3 - Хорошо", "4 - Очень хорошо", "5 - Отлично"]}', now()),
      (gen_random_uuid(), template_id, 'Оцените работу тренера/презентатора (1-5)', 'rating', true, 4, '{"min": 1, "max": 5, "labels": ["1 - Плохо", "2 - Удовлетворительно", "3 - Хорошо", "4 - Очень хорошо", "5 - Отлично"]}', now()),
      (gen_random_uuid(), template_id, 'Рекомендуете ли вы это мероприятие коллегам?', 'choice', true, 5, '{"choices": ["Да, определенно", "Да, скорее всего", "Затрудняюсь ответить", "Нет, скорее всего", "Нет, определенно"]}', now()),
      (gen_random_uuid(), template_id, 'Что вам понравилось больше всего?', 'text', false, 6, '{}', now()),
      (gen_random_uuid(), template_id, 'Что можно улучшить?', 'text', false, 7, '{}', now()),
      (gen_random_uuid(), template_id, 'Дополнительные комментарии', 'text', false, 8, '{}', now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 4. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';
