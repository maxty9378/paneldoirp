#!/bin/bash

# Скрипт для настройки автоматического обновления через cron
# Запустите этот скрипт на виртуальной машине

echo "⏰ Настраиваем автоматическое обновление через cron..."

# Создаем директорию для скриптов
mkdir -p ~/scripts

# Копируем скрипт обновления
cp ~/auto-update.sh ~/scripts/
chmod +x ~/scripts/auto-update.sh

# Создаем cron задачу для проверки обновлений каждые 5 минут
echo "📅 Создаем cron задачу..."
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/scripts/auto-update.sh >> /var/log/auto-update.log 2>&1") | crontab -

# Создаем cron задачу для ежедневного обновления в 3:00
(crontab -l 2>/dev/null; echo "0 3 * * * ~/scripts/auto-update.sh >> /var/log/auto-update.log 2>&1") | crontab -

# Создаем cron задачу для еженедельного обновления в воскресенье в 2:00
(crontab -l 2>/dev/null; echo "0 2 * * 0 ~/scripts/auto-update.sh >> /var/log/auto-update.log 2>&1") | crontab -

# Создаем лог файл
sudo touch /var/log/auto-update.log
sudo chown doirp777:doirp777 /var/log/auto-update.log

echo "✅ Автоматическое обновление настроено!"
echo "📋 Настроенные задачи:"
echo "   - Проверка обновлений каждые 5 минут"
echo "   - Ежедневное обновление в 3:00"
echo "   - Еженедельное обновление в воскресенье в 2:00"
echo "📝 Логи: /var/log/auto-update.log"
echo "🔧 Для просмотра cron задач: crontab -l"
echo "🔧 Для редактирования cron задач: crontab -e"
