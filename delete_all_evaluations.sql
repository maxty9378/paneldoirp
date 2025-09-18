-- Скрипт для удаления всех оценок экспертов
-- ВНИМАНИЕ: Этот скрипт удалит ВСЕ оценки из всех таблиц!

-- Удаляем все оценки кейсов
DELETE FROM case_evaluations;

-- Удаляем все оценки защиты проектов  
DELETE FROM project_defense_evaluations;

-- Удаляем все оценки диагностической игры
DELETE FROM diagnostic_game_evaluations;

-- Показываем количество удаленных записей
SELECT 
    'case_evaluations' as table_name,
    COUNT(*) as remaining_records
FROM case_evaluations
UNION ALL
SELECT 
    'project_defense_evaluations' as table_name,
    COUNT(*) as remaining_records
FROM project_defense_evaluations
UNION ALL
SELECT 
    'diagnostic_game_evaluations' as table_name,
    COUNT(*) as remaining_records
FROM diagnostic_game_evaluations;

-- Сообщение об успешном удалении
SELECT 'Все оценки успешно удалены!' as status;
