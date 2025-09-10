-- Добавляем колонку order для управления последовательностью вопросов
ALTER TABLE test_questions 
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Создаем индекс для быстрой сортировки
CREATE INDEX IF NOT EXISTS idx_test_questions_order 
ON test_questions(test_id, "order", id);

-- Обновляем существующие записи, устанавливая order равным row_number для сохранения текущего порядка
UPDATE test_questions 
SET "order" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
  FROM test_questions
) as subquery
WHERE test_questions.id = subquery.id 
  AND (test_questions."order" IS NULL OR test_questions."order" = 0);

-- Комментарий к колонке
COMMENT ON COLUMN test_questions."order" IS 'Порядок отображения вопроса в тесте (меньше = выше)';
