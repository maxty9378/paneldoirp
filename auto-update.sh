#!/bin/bash

# Скрипт автоматического обновления проекта с GitHub
# Запустите этот скрипт на виртуальной машине

echo "🔄 Начинаем автоматическое обновление проекта с GitHub..."

# Переходим в директорию проекта
cd ~/paneldoirp

# Сохраняем текущий коммит
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "📝 Текущий коммит: $CURRENT_COMMIT"

# Получаем последние изменения
echo "📥 Получаем последние изменения с GitHub..."
git fetch origin

# Проверяем, есть ли новые коммиты
LATEST_COMMIT=$(git rev-parse origin/main)
echo "📝 Последний коммит на GitHub: $LATEST_COMMIT"

if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
    echo "✅ Проект уже актуален, обновление не требуется"
    exit 0
fi

echo "🔄 Обнаружены новые изменения, начинаем обновление..."

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app
sudo docker rm doirp-app

# Переключаемся на последнюю версию
echo "📥 Переключаемся на последнюю версию..."
git reset --hard origin/main
git pull origin main

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
    echo "🎉 Обновление успешно завершено!"
    echo "🌐 Приложение доступно по адресу: https://158.160.200.214"
    echo "📝 Новый коммит: $LATEST_COMMIT"
else
    echo "❌ Ошибка при запуске контейнера"
    echo "🔄 Пытаемся восстановить предыдущую версию..."
    git reset --hard $CURRENT_COMMIT
    sudo docker run -d \
        --name doirp-app \
        -p 80:80 \
        -p 443:443 \
        -v /etc/ssl/certs/doirp:/etc/ssl/certs/doirp:ro \
        --restart unless-stopped \
        doirp-app:latest
    echo "🔄 Восстановлена предыдущая версия"
fi

echo "✅ Скрипт обновления завершен"
