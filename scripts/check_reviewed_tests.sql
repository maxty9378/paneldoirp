-- Проверяем есть ли проверенные тесты в базе данных

-- 1. Проверяем таблицу test_answer_reviews
SELECT 
  'test_answer_reviews' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT attempt_id) as unique_attempts,
  COUNT(DISTINCT reviewer_id) as unique_reviewers
FROM test_answer_reviews;

-- 2. Проверяем user_test_attempts с полями проверки
SELECT 
  'user_test_attempts' as table_name,
  COUNT(*) as total_attempts,
  COUNT(reviewed_by) as reviewed_attempts,
  COUNT(CASE WHEN reviewed_by IS NOT NULL THEN 1 END) as has_reviewer,
  COUNT(CASE WHEN reviewed_at IS NOT NULL THEN 1 END) as has_review_date
FROM user_test_attempts;

-- 3. Детальная информация о проверенных тестах
SELECT 
  uta.id as attempt_id,
  u.full_name as participant_name,
  t.title as test_title,
  uta.status,
  uta.score,
  uta.passed,
  uta.reviewed_by,
  uta.reviewed_at,
  COUNT(tar.id) as review_records_count
FROM user_test_attempts uta
LEFT JOIN users u ON u.id = uta.user_id
LEFT JOIN tests t ON t.id = uta.test_id
LEFT JOIN test_answer_reviews tar ON tar.attempt_id = uta.id
WHERE uta.reviewed_by IS NOT NULL OR tar.id IS NOT NULL
GROUP BY uta.id, u.full_name, t.title, uta.status, uta.score, uta.passed, uta.reviewed_by, uta.reviewed_at
ORDER BY uta.reviewed_at DESC NULLS LAST
LIMIT 10;

-- 4. Статистика по типам тестов
SELECT 
  t.type as test_type,
  COUNT(uta.id) as total_attempts,
  COUNT(CASE WHEN uta.reviewed_by IS NOT NULL THEN 1 END) as reviewed_attempts,
  ROUND(
    COUNT(CASE WHEN uta.reviewed_by IS NOT NULL THEN 1 END) * 100.0 / COUNT(uta.id), 
    2
  ) as review_percentage
FROM user_test_attempts uta
JOIN tests t ON t.id = uta.test_id
GROUP BY t.type
ORDER BY total_attempts DESC;
