# Проверка и восстановление Edge Functions

## Список Edge Functions, которые должны быть развернуты:

### 1. create-user
- **Путь**: `supabase/functions/create-user/index.ts`
- **Назначение**: Создание пользователей через auth.admin.createUser
- **Endpoints**:
  - `/simple-create` - простое создание пользователя
  - `/test-mcp-create` - тестовый endpoint для MCP
  - Основной endpoint для создания пользователей

### 2. bootstrap-admin
- **Путь**: `supabase/functions/bootstrap-admin/index.ts`
- **Назначение**: Создание администратора системы
- **Функции**:
  - Проверка существования пользователя в auth и public.users
  - Синхронизация ID между таблицами
  - Создание администратора с нуля

### 3. update-user
- **Путь**: `supabase/functions/update-user/index.ts`
- **Назначение**: Обновление данных пользователей
- **Функции**:
  - Обновление данных в public.users
  - Синхронизация с auth.users при необходимости

### 4. delete-user
- **Путь**: `supabase/functions/delete-user/index.ts`
- **Назначение**: Удаление пользователей
- **Функции**:
  - Удаление из auth.users
  - Удаление из public.users
  - Очистка связанных данных

### 5. password-management
- **Путь**: `supabase/functions/password-management/index.ts`
- **Назначение**: Управление паролями пользователей
- **Функции**:
  - Сброс паролей
  - Генерация временных паролей

### 6. reset-password
- **Путь**: `supabase/functions/reset-password/index.ts`
- **Назначение**: Сброс паролей пользователей

### 7. auth-by-qr-token
- **Путь**: `supabase/functions/auth-by-qr-token/index.ts`
- **Назначение**: Авторизация по QR-коду

### 8. generate-persistent-qr
- **Путь**: `supabase/functions/generate-persistent-qr/index.ts`
- **Назначение**: Генерация постоянных QR-кодов

### 9. get-event-statistics
- **Путь**: `supabase/functions/get-event-statistics/index.ts`
- **Назначение**: Получение статистики мероприятий

### 10. assign-annual-test
- **Путь**: `supabase/functions/assign-annual-test/index.ts`
- **Назначение**: Назначение ежегодных тестов

### 11. create-bootstrap-admin
- **Путь**: `supabase/functions/create-bootstrap-admin/index.ts`
- **Назначение**: Альтернативная функция создания администратора

### 12. create-auth-user
- **Путь**: `supabase/functions/create-auth-user/index.ts`
- **Назначение**: Создание пользователей в auth системе

### 13. create-user-and-auth
- **Путь**: `supabase/functions/create-user-and-auth/index.ts`
- **Назначение**: Создание пользователей в обеих системах

### 14. fix-user-policies
- **Путь**: `supabase/functions/fix-user-policies/index.ts`
- **Назначение**: Исправление политик пользователей

## Команды для развертывания Edge Functions:

```bash
# Перейти в каталог проекта
cd C:\Users\Home K\Downloads\sns-panel\project

# Развернуть все Edge Functions
supabase functions deploy

# Или развернуть конкретную функцию
supabase functions deploy create-user
supabase functions deploy bootstrap-admin
supabase functions deploy update-user
supabase functions deploy delete-user
supabase functions deploy password-management
supabase functions deploy reset-password
supabase functions deploy auth-by-qr-token
supabase functions deploy generate-persistent-qr
supabase functions deploy get-event-statistics
supabase functions deploy assign-annual-test
supabase functions deploy create-bootstrap-admin
supabase functions deploy create-auth-user
supabase functions deploy create-user-and-auth
supabase functions deploy fix-user-policies
```

## Проверка статуса Edge Functions:

```bash
# Проверить статус всех функций
supabase functions list

# Проверить логи конкретной функции
supabase functions logs create-user
supabase functions logs bootstrap-admin
```

## Переменные окружения для Edge Functions:

Убедитесь, что в Supabase Dashboard настроены следующие переменные:
- `SUPABASE_URL` - URL вашего проекта
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key
- `SUPABASE_ANON_KEY` - Anon Key (если нужен)

## Тестирование Edge Functions:

```bash
# Тест создания пользователя
curl -X POST 'https://your-project.supabase.co/functions/v1/create-user' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com", "full_name": "Test User", "role": "employee"}'

# Тест создания администратора
curl -X POST 'https://your-project.supabase.co/functions/v1/bootstrap-admin' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```
