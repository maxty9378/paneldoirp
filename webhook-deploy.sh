#!/bin/bash

# Webhook скрипт для автоматического деплоя при получении push от GitHub
# Настройте webhook в GitHub: https://github.com/maxty9378/paneldoirp/settings/hooks

echo "🎣 Получен webhook от GitHub, начинаем автоматический деплой..."

# Логируем событие
echo "$(date): Webhook получен" >> /var/log/auto-deploy.log

# Переходим в директорию проекта
cd ~/paneldoirp

# Получаем последние изменения
echo "📥 Получаем последние изменения..."
git pull origin main

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app
sudo docker rm doirp-app

# Собираем новый образ
echo "🔨 Собираем новый Docker образ..."
sudo docker build -t doirp-app:latest .

# Запускаем обновленный контейнер
echo "🚀 Запускаем обновленный контейнер..."
sudo docker run -d \
    --name doirp-app \
    -p 80:80 \
    -p 443:443 \
    -v /etc/ssl/certs/doirp:/etc/ssl/certs/doirp:ro \
    --restart unless-stopped \
    doirp-app:latest

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
if sudo docker ps | grep -q doirp-app; then
    echo "🎉 Автоматический деплой успешно завершен!"
    echo "$(date): Деплой успешен" >> /var/log/auto-deploy.log
else
    echo "❌ Ошибка при автоматическом деплое"
    echo "$(date): Ошибка деплоя" >> /var/log/auto-deploy.log
fi
