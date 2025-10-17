# 🎯 BFF - Следующие шаги

## ✅ Что уже готово

1. ✅ **BFF сервер установлен и работает** на `http://51.250.94.103:3000`
2. ✅ **Все эндпойнты доступны** (auth, REST, Storage, Functions)
3. ✅ **Клиент для фронтенда создан** (`src/lib/supabase-bff.ts`)
4. ✅ **Хук авторизации готов** (`src/hooks/useAuthBFF.tsx`)
5. ✅ **Компонент входа готов** (`src/components/LoginFormBFF.tsx`)
6. ✅ **Документация создана** (README, DEPLOY, INTEGRATION_GUIDE)

## 🚀 Что нужно сделать сейчас

### Шаг 1: Добавить переменную окружения (1 минута)

Создайте или обновите файл `.env` в корне проекта:

```env
VITE_BFF_URL=http://51.250.94.103:3000
```

### Шаг 2: Протестировать BFF (2 минуты)

Откройте терминал и выполните:

```bash
curl http://51.250.94.103:3000/health
```

Должен вернуть:
```json
{"ok":true,"timestamp":"...","service":"doirp-bff"}
```

### Шаг 3: Интегрировать с фронтендом (5-10 минут)

**Вариант А: Быстрая интеграция (рекомендуется)**

1. Откройте `src/App.tsx`
2. Найдите импорт `AuthProvider` и замените на:
   ```typescript
   import { AuthProviderBFF } from './hooks/useAuthBFF';
   ```
3. Замените `<AuthProvider>` на `<AuthProviderBFF>`
4. Откройте `src/components/LoginForm.tsx`
5. Замените импорт `useAuth` на:
   ```typescript
   import { useAuthBFF } from '../hooks/useAuthBFF';
   ```
6. Замените `const { signIn, ... } = useAuth();` на:
   ```typescript
   const { signIn, ... } = useAuthBFF();
   ```

**Вариант Б: Использовать готовый компонент**

1. Откройте файл, где используется `LoginForm`
2. Замените импорт:
   ```typescript
   // Было:
   import { LoginForm } from './components/LoginForm';
   
   // Стало:
   import { LoginFormBFF } from './components/LoginFormBFF';
   ```
3. Замените `<LoginForm />` на `<LoginFormBFF />`

### Шаг 4: Запустить и протестировать (3 минуты)

```bash
npm run dev
```

Откройте http://localhost:5173 и попробуйте войти.

## 📊 Проверка работы

### 1. Проверка health endpoint

```bash
curl http://51.250.94.103:3000/health
```

### 2. Проверка авторизации

```bash
curl -X POST http://51.250.94.103:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sns.ru","password":"test123"}' \
  -c cookies.txt

# Проверка текущего пользователя
curl http://51.250.94.103:3000/auth/me -b cookies.txt
```

### 3. Проверка логов BFF

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
# 1. Исправьте код локально в директории bff/
# 2. Загрузите на сервер
scp -i src/ssh/ssh-key-doirp-01 -r bff/src doirp@51.250.94.103:~/doirp-bff/

# 3. Пересоберите и перезапустите
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103 \
  "cd ~/doirp-bff && sudo docker-compose up -d --build"
```

## 🐛 Решение проблем

### Проблема: CORS ошибки

**Решение:** Проверьте `.env` файл:
```env
VITE_BFF_URL=http://51.250.94.103:3000
```

### Проблема: 401 Unauthorized

**Решение:** 
1. Проверьте логи BFF
2. Проверьте, что пользователь авторизован
3. Проверьте куки в DevTools

### Проблема: Куки не устанавливаются

**Решение:**
- Используйте `http://` (не `https://`) для IP адреса
- Убедитесь, что `credentials: 'include'` в запросах

### Проблема: Таймауты

**Решение:**
1. Проверьте доступность BFF: `curl http://51.250.94.103:3000/health`
2. Проверьте доступность Supabase
3. Проверьте логи BFF

## 📚 Документация

- **[BFF_QUICK_START.md](BFF_QUICK_START.md)** - Быстрый старт (10 минут)
- **[BFF_INTEGRATION_GUIDE.md](BFF_INTEGRATION_GUIDE.md)** - Полное руководство по интеграции
- **[BFF_SUMMARY.md](BFF_SUMMARY.md)** - Резюме проекта
- **[bff/README.md](bff/README.md)** - Описание BFF
- **[bff/DEPLOY.md](bff/DEPLOY.md)** - Инструкция по деплою

## 🎉 Готово!

После выполнения этих шагов ваш фронтенд будет работать через BFF и обходить блокировки провайдеров!

## 📞 Нужна помощь?

Если что-то не работает:
1. Проверьте логи BFF
2. Проверьте консоль браузера
3. Проверьте, что BFF запущен: `curl http://51.250.94.103:3000/health`
4. Проверьте переменные окружения
5. Проверьте документацию

---

**Время на интеграцию: ~10 минут** ⏱️

**Статус:** ✅ Готово к использованию

