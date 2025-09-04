# Диагностика проблемы с сохранением позиции

## Шаги для диагностики

### 1. Проверьте миграцию базы данных

Выполните SQL скрипт для проверки и добавления поля:

```sql
-- Запустите этот скрипт в Supabase SQL Editor
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_test_attempts' 
AND column_name = 'current_question_index';
```

Если поле не существует, выполните:

```sql
ALTER TABLE user_test_attempts 
ADD COLUMN current_question_index INTEGER DEFAULT 0;

COMMENT ON COLUMN user_test_attempts.current_question_index IS 'Индекс текущего вопроса (0-based)';

UPDATE user_test_attempts 
SET current_question_index = 0 
WHERE current_question_index IS NULL;
```

### 2. Проверьте консоль браузера

Откройте DevTools (F12) и перейдите на вкладку Console. При тестировании вы должны увидеть:

```
Loaded attempt data: {id: "...", current_question_index: 0, ...}
Saving position: 1 for attempt: ...
Position saved successfully
Restore progress: {savedPosition: 1, lastAnswered: -1, ...}
Target position: 1
```

### 3. Проверьте данные в базе

Выполните запрос для проверки сохраненных данных:

```sql
SELECT id, current_question_index, created_at, updated_at
FROM user_test_attempts 
WHERE id = 'YOUR_ATTEMPT_ID'
ORDER BY updated_at DESC;
```

### 4. Возможные проблемы и решения

#### Проблема: Поле не существует в БД
**Решение**: Выполните миграцию (шаг 1)

#### Проблема: Ошибка при сохранении
**Проверьте**:
- Правильность attemptId
- Права доступа к таблице user_test_attempts
- Сетевые ошибки в консоли

#### Проблема: Позиция не восстанавливается
**Проверьте**:
- Загружается ли attempt с правильным current_question_index
- Правильно ли работает логика restoreProgress
- Есть ли ошибки в консоли

#### Проблема: Всегда открывается первый вопрос
**Возможные причины**:
- current_question_index всегда 0
- Логика восстановления работает неправильно
- attempt не загружается

### 5. Тестовый сценарий

1. **Начните новый тест**
2. **Ответьте на 2-3 вопроса**
3. **Перейдите к другому вопросу** (например, 5-й)
4. **Закройте браузер/вкладку**
5. **Откройте тест снова**
6. **Нажмите "Продолжить"**
7. **Проверьте, что открылся 5-й вопрос**

### 6. Отладочная информация

В консоли должно быть:

```
// При загрузке
Loaded attempt data: {current_question_index: 4, ...}

// При навигации
Saving position: 5 for attempt: abc-123
Position saved successfully

// При восстановлении
Restore progress: {
  savedPosition: 5,
  lastAnswered: 2,
  attempt: {current_question_index: 5, ...},
  progress: [...]
}
Target position: 5
```

### 7. Если ничего не помогает

1. **Очистите кэш браузера**
2. **Проверьте, что миграция применена**
3. **Убедитесь, что нет ошибок в консоли**
4. **Проверьте права доступа к БД**

### 8. Альтернативное решение

Если проблема критическая, можно временно использовать localStorage:

```typescript
// Вместо сохранения в БД
const saveCurrentPosition = useCallback((questionIndex: number) => {
  localStorage.setItem(`test_position_${attemptId}`, questionIndex.toString());
}, [attemptId]);

// При восстановлении
const savedPosition = parseInt(localStorage.getItem(`test_position_${attemptId}`) || '0');
```

## Контакты для поддержки

Если проблема не решается, предоставьте:
1. Скриншот консоли браузера
2. Результат SQL запроса проверки поля
3. Описание шагов воспроизведения
