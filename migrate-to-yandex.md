# Миграция Supabase на Яндекс.Облако

## Шаг 1: Развертывание Supabase на ВМ

### Подключитесь к ВМ:
```bash
ssh -l doirp 51.250.94.103
```

### Загрузите и выполните скрипт установки:
```bash
# На вашем локальном компьютере
scp deploy-supabase-yandex.sh doirp@51.250.94.103:~/

# На ВМ
chmod +x deploy-supabase-yandex.sh
./deploy-supabase-yandex.sh
```

## Шаг 2: Настройка файрвола в Яндекс.Облако

1. Зайдите в консоль Яндекс.Облако
2. Перейдите в **VPC** → **Группы безопасности**
3. Найдите группу `default-sg-enphq6fifa9dqk9eo7gd`
4. Добавьте правила для входящего трафика:
   - **Порт 8000** (API) - TCP, источник: 0.0.0.0/0
   - **Порт 54323** (Studio) - TCP, источник: 0.0.0.0/0 (или только ваш IP)
   - **Порт 443** (HTTPS) - TCP, источник: 0.0.0.0/0 (для будущего SSL)

## Шаг 3: Миграция данных

### 3.1. Экспорт данных из текущего Supabase

```bash
# На вашем локальном компьютере
supabase db dump -f backup.sql --project-ref oaockmesooydvausfoca
```

### 3.2. Импорт данных на новый сервер

```bash
# На ВМ
cd ~/supabase
supabase db reset
# Затем загрузите backup.sql и выполните:
psql -h localhost -U postgres -d postgres -f backup.sql
```

Или через Supabase CLI:
```bash
supabase db push --db-url "postgresql://postgres:your_password@localhost:5432/postgres"
```

## Шаг 4: Настройка домена (опционально, но рекомендуется)

### 4.1. Настройте DNS запись
- Создайте A-запись для вашего домена, указывающую на `51.250.94.103`

### 4.2. Установите Nginx и SSL
```bash
sudo apt install nginx certbot python3-certbot-nginx -y

# Настройте Nginx
sudo nano /etc/nginx/sites-available/supabase
```

Конфигурация Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.ru;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.ru
```

## Шаг 5: Обновление конфигурации приложения

### 5.1. Получите новые ключи

На ВМ выполните:
```bash
cd ~/supabase
cat .env
```

Скопируйте значения:
- `ANON_KEY` - это будет ваш `VITE_SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY` - для серверных операций

### 5.2. Обновите переменные окружения

Создайте файл `.env.production.local`:
```env
VITE_SUPABASE_URL=http://51.250.94.103:8000
# или если настроили домен:
# VITE_SUPABASE_URL=https://your-domain.ru

VITE_SUPABASE_ANON_KEY=ваш_anon_key_из_env
```

### 5.3. Пересоберите приложение

```bash
npm run build
```

## Шаг 6: Тестирование

1. Проверьте доступность API:
```bash
curl http://51.250.94.103:8000/rest/v1/
```

2. Проверьте авторизацию в приложении

3. Проверьте работу на iPhone с МТС

## Шаг 7: Обновление DNS/домена (если используете)

Если у вас есть домен, обновите `VITE_SUPABASE_URL` на домен вместо IP.

## Резервное копирование

Настройте автоматическое резервное копирование:
```bash
# Создайте скрипт backup.sh
cat > ~/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cd ~/supabase
supabase db dump -f "backup_$DATE.sql"
# Загрузите в Яндекс.Облако Object Storage или другой сервис
EOF

chmod +x ~/backup.sh

# Добавьте в crontab (ежедневно в 2:00)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup.sh") | crontab -
```

## Мониторинг

Установите мониторинг ресурсов:
```bash
sudo apt install htop -y
htop
```

## Проблемы и решения

### Проблема: Не могу подключиться к API
- Проверьте файрвол в Яндекс.Облако
- Проверьте, что Supabase запущен: `supabase status`
- Проверьте логи: `supabase logs`

### Проблема: Недостаточно памяти
- Увеличьте размер ВМ в Яндекс.Облако
- Или оптимизируйте конфигурацию Supabase

### Проблема: Медленная работа
- Увеличьте ресурсы ВМ
- Настройте connection pooling
- Используйте CDN для статических файлов

