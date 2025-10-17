#!/bin/bash

# Полная автоматическая настройка HTTPS для DOIRP
# Запустите на сервере: sudo bash setup-full-https.sh

set -e

echo "🔒 Полная настройка HTTPS для DOIRP"
echo "===================================="

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверка root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Запустите с sudo${NC}"
    exit 1
fi

# Переменные
DOMAIN="51.250.94.103"
WEB_ROOT="/var/www/html"
EMAIL="admin@sns.ru"

echo -e "${BLUE}📋 Параметры:${NC}"
echo "  Домен/IP: $DOMAIN"
echo "  Web Root: $WEB_ROOT"
echo ""

# Шаг 1: Установка Nginx
echo -e "${GREEN}1️⃣ Установка Nginx...${NC}"
apt-get update
apt-get install -y nginx

# Шаг 2: Установка Certbot
echo -e "${GREEN}2️⃣ Установка Certbot...${NC}"
apt-get install -y certbot python3-certbot-nginx

# Шаг 3: Настройка Nginx
echo -e "${GREEN}3️⃣ Настройка Nginx...${NC}"

# Создаем конфигурацию
cat > /etc/nginx/sites-available/doirp << 'EOF'
server {
    listen 80;
    server_name 51.250.94.103;

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

# Активируем
ln -sf /etc/nginx/sites-available/doirp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверяем
nginx -t

# Перезапускаем
systemctl restart nginx
systemctl enable nginx

# Шаг 4: Настройка Firewall
echo -e "${GREEN}4️⃣ Настройка Firewall...${NC}"
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable

# Шаг 5: Получение SSL-сертификата
echo -e "${GREEN}5️⃣ Получение SSL-сертификата...${NC}"
echo -e "${YELLOW}⚠️  Для Let's Encrypt нужен домен!${NC}"
echo -e "${BLUE}Создаем самоподписанный сертификат...${NC}"

# Создаем директорию для сертификатов
mkdir -p /etc/nginx/ssl

# Генерируем самоподписанный сертификат
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/doirp.key \
  -out /etc/nginx/ssl/doirp.crt \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=SNS/CN=51.250.94.103"

# Шаг 6: Настройка HTTPS в Nginx
echo -e "${GREEN}6️⃣ Настройка HTTPS...${NC}"

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

# Проверяем
nginx -t

# Перезапускаем
systemctl restart nginx

# Шаг 7: Проверка
echo -e "${GREEN}7️⃣ Проверка...${NC}"
systemctl status nginx --no-pager | head -10

echo ""
echo -e "${GREEN}✅ HTTPS настроен!${NC}"
echo ""
echo -e "${BLUE}🌐 Ваш сайт доступен:${NC}"
echo -e "   ${GREEN}https://51.250.94.103${NC}"
echo ""
echo -e "${YELLOW}⚠️  Браузер покажет предупреждение о самоподписанном сертификате${NC}"
echo -e "   Это нормально! Нажмите 'Продолжить' или 'Advanced -> Proceed'"
echo ""
echo -e "${BLUE}📝 Следующие шаги:${NC}"
echo "   1. Скопируйте файлы приложения в /var/www/html/"
echo "   2. Для Let's Encrypt (без предупреждения):"
echo "      - Купите домен"
echo "      - Настройте DNS: domain.com -> 51.250.94.103"
echo "      - Запустите: certbot --nginx -d domain.com"
echo ""

