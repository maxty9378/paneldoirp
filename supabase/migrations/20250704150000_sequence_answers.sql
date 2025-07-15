-- Создание таблицы для вариантов последовательности
CREATE TABLE test_sequence_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid REFERENCES test_questions(id) ON DELETE CASCADE,
    answer_order integer NOT NULL,
    answer_text text NOT NULL
); 