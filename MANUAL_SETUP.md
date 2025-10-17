# 🔧 Ручная настройка HTTPS

Сервер требует специальной авторизации. Выполните следующие команды **вручную на сервере**:

## 📝 Команды для выполнения на сервере

### 1. Подключитесь к серверу

```bash
ssh -i src/ssh/ssh-key-doirp-01 root@51.250.94.103
```

### 2. Выполните эти команды по порядку:

```bash
# Обновление системы
apt-get update

# Установка Nginx
apt-get install -y nginx

# Установка Certbot
apt-get install -y certbot python3-certbot-nginx

# Создание директории для SSL
mkdir -p /etc/nginx/ssl

# Генерация самоподписанного сертификата
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/doirp.key \
  -out /etc/nginx/ssl/doirp.crt \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=SNS/CN=51.250.94.103"

# Создание конфигурации Nginx
cat > /etc/nginx/sites-available/doirp << 'EOF'
# HTTP - редирект на HTTPS
server {
    listen 80;
    server_name 51.250.94.103;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name 51.250.94.103;

    # SSL сертификаты
    ssl_certificate /etc/nginx/ssl/doirp.crt;
    ssl_certificate_key /etc/nginx/ssl/doirp.key;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /var/www/html;
    index index.html;

    # Логи
    access_log /var/log/nginx/doirp_access.log;
    error_log /var/log/nginx/doirp_error.log;

    # Основная конфигурация
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Активация конфигурации
ln -sf /etc/nginx/sites-available/doirp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
nginx -t

# Перезапуск Nginx
systemctl restart nginx
systemctl enable nginx

# Настройка firewall
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable

# Проверка статуса
systemctl status nginx
```

### 3. Деплой приложения

```bash
# С локального компьютера
npm run build

# Копирование файлов
scp -i src/ssh/ssh-key-doirp-01 -r dist/* root@51.250.94.103:/var/www/html/

# Настройка прав
ssh -i src/ssh/ssh-key-doirp-01 root@51.250.94.103 "chown -R www-data:www-data /var/www/html && chmod -R 755 /var/www/html"

# Перезапуск Nginx
ssh -i src/ssh/ssh-key-doirp-01 root@51.250.94.103 "systemctl restart nginx"
```

## ✅ Готово!

После выполнения команд:
- 🌐 Сайт доступен: **https://51.250.94.103**
- 📱 Камера QR-сканер работает!
- 🔒 HTTPS включен

## ⚠️ Важно

Браузер покажет предупреждение о самоподписанном сертификате. Это нормально! Нажмите:
- **"Дополнительно"** → **"Перейти на сайт"**

