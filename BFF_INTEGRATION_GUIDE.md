# Руководство по интеграции BFF с фронтендом

## 🎯 Что делает BFF

BFF (Backend-for-Frontend) проксирует все запросы к Supabase через ваш сервер, что:
- ✅ Обходит блокировки провайдеров (МТС)
- ✅ Скрывает прямые обращения к *.supabase.co
- ✅ Хранит токены в безопасных httpOnly-куках
- ✅ Централизует логирование и мониторинг

## 📋 Шаг 1: Настройка переменных окружения

Добавьте в корневой `.env` файл:

```env
# BFF Configuration
VITE_BFF_URL=http://51.250.94.103:3000

# Опционально: можно отключить прямой доступ к Supabase
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
```

## 📋 Шаг 2: Обновление компонентов для использования BFF

### Пример: Обновление LoginForm

**Было (прямой доступ к Supabase):**
```typescript
import { supabase } from '../lib/supabase';

const result = await supabase.auth.signInWithPassword({
  email,
  password
});
```

**Стало (через BFF):**
```typescript
import { bffAuth } from '../lib/supabase-bff';

const result = await bffAuth.signIn({ email, password });
```

### Пример: Запрос к REST API

**Было:**
```typescript
const { data, error } = await supabase
  .from('events')
  .select('*');
```

**Стало:**
```typescript
import { bffRest } from '../lib/supabase-bff';

const data = await bffRest.get('/events');
```

## 📋 Шаг 3: Обновление useAuth хука

Создайте новый хук `useAuthBFF` или обновите существующий:

```typescript
import { useAuthBFF } from '../hooks/useAuthBFF';

function MyComponent() {
  const { user, loading, signIn, signOut } = useAuthBFF();
  
  // ... остальной код
}
```

## 📋 Шаг 4: Обновление App.tsx

Замените `AuthProvider` на `AuthProviderBFF`:

```typescript
import { AuthProviderBFF } from './hooks/useAuthBFF';

function App() {
  return (
    <AuthProviderBFF>
      <Router>
        {/* ... ваш код */}
      </Router>
    </AuthProviderBFF>
  );
}
```

## 🔄 Миграция компонентов

### Приоритет обновления:

1. **Высокий приоритет** (критичные компоненты):
   - ✅ `LoginForm.tsx` - авторизация
   - ✅ `useAuth.tsx` - хук авторизации
   - ✅ Компоненты с REST запросами

2. **Средний приоритет**:
   - Компоненты работы с Storage
   - Компоненты вызова Edge Functions

3. **Низкий приоритет**:
   - Компоненты с редкими запросами

## 📝 Примеры использования BFF API

### Авторизация

```typescript
import { bffAuth } from '../lib/supabase-bff';

// Вход
await bffAuth.signIn({ email, password });

// Выход
await bffAuth.signOut();

// Получение текущего пользователя
const user = await bffAuth.getCurrentUser();

// Magic link
await bffAuth.sendMagicLink({ email });
await bffAuth.verifyMagicLink({ token, type: 'email' });
```

### REST API

```typescript
import { bffRest } from '../lib/supabase-bff';

// GET запрос
const events = await bffRest.get('/events');

// POST запрос
const newEvent = await bffRest.post('/events', { name: 'Event' });

// PUT запрос
await bffRest.put('/events/123', { name: 'Updated Event' });

// DELETE запрос
await bffRest.delete('/events/123');

// С фильтрами
const filtered = await bffRest.get('/events?status=active');
```

### Storage

```typescript
import { bffStorage } from '../lib/supabase-bff';

// Получить файл
const file = await bffStorage.getFile('bucket-name', 'path/to/file.jpg');

// Загрузить файл
await bffStorage.uploadFile('bucket-name', 'path/to/file.jpg', fileBlob);

// Удалить файл
await bffStorage.deleteFile('bucket-name', 'path/to/file.jpg');

// Список файлов
const files = await bffStorage.listFiles('bucket-name', 'prefix/');
```

### Edge Functions

```typescript
import { bffFunctions } from '../lib/supabase-bff';

// Вызвать функцию
const result = await bffFunctions.invoke('function-name', { param: 'value' });
```

## 🔒 Безопасность

### Куки

BFF автоматически управляет куками:
- `sb_access` - access token (время жизни по expires_in)
- `sb_refresh` - refresh token (30 дней)

Куки:
- ✅ `httpOnly` - недоступны из JavaScript
- ✅ `secure` - только HTTPS (в production)
- ✅ `sameSite: lax` - защита от CSRF

### CORS

BFF настроен на:
- `http://51.250.94.103` (ваш IP)
- `http://localhost:5173` (локальная разработка)

## 🧪 Тестирование

### 1. Проверка health endpoint

```bash
curl http://51.250.94.103:3000/health
```

Должен вернуть:
```json
{
  "ok": true,
  "timestamp": "2025-10-17T11:15:44.808Z",
  "service": "doirp-bff"
}
```

### 2. Тест авторизации

```bash
curl -X POST http://51.250.94.103:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sns.ru","password":"test123"}' \
  -c cookies.txt

# Проверка текущего пользователя
curl http://51.250.94.103:3000/auth/me -b cookies.txt
```

### 3. Тест REST API

```bash
curl http://51.250.94.103:3000/rest/events -b cookies.txt
```

## 🐛 Troubleshooting

### Проблема: CORS ошибки

**Решение:** Проверьте, что `VITE_BFF_URL` правильный и BFF запущен.

### Проблема: Куки не устанавливаются

**Решение:** 
- В development используйте `http://` (не `https://`)
- Убедитесь, что `credentials: 'include'` в fetch запросах

### Проблема: 401 Unauthorized

**Решение:**
- Проверьте, что пользователь авторизован
- Проверьте логи BFF: `docker-compose logs -f`

### Проблема: Таймауты

**Решение:**
- Увеличьте таймауты в BFF (по умолчанию 60 секунд)
- Проверьте доступность Supabase

## 📊 Мониторинг

### Просмотр логов BFF

```bash
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103 \
  "cd ~/doirp-bff && sudo docker-compose logs -f"
```

### Метрики

BFF логирует:
- Все входящие запросы
- Статусы ответов
- Время выполнения
- Ошибки

## 🚀 Production готовность

### Перед production:

1. ✅ Настройте домен (например, `api.sns.ru`)
2. ✅ Включите HTTPS с Let's Encrypt
3. ✅ Обновите `.env`:
   ```env
   COOKIE_DOMAIN=.sns.ru
   COOKIE_SECURE=true
   CORS_ORIGIN=https://app.sns.ru
   ALLOWED_ORIGINS=https://app.sns.ru
   ```
4. ✅ Настройте мониторинг и алерты
5. ✅ Настройте резервное копирование

## 📚 Дополнительные ресурсы

- [BFF README](bff/README.md)
- [Деплой инструкция](bff/DEPLOY.md)
- [Supabase BFF Client](src/lib/supabase-bff.ts)

## ✅ Чек-лист интеграции

- [ ] Добавлен `VITE_BFF_URL` в `.env`
- [ ] Обновлен `LoginForm` для использования BFF
- [ ] Обновлен `useAuth` хук
- [ ] Обновлен `App.tsx` с `AuthProviderBFF`
- [ ] Протестирована авторизация
- [ ] Протестированы REST запросы
- [ ] Протестирован Storage (если используется)
- [ ] Протестированы Edge Functions (если используются)
- [ ] Проверены логи BFF
- [ ] Настроен мониторинг

---

**Готово!** Теперь ваш фронтенд работает через BFF и обходит блокировки провайдеров! 🎉

