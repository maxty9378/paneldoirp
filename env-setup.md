# Настройка переменных окружения

## Для локальной разработки
Создайте файл `.env.local` в корне проекта:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_APP_TITLE=DOIRP Training Platform
VITE_APP_VERSION=1.0.0
```

## Для продакшена
Создайте файл `.env.production` в корне проекта:

```env
NODE_ENV=production
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_APP_TITLE=DOIRP Training Platform
VITE_APP_VERSION=1.0.0
```

## Получение Supabase ключей
1. Зайдите в ваш Supabase проект
2. Перейдите в Settings > API
3. Скопируйте URL и anon public key
4. Замените значения в соответствующих файлах
