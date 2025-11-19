#!/bin/bash

# Скрипт для ручного деплоя на Yandex VM
# Использование: ./manual-deploy.sh

echo "🚀 Начинаем ручной деплой на Yandex VM..."

# Параметры подключения
SERVER_HOST="51.250.94.103"
SERVER_USER="doirp"
DEPLOY_PATH="/var/www/doirp"
ARCHIVE="doirp-deploy.tar.gz"

# Проверяем наличие архива
if [ ! -f "$ARCHIVE" ]; then
    echo "❌ Архив $ARCHIVE не найден!"
    exit 1
fi

echo "📦 Архив найден: $ARCHIVE"
echo "📊 Размер архива: $(du -h $ARCHIVE | cut -f1)"

# Загружаем архив на сервер
echo "📤 Загружаем архив на сервер..."
scp $ARCHIVE $SERVER_USER@$SERVER_HOST:/tmp/

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при загрузке архива!"
    exit 1
fi

echo "✅ Архив загружен на сервер"

# Подключаемся к серверу и выполняем деплой
echo "🔧 Выполняем деплой на сервере..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
    echo "🧹 Очищаем старую версию..."
    sudo rm -rf /var/www/doirp/*
    sudo rm -rf /var/www/doirp/.* 2>/dev/null || true
    
    echo "📦 Распаковываем новую версию..."
    cd /tmp
    sudo tar -xzf doirp-deploy.tar.gz -C /var/www/doirp/
    
    echo "🔒 Устанавливаем права доступа..."
    sudo chown -R www-data:www-data /var/www/doirp/
    sudo chmod -R 755 /var/www/doirp/
    
    echo "🔄 Перезагружаем Nginx..."
    sudo systemctl reload nginx
    
    echo "🧹 Очищаем временные файлы..."
    rm -f /tmp/doirp-deploy.tar.gz
    
    echo "✅ Деплой завершен успешно!"
ENDSSH

if [ $? -eq 0 ]; then
    echo "🎉 Деплой выполнен успешно!"
    echo "🌐 Приложение доступно по адресу: https://$SERVER_HOST"
else
    echo "❌ Ошибка при выполнении деплоя!"
    exit 1
fi

