#!/bin/bash

# Скрипт для деплоя приложения на сервер
# Запустите локально: bash deploy-to-server.sh

set -e

echo "🚀 Деплой DOIRP на сервер"
echo "========================"

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Переменные
SERVER="root@51.250.94.103"
WEB_ROOT="/var/www/html"

echo -e "${BLUE}📋 Параметры:${NC}"
echo "  Сервер: $SERVER"
echo "  Web Root: $WEB_ROOT"
echo ""

# Шаг 1: Сборка приложения
echo -e "${GREEN}1️⃣ Сборка приложения...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Папка dist не найдена!${NC}"
    exit 1
fi

# Шаг 2: Копирование на сервер
echo -e "${GREEN}2️⃣ Копирование на сервер...${NC}"
scp -r dist/* $SERVER:$WEB_ROOT/

# Шаг 3: Настройка прав
echo -e "${GREEN}3️⃣ Настройка прав...${NC}"
ssh $SERVER "chown -R www-data:www-data $WEB_ROOT && chmod -R 755 $WEB_ROOT"

# Шаг 4: Перезапуск Nginx
echo -e "${GREEN}4️⃣ Перезапуск Nginx...${NC}"
ssh $SERVER "systemctl restart nginx"

echo ""
echo -e "${GREEN}✅ Деплой завершен!${NC}"
echo ""
echo -e "${BLUE}🌐 Откройте в браузере:${NC}"
echo -e "   ${GREEN}https://51.250.94.103${NC}"
echo ""

