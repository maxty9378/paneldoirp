# Диагностика проблемы с кэшем

## Шаги для проверки:

### 1. Проверьте миграцию в базе данных
Выполните в Supabase SQL Editor:
```sql
-- Скопируйте и выполните содержимое scripts/check-migration-status.sql
```

### 2. Очистите кэш браузера
1. Откройте `scripts/clear-cache.html` в браузере
2. Нажмите "Очистить кэш"
3. Обновите страницу с тестом (Ctrl+F5)

### 3. Проверьте консоль браузера
Откройте DevTools (F12) → Console и найдите:

```
Loaded attempt data: {current_question_index: X, ...}
Current question index from DB: X
Setting initial question index: X
Saving position: Y for attempt: ...
Position saved successfully
```

### 4. Проверьте данные в базе
Выполните в Supabase SQL Editor:
```sql
SELECT id, current_question_index, created_at, updated_at
FROM user_test_attempts 
WHERE id = 'YOUR_ATTEMPT_ID'
ORDER BY updated_at DESC;
```

### 5. Если ничего не помогает

**Вариант 1: Принудительное обновление**
```javascript
// В консоли браузера
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

**Вариант 2: Проверьте права доступа**
```sql
-- Проверьте, есть ли у пользователя права на таблицу
SELECT * FROM information_schema.table_privileges 
WHERE table_name = 'user_test_attempts';
```

**Вариант 3: Временное решение с localStorage**
Если БД не работает, можно временно использовать localStorage:

```typescript
// В useMobileTest.ts замените saveCurrentPosition на:
const saveCurrentPosition = useCallback((questionIndex: number) => {
  localStorage.setItem(`test_pos_${attemptId}`, questionIndex.toString());
  console.log('Saved to localStorage:', questionIndex);
}, [attemptId]);

// И в restoreProgress используйте:
const savedPosition = parseInt(localStorage.getItem(`test_pos_${attemptId}`) || '0');
console.log('Loaded from localStorage:', savedPosition);
```

### 6. Проверьте сетевые запросы
В DevTools → Network найдите запросы к Supabase:
- Должны быть запросы к `user_test_attempts`
- Проверьте статус ответов (200 OK)
- Проверьте содержимое ответов

### 7. Альтернативная диагностика
Создайте тестовую запись:
```sql
INSERT INTO user_test_attempts (user_id, test_id, event_id, current_question_index)
VALUES ('test-user', 'test-test', 'test-event', 5);

SELECT * FROM user_test_attempts WHERE user_id = 'test-user';
```

## Ожидаемый результат

После исправлений должно работать:
1. ✅ Поле `current_question_index` существует в БД
2. ✅ Позиция сохраняется при навигации
3. ✅ Позиция восстанавливается при продолжении теста
4. ✅ В консоли видны логи сохранения/загрузки

Если проблема остается, проверьте:
- [ ] Миграция применена
- [ ] Кэш очищен
- [ ] Нет ошибок в консоли
- [ ] Права доступа к БД
- [ ] Сетевые запросы работают
