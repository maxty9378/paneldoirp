-- Исправление RLS политик для таблиц тестирования
-- Проблема: RLS включен для таблиц тестирования, но отключен для основных таблиц
-- Это создает конфликт в политиках, которые ссылаются на таблицу users

-- Отключаем RLS для всех таблиц тестирования для консистентности
ALTER TABLE tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_answers DISABLE ROW LEVEL SECURITY;

-- Удаляем все существующие политики для таблиц тестирования
DROP POLICY IF EXISTS "Users can view active tests" ON tests;
DROP POLICY IF EXISTS "Admins can manage tests" ON tests;
DROP POLICY IF EXISTS "Users can view test questions" ON test_questions;
DROP POLICY IF EXISTS "Admins can manage test questions" ON test_questions;
DROP POLICY IF EXISTS "Users can view test answers" ON test_answers;
DROP POLICY IF EXISTS "Admins can manage test answers" ON test_answers;
DROP POLICY IF EXISTS "Users can view their own test attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can create their own test attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can update their own test attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can view their own test answers" ON user_test_answers;
DROP POLICY IF EXISTS "Users can create their own test answers" ON user_test_answers;
DROP POLICY IF EXISTS "Users can view their tests" ON tests;
DROP POLICY IF EXISTS "Users can view their relevant tests" ON tests;

-- Добавляем комментарии о том, что RLS отключен
COMMENT ON TABLE tests IS 'RLS отключен для совместимости с отключенным RLS в основных таблицах';
COMMENT ON TABLE test_questions IS 'RLS отключен для совместимости с отключенным RLS в основных таблицах';
COMMENT ON TABLE test_answers IS 'RLS отключен для совместимости с отключенным RLS в основных таблицах';
COMMENT ON TABLE user_test_attempts IS 'RLS отключен для совместимости с отключенным RLS в основных таблицах';
COMMENT ON TABLE user_test_answers IS 'RLS отключен для совместимости с отключенным RLS в основных таблицах';
