#!/bin/bash

# Скрипт для настройки HTTPS с Let's Encrypt для домена
# Использование: sudo bash setup-https-letsencrypt-with-domain.sh yourdomain.ru

set -e

echo "🔒 Настройка HTTPS с Let's Encrypt для домена"
echo "=============================================="

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка root прав
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Запустите скрипт с sudo${NC}"
    exit 1
fi

# Проверка аргументов
if [ -z "$1" ]; then
    echo -e "${RED}❌ Укажите домен!${NC}"
    echo "Использование: sudo bash setup-https-letsencrypt-with-domain.sh yourdomain.ru"
    exit 1
fi

# Переменные
DOMAIN="$1"
EMAIL="admin@sns.ru"
WEB_ROOT="/var/www/html"

echo -e "${BLUE}📋 Параметры:${NC}"
echo "  Домен: $DOMAIN"
echo "  Email: $EMAIL"
echo "  Web Root: $WEB_ROOT"
echo ""

# Шаг 1: Установка Certbot
echo -e "${GREEN}1️⃣ Установка Certbot...${NC}"
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Шаг 2: Настройка Nginx
echo -e "${GREEN}2️⃣ Настройка Nginx...${NC}"

# Создаем конфигурацию Nginx для HTTP (временную)
cat > /etc/nginx/sites-available/doirp << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Web root
    root $WEB_ROOT;
    index index.html;

    # Логи
    access_log /var/log/nginx/doirp_access.log;
    error_log /var/log/nginx/doirp_error.log;

    # Основная конфигурация
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Активируем конфигурацию
ln -sf /etc/nginx/sites-available/doirp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
nginx -t

# Перезапускаем Nginx
systemctl restart nginx

# Шаг 3: Проверка DNS
echo -e "${GREEN}3️⃣ Проверка DNS...${NC}"
echo -e "${YELLOW}⚠️  Убедитесь, что домен $DOMAIN указывает на этот сервер!${NC}"
echo ""
echo "Выполните команду на локальном компьютере:"
echo -e "${BLUE}nslookup $DOMAIN${NC}"
echo ""
echo "IP адрес должен совпадать с IP этого сервера."
echo ""
read -p "DNS настроен правильно? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Настройте DNS и запустите скрипт снова${NC}"
    exit 1
fi

# Шаг 4: Получение SSL-сертификата
echo -e "${GREEN}4️⃣ Получение SSL-сертификата...${NC}"

# Получаем сертификат
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Шаг 5: Настройка автообновления
echo -e "${GREEN}5️⃣ Настройка автообновления сертификата...${NC}"

# Добавляем cron задачу для автообновления
(crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# Шаг 6: Проверка
echo -e "${GREEN}6️⃣ Проверка HTTPS...${NC}"
systemctl status nginx --no-pager
certbot certificates

echo ""
echo -e "${GREEN}✅ HTTPS успешно настроен!${NC}"
echo ""
echo -e "${BLUE}🌐 Ваш сайт доступен по адресу:${NC}"
echo -e "   ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${BLUE}📝 Полезные команды:${NC}"
echo "   Просмотр сертификатов: certbot certificates"
echo "   Обновление сертификата: certbot renew"
echo "   Проверка конфигурации Nginx: nginx -t"
echo "   Перезапуск Nginx: systemctl restart nginx"
echo "   Логи Nginx: tail -f /var/log/nginx/doirp_error.log"
echo ""

