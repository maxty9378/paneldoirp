#!/bin/bash
set -e

DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo "Использование: $0 <your-domain.com>"
    echo "Пример: $0 api.doirp.ru"
    exit 1
fi

echo "🌐 Настраиваем домен $DOMAIN для Supabase..."

# Устанавливаем Nginx
echo "📦 Устанавливаем Nginx..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Создаем конфигурацию Nginx для Supabase API
echo "⚙️ Создаем конфигурацию Nginx..."
sudo tee /etc/nginx/sites-available/supabase-api > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Логи
    access_log /var/log/nginx/supabase-api-access.log;
    error_log /var/log/nginx/supabase-api-error.log;

    # Увеличиваем размер загружаемых файлов
    client_max_body_size 50M;

    # Проксируем запросы к Supabase API
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Таймауты для долгих запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Активируем конфигурацию
echo "🔗 Активируем конфигурацию..."
sudo ln -sf /etc/nginx/sites-available/supabase-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
echo "✅ Проверяем конфигурацию Nginx..."
sudo nginx -t

# Перезапускаем Nginx
echo "🔄 Перезапускаем Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "✅ Nginx настроен!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Настройте DNS записи у регистратора домена:"
echo "   Тип: A"
echo "   Имя: @ (или поддомен)"
echo "   Значение: 51.250.94.103"
echo ""
echo "2. Подождите 5-10 минут для распространения DNS"
echo ""
echo "3. Получите SSL сертификат:"
echo "   sudo certbot --nginx -d $DOMAIN"
echo ""
echo "4. Обновите SITE_URL в Supabase:"
echo "   cd ~/supabase"
echo "   supabase stop"
echo "   # Отредактируйте .env: SITE_URL=https://$DOMAIN"
echo "   supabase start"

