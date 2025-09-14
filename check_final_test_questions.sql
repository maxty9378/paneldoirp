-- =====================================================
-- ПРОВЕРКА ВОПРОСОВ В ИТОГОВОМ ТЕСТЕ
-- =====================================================
-- Этот скрипт проверяет, есть ли в итоговом тесте открытые вопросы

-- 1. Проверяем все тесты типа 'final' и их вопросы
SELECT 
    'Итоговые тесты и их вопросы' as check_type,
    t.id as test_id,
    t.title as test_title,
    tq.id as question_id,
    tq.question_type,
    tq.question,
    tq.points
FROM tests t
LEFT JOIN test_questions tq ON t.id = tq.test_id
WHERE t.type = 'final'
    AND t.status = 'active'
ORDER BY t.title, tq.id;

-- 2. Подсчитываем количество вопросов по типам для итоговых тестов
SELECT 
    'Статистика вопросов в итоговых тестах' as check_type,
    t.id as test_id,
    t.title as test_title,
    COUNT(*) as total_questions,
    COUNT(CASE WHEN tq.question_type = 'text' THEN 1 END) as text_questions,
    COUNT(CASE WHEN tq.question_type = 'single_choice' THEN 1 END) as single_choice_questions,
    COUNT(CASE WHEN tq.question_type = 'multiple_choice' THEN 1 END) as multiple_choice_questions,
    COUNT(CASE WHEN tq.question_type = 'sequence' THEN 1 END) as sequence_questions
FROM tests t
LEFT JOIN test_questions tq ON t.id = tq.test_id
WHERE t.type = 'final'
    AND t.status = 'active'
GROUP BY t.id, t.title
ORDER BY t.title;

-- 3. Проверяем попытки итогового теста с баллом 0
SELECT 
    'Попытки итогового теста с баллом 0' as check_type,
    uta.id as attempt_id,
    uta.status,
    uta.score,
    uta.created_at,
    t.title as test_title,
    u.full_name as user_name,
    COUNT(CASE WHEN tq.question_type = 'text' THEN 1 END) as text_questions_count
FROM user_test_attempts uta
JOIN tests t ON uta.test_id = t.id
JOIN users u ON uta.user_id = u.id
LEFT JOIN test_questions tq ON t.id = tq.test_id
WHERE t.type = 'final'
    AND uta.score = 0
    AND uta.status = 'completed'
GROUP BY uta.id, uta.status, uta.score, uta.created_at, t.title, u.full_name
ORDER BY uta.created_at DESC;
