#!/bin/bash
# Скрипт для миграции данных на Яндекс.Облако Supabase

set -e

echo "📦 Начинаем миграцию данных..."

# Экспортируем данные из текущего Supabase
echo "📤 Экспортируем данные из текущего Supabase..."
supabase db dump -f backup.sql --project-ref oaockmesooydvausfoca

if [ ! -f "backup.sql" ]; then
    echo "❌ Ошибка: не удалось создать backup.sql"
    exit 1
fi

echo "✅ Данные экспортированы: backup.sql"
echo "📊 Размер файла: $(du -h backup.sql | cut -f1)"

# Загружаем на ВМ
echo "📤 Загружаем backup.sql на ВМ..."
scp -i src/ssh/ssh-key-doirp-01 -o StrictHostKeyChecking=no backup.sql doirp@51.250.94.103:~/supabase/

echo "✅ Файл загружен"
echo ""
echo "📥 Теперь импортируем данные на новый сервер..."
echo "Выполните на ВМ:"
echo "  cd ~/supabase"
echo "  supabase db reset"
echo "  psql -h localhost -U postgres -d postgres -f backup.sql"

