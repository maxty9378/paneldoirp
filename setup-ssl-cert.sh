#!/bin/bash
set -e

DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo "Использование: $0 <your-domain.com>"
    echo "Пример: $0 api.doirp.ru"
    exit 1
fi

echo "🔒 Получаем SSL сертификат для $DOMAIN..."

# Получаем сертификат
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# Настраиваем автообновление
echo "⚙️ Настраиваем автообновление сертификата..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo ""
echo "✅ SSL сертификат установлен!"
echo "🌐 Ваш домен доступен по адресу: https://$DOMAIN"
echo ""
echo "📋 Обновите конфигурацию Supabase:"
echo "   cd ~/supabase"
echo "   # В .env измените:"
echo "   # API_URL=https://$DOMAIN"
echo "   # SITE_URL=https://$DOMAIN"
echo "   supabase stop && supabase start"

