# 🚀 BFF - Быстрый старт

## ✅ Что уже сделано

1. ✅ BFF сервер установлен и запущен на `51.250.94.103:3000`
2. ✅ Все эндпойнты работают (auth, REST, Storage, Functions)
3. ✅ Настроено для работы по IP адресу
4. ✅ Создан клиент для фронтенда (`src/lib/supabase-bff.ts`)
5. ✅ Создан хук авторизации (`src/hooks/useAuthBFF.tsx`)

## 🎯 Что нужно сделать сейчас

### Шаг 1: Добавить переменную окружения (1 минута)

Создайте файл `.env` в корне проекта (или обновите существующий):

```env
VITE_BFF_URL=http://51.250.94.103:3000
```

### Шаг 2: Обновить LoginForm (5 минут)

**Вариант А: Использовать готовый компонент**

Замените импорт в вашем коде:

```typescript
// Было:
import { LoginForm } from './components/LoginForm';

// Стало:
import { LoginFormBFF } from './components/LoginFormBFF';
```

**Вариант Б: Обновить существующий компонент**

В `src/components/LoginForm.tsx` замените:

```typescript
// Было:
import { useAuth } from '../hooks/useAuth';

// Стало:
import { useAuthBFF } from '../hooks/useAuthBFF';

// И в компоненте:
const { signIn, user, loading, authError } = useAuthBFF();
```

### Шаг 3: Обновить App.tsx (2 минуты)

Замените `AuthProvider`:

```typescript
// Было:
import { AuthProvider } from './hooks/useAuth';

// Стало:
import { AuthProviderBFF } from './hooks/useAuthBFF';

// И в JSX:
<AuthProviderBFF>
  <Router>
    {/* ... ваш код */}
  </Router>
</AuthProviderBFF>
```

### Шаг 4: Протестировать (3 минуты)

1. Запустите приложение: `npm run dev`
2. Откройте http://localhost:5173
3. Попробуйте войти
4. Проверьте, что авторизация работает

## 📊 Проверка работы BFF

### Проверка health endpoint

```bash
curl http://51.250.94.103:3000/health
```

Должен вернуть:
```json
{"ok":true,"timestamp":"...","service":"doirp-bff"}
```

### Проверка логов BFF

```bash
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103 \
  "cd ~/doirp-bff && sudo docker-compose logs -f"
```

## 🔧 Управление BFF

### Просмотр статуса

```bash
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103 \
  "cd ~/doirp-bff && sudo docker-compose ps"
```

### Перезапуск

```bash
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103 \
  "cd ~/doirp-bff && sudo docker-compose restart"
```

### Остановка

```bash
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103 \
  "cd ~/doirp-bff && sudo docker-compose down"
```

### Обновление кода

```bash
# 1. Исправьте код локально
# 2. Загрузите на сервер
scp -i src/ssh/ssh-key-doirp-01 -r bff/src doirp@51.250.94.103:~/doirp-bff/

# 3. Пересоберите и перезапустите
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103 \
  "cd ~/doirp-bff && sudo docker-compose up -d --build"
```

## 🐛 Решение проблем

### Проблема: CORS ошибки

**Решение:** Убедитесь, что `VITE_BFF_URL` правильный:
```env
VITE_BFF_URL=http://51.250.94.103:3000
```

### Проблема: 401 Unauthorized

**Решение:** Проверьте логи BFF:
```bash
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103 \
  "cd ~/doirp-bff && sudo docker-compose logs -f"
```

### Проблема: Куки не устанавливаются

**Решение:** 
- Используйте `http://` (не `https://`) для IP адреса
- Убедитесь, что `credentials: 'include'` в fetch запросах (уже есть в `bffClient`)

### Проблема: Таймауты

**Решение:** 
- Проверьте доступность BFF: `curl http://51.250.94.103:3000/health`
- Проверьте доступность Supabase

## 📚 Дополнительная документация

- [Полное руководство по интеграции](BFF_INTEGRATION_GUIDE.md)
- [BFF README](bff/README.md)
- [Деплой инструкция](bff/DEPLOY.md)
- [BFF Client API](src/lib/supabase-bff.ts)

## 🎉 Готово!

После выполнения этих шагов ваш фронтенд будет работать через BFF и обходить блокировки провайдеров!

## 📞 Поддержка

Если что-то не работает:
1. Проверьте логи BFF
2. Проверьте консоль браузера
3. Проверьте, что BFF запущен: `curl http://51.250.94.103:3000/health`
4. Проверьте переменные окружения

---

**Время на интеграцию: ~10 минут** ⏱️

