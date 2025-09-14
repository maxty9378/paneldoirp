# Полное руководство по восстановлению базы данных

## Анализ проблемы

После сбоя базы данных были потеряны следующие компоненты:
1. **RPC функции** - функции для работы с пользователями и данными
2. **Edge Functions** - серверные функции для интеграции с auth
3. **Триггеры** - автоматические функции для обновления данных
4. **Политики RLS** - политики безопасности

## Пошаговое восстановление

### Шаг 1: Проверка текущего состояния

Сначала запустите скрипт проверки в Supabase SQL Editor:

```sql
-- Запустите check_missing_functions.sql
```

### Шаг 2: Восстановление RPC функций

Запустите в Supabase SQL Editor:

```sql
-- Запустите restore_missing_functions.sql
```

### Шаг 3: Развертывание Edge Functions

Выполните в терминале:

```bash
# Перейти в каталог проекта
cd C:\Users\Home K\Downloads\sns-panel\project

# Развернуть все Edge Functions
supabase functions deploy

# Проверить статус
supabase functions list
```

### Шаг 4: Проверка миграций

Убедитесь, что все миграции применены:

```bash
# Проверить статус миграций
supabase migration list

# Применить недостающие миграции
supabase db push
```

### Шаг 5: Восстановление данных

Если нужно восстановить данные:

```sql
-- Запустите restore_data.sql
-- Запустите restore_questions_answers.sql
-- Запустите restore_policies.sql
```

## Критически важные функции

### RPC функции, которые должны работать:

1. **rpc_bootstrap_admin()** - создание администратора
2. **rpc_create_user()** - создание пользователей
3. **rpc_create_user_safe()** - безопасное создание пользователей
4. **rpc_sync_all_users_to_auth()** - синхронизация с auth
5. **rpc_delete_user_complete()** - полное удаление пользователей
6. **rpc_repair_user_auth()** - восстановление auth пользователей
7. **should_show_feedback_form()** - проверка возможности обратной связи
8. **get_tp_evaluation_stats()** - статистика TP оценок
9. **get_event_feedback_stats()** - статистика обратной связи
10. **get_deployment_status()** - статус развертывания

### Edge Functions, которые должны быть развернуты:

1. **create-user** - создание пользователей
2. **bootstrap-admin** - создание администратора
3. **update-user** - обновление пользователей
4. **delete-user** - удаление пользователей
5. **password-management** - управление паролями
6. **reset-password** - сброс паролей
7. **auth-by-qr-token** - авторизация по QR
8. **generate-persistent-qr** - генерация QR кодов

### Триггеры, которые должны быть активны:

1. **on_auth_user_created** - создание пользователей из auth
2. **after_user_created** - создание пользователей в public.users
3. **trigger_auto_assign_tests** - автоматическое назначение тестов
4. **trigger_calculate_average_skills_score** - расчет средних оценок
5. **update_*_updated_at** - обновление временных меток

## Проверка работоспособности

### Тест 1: Создание администратора

```javascript
// В консоли браузера на странице приложения
const { data, error } = await supabase.rpc('rpc_bootstrap_admin');
console.log('Bootstrap admin result:', data, error);
```

### Тест 2: Создание пользователя

```javascript
const { data, error } = await supabase.rpc('rpc_create_user_safe', {
  p_email: 'test@example.com',
  p_full_name: 'Test User',
  p_role: 'employee'
});
console.log('Create user result:', data, error);
```

### Тест 3: Edge Function

```javascript
const { data, error } = await supabase.functions.invoke('bootstrap-admin');
console.log('Edge function result:', data, error);
```

## Возможные проблемы и решения

### Проблема 1: "Function does not exist"
**Решение**: Запустите `restore_missing_functions.sql`

### Проблема 2: "Edge function not available"
**Решение**: Выполните `supabase functions deploy`

### Проблема 3: "Permission denied"
**Решение**: Проверьте RLS политики в `restore_policies.sql`

### Проблема 4: "Trigger does not exist"
**Решение**: Запустите раздел триггеров из `restore_missing_functions.sql`

## Мониторинг

После восстановления проверьте:

1. **Логи Edge Functions**:
   ```bash
   supabase functions logs bootstrap-admin
   supabase functions logs create-user
   ```

2. **Статус RPC функций**:
   ```sql
   SELECT proname, prokind FROM pg_proc 
   WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
   AND proname LIKE 'rpc_%';
   ```

3. **Активные триггеры**:
   ```sql
   SELECT tgname, tgrelid::regclass FROM pg_trigger 
   WHERE tgname LIKE '%user%' OR tgname LIKE '%test%';
   ```

## Резервное копирование

После успешного восстановления создайте резервную копию:

```bash
# Создать дамп базы данных
supabase db dump --file backup_$(date +%Y%m%d_%H%M%S).sql

# Или создать полный бэкап
supabase db dump --file full_backup_$(date +%Y%m%d_%H%M%S).sql --data-only
```

## Контакты для поддержки

Если возникнут проблемы:
1. Проверьте логи в Supabase Dashboard
2. Убедитесь, что все переменные окружения настроены
3. Проверьте права доступа к базе данных
4. Убедитесь, что все миграции применены корректно
