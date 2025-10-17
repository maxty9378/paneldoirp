# Инструкция по деплою BFF на Яндекс Облако

## Вариант 1: Container Registry + Cloud Run (Serverless)

### Шаг 1: Подготовка

1. Установите Yandex Cloud CLI:
```bash
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash
```

2. Инициализируйте профиль:
```bash
yc init
```

### Шаг 2: Создание Container Registry

```bash
# Создайте registry
yc container registry create --name doirp-bff-registry

# Получите ID registry
REGISTRY_ID=$(yc container registry get doirp-bff-registry --format json | jq -r '.id')

# Настройте Docker для работы с registry
yc container registry configure-docker
```

### Шаг 3: Сборка и загрузка образа

```bash
# Перейдите в директорию BFF
cd bff

# Соберите образ
docker build -t cr.yandexcloud.net/${REGISTRY_ID}/doirp-bff:latest .

# Загрузите образ в registry
docker push cr.yandexcloud.net/${REGISTRY_ID}/doirp-bff:latest
```

### Шаг 4: Создание Serverless Container

```bash
# Создайте container
yc serverless container create --name doirp-bff

# Создайте ревизию с образом
yc serverless container revision deploy \
  --container-name doirp-bff \
  --image cr.yandexcloud.net/${REGISTRY_ID}/doirp-bff:latest \
  --cores 1 \
  --memory 512MB \
  --execution-timeout 30s \
  --concurrency 10 \
  --environment SUPABASE_URL=https://oaockmesooydvausfoca.supabase.co,SUPABASE_ANON_KEY=your_key,SUPABASE_SERVICE_KEY=your_key,COOKIE_DOMAIN=.нашдомен.ru,CORS_ORIGIN=https://app.нашдомен.ru,ALLOWED_ORIGINS=https://app.нашдомен.ru,NODE_ENV=production,PORT=8080

# Получите URL контейнера
yc serverless container get --name doirp-bff --format json | jq -r '.status.url'
```

### Шаг 5: Настройка домена

```bash
# Создайте API Gateway
yc serverless api-gateway create \
  --name doirp-bff-gateway \
  --spec spec.yaml

# Или используйте существующий домен
# Настройте DNS для api.нашдомен.ru на IP контейнера
```

## Вариант 2: VM + Docker (Рекомендуется для production)

### Шаг 1: Создание VM

```bash
# Создайте VM
yc compute instance create \
  --name doirp-bff-vm \
  --zone ru-central1-a \
  --network-interface subnet-name=default,nat-ip-version=ipv4 \
  --create-boot-disk image-folder-id=standard-images,image-family=ubuntu-2204-lts,size=20 \
  --ssh-key ~/.ssh/id_rsa.pub

# Получите внешний IP
yc compute instance get doirp-bff-vm --format json | jq -r '.network_interfaces[0].primary_v4_address.one_to_one_nat.address'
```

### Шаг 2: Подключение к VM

```bash
ssh ubuntu@<EXTERNAL_IP>
```

### Шаг 3: Установка Docker

```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавьте пользователя в группу docker
sudo usermod -aG docker ubuntu

# Установите docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Шаг 4: Загрузка кода

```bash
# Создайте директорию
mkdir -p ~/doirp-bff
cd ~/doirp-bff

# Загрузите код (например, через git)
git clone <your-repo> .
cd bff

# Или загрузите файлы вручную через scp
```

### Шаг 5: Настройка окружения

```bash
# Создайте .env файл
nano .env
```

Вставьте:
```env
SUPABASE_URL=https://oaockmesooydvausfoca.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
COOKIE_DOMAIN=.нашдомен.ru
COOKIE_NAME_ACCESS=sb_access
COOKIE_NAME_REFRESH=sb_refresh
COOKIE_SECURE=true
COOKIE_SAME_SITE=Lax
CORS_ORIGIN=https://app.нашдомен.ru
ALLOWED_ORIGINS=https://app.нашдомен.ru
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Шаг 6: Запуск через Docker

```bash
# Запустите через docker-compose
docker-compose up -d

# Проверьте логи
docker-compose logs -f

# Проверьте статус
docker-compose ps
```

### Шаг 7: Настройка Nginx (опционально)

```bash
# Установите Nginx
sudo apt install nginx -y

# Создайте конфигурацию
sudo nano /etc/nginx/sites-available/doirp-bff
```

Вставьте:
```nginx
server {
    listen 80;
    server_name api.нашдомен.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/doirp-bff /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Шаг 8: Настройка SSL (Let's Encrypt)

```bash
# Установите certbot
sudo apt install certbot python3-certbot-nginx -y

# Получите сертификат
sudo certbot --nginx -d api.нашдомен.ru

# Автоматическое обновление
sudo systemctl enable certbot.timer
```

### Шаг 9: Настройка автозапуска

```bash
# Создайте systemd service
sudo nano /etc/systemd/system/doirp-bff.service
```

Вставьте:
```ini
[Unit]
Description=DOIRP BFF Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/doirp-bff/bff
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Активируйте сервис
sudo systemctl daemon-reload
sudo systemctl enable doirp-bff
sudo systemctl start doirp-bff
```

## Мониторинг и логи

### Просмотр логов

```bash
# Docker Compose
docker-compose logs -f

# Systemd
sudo journalctl -u doirp-bff -f
```

### Health Check

```bash
curl https://api.нашдомен.ru/health
```

### Проверка работы

```bash
# Проверьте auth endpoint
curl -X POST https://api.нашдомен.ru/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sns.ru","password":"test123"}' \
  -c cookies.txt

# Проверьте /auth/me
curl https://api.нашдомен.ru/auth/me -b cookies.txt
```

## Обновление

```bash
# Остановите контейнер
docker-compose down

# Обновите код
git pull

# Пересоберите образ (если нужно)
docker-compose build

# Запустите заново
docker-compose up -d

# Проверьте логи
docker-compose logs -f
```

## Troubleshooting

### Проблема: Куки не устанавливаются

- Проверьте `COOKIE_DOMAIN` - должен быть `.нашдомен.ru` (с точкой)
- В production должен быть `COOKIE_SECURE=true`
- Проверьте, что запросы идут с правильного домена

### Проблема: CORS ошибки

- Проверьте `ALLOWED_ORIGINS` - должен содержать origin фронтенда
- Проверьте, что `credentials: 'include'` используется в fetch

### Проблема: Ошибки подключения к Supabase

- Проверьте `SUPABASE_URL` и ключи
- Проверьте доступность Supabase проекта
- Проверьте логи на наличие ошибок

### Проблема: Rate limiting

- Увеличьте `RATE_LIMIT_MAX_REQUESTS` и `RATE_LIMIT_WINDOW_MS`
- Или отключите rate limiting для тестирования

## Безопасность

1. **Не храните ключи в Git** - используйте `.env` файл
2. **Используйте HTTPS** - настройте SSL сертификат
3. **Регулярно обновляйте** - следите за обновлениями зависимостей
4. **Мониторинг** - настройте логирование и алерты
5. **Backup** - регулярно делайте бэкапы конфигурации

## Масштабирование

Для увеличения производительности:

1. **Увеличьте ресурсы VM** - больше CPU/RAM
2. **Используйте Load Balancer** - для распределения нагрузки
3. **Настройте кэширование** - Redis для сессий
4. **CDN** - для статических ресурсов

## Стоимость

Примерная стоимость на Яндекс Облаке:

- **VM (2 vCPU, 4GB RAM)**: ~1500 руб/месяц
- **Container Registry**: ~100 руб/месяц
- **Traffic**: ~1 руб/GB
- **Итого**: ~1600-2000 руб/месяц

