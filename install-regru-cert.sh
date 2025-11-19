#!/bin/bash

# Скрипт для установки готового сертификата от reg.ru
# Использование: 
# 1. Загрузите файлы на сервер в /tmp/
# 2. Запустите: sudo bash install-regru-cert.sh

set -e

DOMAIN="doirp.ru"
CERT_DIR="/etc/ssl/certs/${DOMAIN}"

# Для обычного nginx (если нужно)
NGINX_CERT_DIR="/etc/nginx/ssl/${DOMAIN}"

echo "🔒 Установка сертификата от reg.ru для ${DOMAIN}..."
echo ""

# Проверяем наличие файлов
CERT_FILE="/tmp/${DOMAIN}.crt"
KEY_FILE="/tmp/${DOMAIN}.key"
CHAIN_FILE="/tmp/${DOMAIN}.chain.crt"

if [ ! -f "$CERT_FILE" ] && [ ! -f "/tmp/${DOMAIN}.fullchain.crt" ]; then
    echo "❌ Сертификат не найден в /tmp/${DOMAIN}.crt"
    echo ""
    echo "📋 Сначала загрузите файлы на сервер:"
    echo "   scp -i src/ssh/ssh-key-doirp-01 путь/к/сертификату.crt doirp@51.250.94.103:/tmp/${DOMAIN}.crt"
    echo "   scp -i src/ssh/ssh-key-doirp-01 путь/к/ключу.key doirp@51.250.94.103:/tmp/${DOMAIN}.key"
    echo ""
    echo "   Если есть цепочка сертификатов:"
    echo "   scp -i src/ssh/ssh-key-doirp-01 путь/к/цепочке.crt doirp@51.250.94.103:/tmp/${DOMAIN}.chain.crt"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Приватный ключ не найден в /tmp/${DOMAIN}.key"
    exit 1
fi

echo "✅ Файлы найдены"
echo ""

# Создаем директории
echo "📁 Создаем директории..."
sudo mkdir -p "$CERT_DIR"
sudo mkdir -p "$NGINX_CERT_DIR"

# Обрабатываем сертификат
if [ -f "/tmp/${DOMAIN}.fullchain.crt" ]; then
    echo "📜 Используем готовый fullchain сертификат..."
    sudo cp "/tmp/${DOMAIN}.fullchain.crt" "$CERT_DIR/fullchain.pem"
elif [ -f "$CHAIN_FILE" ]; then
    echo "📜 Объединяем сертификат с цепочкой..."
    sudo cat "$CERT_FILE" "$CHAIN_FILE" > "$CERT_DIR/fullchain.pem"
else
    echo "📜 Копируем сертификат..."
    sudo cp "$CERT_FILE" "$CERT_DIR/fullchain.pem"
fi

# Копируем ключ
echo "🔐 Копируем приватный ключ..."
sudo cp "$KEY_FILE" "$CERT_DIR/privkey.pem"

# Копируем также для обычного nginx (если используется)
sudo cp "$CERT_DIR/fullchain.pem" "$NGINX_CERT_DIR/${DOMAIN}.crt"
sudo cp "$KEY_FILE" "$NGINX_CERT_DIR/${DOMAIN}.key"

# Устанавливаем права доступа
echo "🔐 Устанавливаем права доступа..."
sudo chmod 644 "$CERT_DIR/fullchain.pem"
sudo chmod 644 "$NGINX_CERT_DIR/${DOMAIN}.crt"
sudo chmod 600 "$CERT_DIR/privkey.pem"
sudo chmod 600 "$NGINX_CERT_DIR/${DOMAIN}.key"
sudo chown root:root "$CERT_DIR"/*
sudo chown root:root "$NGINX_CERT_DIR"/*

echo ""
echo "✅ Сертификат установлен!"
echo ""
echo "📍 Расположение файлов:"
echo "   Для Docker: $CERT_DIR/"
echo "     - fullchain.pem"
echo "     - privkey.pem"
echo ""
echo "   Для обычного nginx: $NGINX_CERT_DIR/"
echo "     - ${DOMAIN}.crt"
echo "     - ${DOMAIN}.key"
echo ""
echo "✅ Теперь можно запустить setup-domain-ssl.sh или setup-regru-ssl.sh"

