# Инструкция по применению миграции

## Проблема
Таблица `user_test_attempts` не существует в базе данных, поэтому не работает сохранение позиции в тестах.

## Решение

### Шаг 1: Откройте Supabase Dashboard
1. Перейдите в ваш проект Supabase
2. Откройте раздел "SQL Editor"

### Шаг 2: Выполните миграцию
1. Скопируйте содержимое файла `scripts/full-migration.sql`
2. Вставьте в SQL Editor
3. Нажмите "Run" для выполнения

### Шаг 3: Проверьте результат
После выполнения вы должны увидеть:
```
Migration completed successfully!
user_test_attempts_exists: 1
current_question_index_exists: 1
```

### Шаг 4: Протестируйте функциональность
1. Откройте тест на мобильном устройстве
2. Ответьте на несколько вопросов
3. Перейдите к другому вопросу
4. Закройте браузер
5. Откройте тест снова
6. Нажмите "Продолжить"
7. Проверьте, что открылся правильный вопрос

## Что создает миграция

✅ **Таблицы:**
- `tests` - тесты
- `test_questions` - вопросы тестов  
- `test_answers` - варианты ответов
- `user_test_attempts` - попытки прохождения тестов
- `user_test_answers` - ответы пользователей
- `test_sequence_answers` - ответы для последовательных вопросов

✅ **Поля:**
- `current_question_index` в таблице `user_test_attempts` для сохранения позиции

✅ **Безопасность:**
- RLS политики для всех таблиц
- Внешние ключи
- Индексы для оптимизации

✅ **Функции:**
- Триггеры для обновления `updated_at`
- Функция `update_updated_at_column()`

## Если что-то пошло не так

1. **Проверьте права доступа** - убедитесь, что у вас есть права на создание таблиц
2. **Проверьте зависимости** - убедитесь, что существуют таблицы `users` и `events`
3. **Проверьте логи** - посмотрите на ошибки в SQL Editor

## Альтернативное решение

Если миграция не работает, можно использовать localStorage для сохранения позиции:

```typescript
// В useMobileTest.ts замените saveCurrentPosition на:
const saveCurrentPosition = useCallback((questionIndex: number) => {
  localStorage.setItem(`test_pos_${attemptId}`, questionIndex.toString());
}, [attemptId]);

// И в restoreProgress используйте:
const savedPosition = parseInt(localStorage.getItem(`test_pos_${attemptId}`) || '0');
```

Но лучше использовать базу данных для надежности.
