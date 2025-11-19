#!/bin/bash
set -e

DOMAIN="doirp.ru"
SUPABASE_PORT=8000

echo "🌐 Настраиваем Nginx для домена $DOMAIN..."

# Устанавливаем Nginx если не установлен
if ! command -v nginx &> /dev/null; then
    echo "📦 Устанавливаем Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Создаем конфигурацию для основного домена
echo "⚙️ Создаем конфигурацию Nginx..."
sudo tee /etc/nginx/sites-available/doirp.ru > /dev/null <<EOF
# HTTP - редирект на HTTPS (после получения SSL)
server {
    listen 80;
    server_name doirp.ru www.doirp.ru;

    # Временно проксируем на Supabase (до получения SSL)
    location / {
        proxy_pass http://localhost:$SUPABASE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
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
sudo ln -sf /etc/nginx/sites-available/doirp.ru /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
echo "✅ Проверяем конфигурацию Nginx..."
sudo nginx -t

# Перезапускаем Nginx
echo "🔄 Перезапускаем Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "✅ Nginx настроен для $DOMAIN!"
echo ""
echo "🌐 Проверьте доступность:"
echo "   http://doirp.ru"
echo "   http://www.doirp.ru"
echo ""
echo "📋 Для получения SSL сертификата (HTTPS):"
echo "   sudo apt install -y certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d doirp.ru -d www.doirp.ru"
echo ""
echo "⚠️  Убедитесь, что порты 80 и 443 открыты в файрволе Яндекс.Облако!"

