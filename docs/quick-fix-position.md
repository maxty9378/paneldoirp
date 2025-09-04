# Быстрое исправление проблемы с позицией

## Что нужно сделать:

### 1. Применить миграцию к базе данных

Выполните в Supabase SQL Editor:

```sql
-- Проверяем, есть ли поле
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_test_attempts' 
AND column_name = 'current_question_index';

-- Если поле не существует, добавляем его
ALTER TABLE user_test_attempts 
ADD COLUMN current_question_index INTEGER DEFAULT 0;

-- Обновляем существующие записи
UPDATE user_test_attempts 
SET current_question_index = 0 
WHERE current_question_index IS NULL;
```

### 2. Проверить работу

1. Откройте тест на мобильном устройстве
2. Ответьте на несколько вопросов
3. Перейдите к другому вопросу (например, 5-й)
4. Закройте браузер
5. Откройте тест снова
6. Нажмите "Продолжить"
7. Проверьте, что открылся 5-й вопрос

### 3. Проверить консоль

В DevTools (F12) → Console должны быть сообщения:

```
Loaded attempt data: {current_question_index: 4, ...}
Saving position: 5 for attempt: ...
Position saved successfully
Restore progress: {savedPosition: 5, ...}
Target position: 5
```

### 4. Если не работает

Проверьте:
- [ ] Миграция применена (поле существует в БД)
- [ ] Нет ошибок в консоли браузера
- [ ] attemptId правильный
- [ ] Права доступа к таблице user_test_attempts

### 5. Альтернативное решение

Если БД не работает, можно использовать localStorage:

```typescript
// В useMobileTest.ts замените saveCurrentPosition на:
const saveCurrentPosition = useCallback((questionIndex: number) => {
  localStorage.setItem(`test_pos_${attemptId}`, questionIndex.toString());
}, [attemptId]);

// И в restoreProgress используйте:
const savedPosition = parseInt(localStorage.getItem(`test_pos_${attemptId}`) || '0');
```

## Основные изменения в коде:

1. ✅ Добавлено поле `current_question_index` в БД
2. ✅ Добавлена функция `saveCurrentPosition` в хук
3. ✅ Обновлена логика `restoreProgress`
4. ✅ Добавлено автосохранение при навигации
5. ✅ Добавлена отладочная информация

Проблема должна быть решена после применения миграции!
