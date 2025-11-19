#!/bin/bash
# Скрипт для настройки DomainSSL сертификата от reg.ru
# Использование: bash setup-regru-ssl.sh

set -e

CERT_DIR="/etc/nginx/ssl/doirp.ru"
CERT_FILE="$CERT_DIR/doirp.ru.crt"
KEY_FILE="$CERT_DIR/doirp.ru.key"

echo "🔒 Настройка DomainSSL сертификата от reg.ru"
echo "=============================================="
echo ""

# Проверяем наличие файлов
if [ ! -f "$CERT_FILE" ]; then
    echo "❌ Сертификат не найден: $CERT_FILE"
    echo ""
    echo "📋 Сначала загрузите сертификат на сервер:"
    echo "   scp -i src/ssh/ssh-key-doirp-01 путь/к/сертификату.crt doirp@51.250.94.103:/tmp/doirp.ru.crt"
    echo "   scp -i src/ssh/ssh-key-doirp-01 путь/к/ключу.key doirp@51.250.94.103:/tmp/doirp.ru.key"
    echo ""
    echo "Затем переместите файлы:"
    echo "   sudo mv /tmp/doirp.ru.crt $CERT_FILE"
    echo "   sudo mv /tmp/doirp.ru.key $KEY_FILE"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Приватный ключ не найден: $KEY_FILE"
    exit 1
fi

echo "✅ Сертификат и ключ найдены"
echo ""

# Устанавливаем права доступа
echo "🔐 Устанавливаем права доступа..."
sudo chmod 644 "$CERT_FILE"
sudo chmod 600 "$KEY_FILE"
sudo chown root:root "$CERT_FILE" "$KEY_FILE"

echo "✅ Права доступа установлены"
echo ""

# Обновляем конфигурацию Nginx
echo "⚙️  Обновляем конфигурацию Nginx..."

sudo tee /etc/nginx/sites-available/doirp.ru > /dev/null <<'EOF'
# HTTP - редирект на HTTPS
server {
    listen 80;
    server_name doirp.ru www.doirp.ru;

    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/doirp;
        default_type text/plain;
    }

    # Редирект на HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name doirp.ru www.doirp.ru;

    # SSL сертификат от reg.ru
    ssl_certificate /etc/nginx/ssl/doirp.ru/doirp.ru.crt;
    ssl_certificate_key /etc/nginx/ssl/doirp.ru/doirp.ru.key;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5:!RC4;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    root /var/www/doirp;
    index index.html;

    # Логи
    access_log /var/log/nginx/doirp.ru-access.log;
    error_log /var/log/nginx/doirp.ru-error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Статические файлы
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service Worker
    location = /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
}
EOF

echo "✅ Конфигурация обновлена"
echo ""

# Проверяем конфигурацию
echo "🔍 Проверяем конфигурацию Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Конфигурация корректна"
    echo ""
    echo "🔄 Перезагружаем Nginx..."
    sudo systemctl reload nginx
    echo ""
    echo "✅ Готово! HTTPS настроен"
    echo ""
    echo "🌐 Проверьте:"
    echo "   https://doirp.ru"
    echo "   https://www.doirp.ru"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

