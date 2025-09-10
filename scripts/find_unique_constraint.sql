-- Ищем уникальные ограничения для user_test_attempts
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition,
    conkey as column_numbers
FROM pg_constraint 
WHERE conrelid = 'user_test_attempts'::regclass
AND contype = 'u'  -- unique constraints
ORDER BY conname;

-- Также проверим индексы, которые могут создавать уникальность
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_test_attempts'
AND indexdef LIKE '%UNIQUE%';
