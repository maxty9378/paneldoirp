# DOIRP BFF (Backend-for-Frontend)

Backend-for-Frontend сервер для проксирования запросов к Supabase. Решает проблемы с блокировками провайдеров (МТС) и обеспечивает безопасное хранение токенов в httpOnly-куках.

## Возможности

- ✅ Проксирование запросов к Supabase (REST, Storage, Functions)
- ✅ Авторизация с httpOnly-куками
- ✅ Автоматическое обновление токенов
- ✅ CORS настройки
- ✅ Rate limiting
- ✅ Логирование с корреляцией запросов
- ✅ Health check endpoint
- ✅ Magic link поддержка

## Быстрый старт

### Локальная разработка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Заполните переменные окружения в `.env`

4. Запустите в режиме разработки:
```bash
npm run dev
```

### Production

#### Docker

```bash
# Сборка образа
docker build -t doirp-bff .

# Запуск
docker-compose up -d
```

#### Напрямую

```bash
# Сборка
npm run build

# Запуск
npm start
```

## API Endpoints

### Auth

- `POST /auth/sign-in` - Вход по email и паролю
- `POST /auth/magic-link` - Отправка magic link
- `POST /auth/verify-magic-link` - Верификация magic link
- `POST /auth/refresh` - Обновление токена
- `POST /auth/sign-out` - Выход
- `GET /auth/me` - Получение текущего пользователя

### Proxy

- `GET /rest/*` - Прокси к Supabase REST API
- `GET /storage/*` - Прокси к Supabase Storage
- `GET /functions/*` - Прокси к Supabase Edge Functions

### Health

- `GET /health` - Health check

## Переменные окружения

| Переменная | Описание | Обязательно |
|-----------|----------|-------------|
| `SUPABASE_URL` | URL Supabase проекта | Да |
| `SUPABASE_ANON_KEY` | Anon key Supabase | Да |
| `SUPABASE_SERVICE_KEY` | Service key Supabase | Да |
| `COOKIE_DOMAIN` | Домен для кук | Нет |
| `COOKIE_NAME_ACCESS` | Имя куки для access token | Нет |
| `COOKIE_NAME_REFRESH` | Имя куки для refresh token | Нет |
| `COOKIE_SECURE` | Secure флаг для кук | Нет |
| `COOKIE_SAME_SITE` | SameSite для кук | Нет |
| `CORS_ORIGIN` | Разрешенный CORS origin | Нет |
| `ALLOWED_ORIGINS` | Список разрешенных origins | Нет |
| `PORT` | Порт сервера | Нет |
| `NODE_ENV` | Окружение (development/production) | Нет |
| `LOG_LEVEL` | Уровень логирования | Нет |

## Деплой на Яндекс Облако

### Вариант 1: Container Registry + Cloud Run

1. Соберите Docker образ:
```bash
docker build -t cr.yandex/<registry-id>/doirp-bff:latest .
```

2. Загрузите в Container Registry:
```bash
docker push cr.yandex/<registry-id>/doirp-bff:latest
```

3. Создайте Serverless Container в Cloud Run с образом

### Вариант 2: VM + Docker

1. Создайте VM в Яндекс Облаке
2. Установите Docker
3. Загрузите код и запустите через docker-compose

## Безопасность

- Токены хранятся в httpOnly-куках (недоступны из JavaScript)
- Secure флаг для кук в production
- SameSite=Lax для защиты от CSRF
- Rate limiting для защиты от DDoS
- Helmet для дополнительных security headers
- CORS настроен на конкретные origins

## Мониторинг

Все запросы логируются с уникальным request-id для корреляции. Логи включают:
- Время запроса
- HTTP метод и путь
- Статус ответа
- Время выполнения
- IP адрес клиента

## Troubleshooting

### CORS ошибки
Проверьте, что `ALLOWED_ORIGINS` содержит origin вашего фронтенда.

### Куки не устанавливаются
- Убедитесь, что `COOKIE_DOMAIN` настроен правильно
- В production должен быть `COOKIE_SECURE=true`
- Проверьте, что запросы идут с правильного домена

### Ошибки подключения к Supabase
- Проверьте `SUPABASE_URL` и ключи
- Убедитесь, что Supabase проект доступен
- Проверьте логи на наличие ошибок

## Лицензия

ISC

