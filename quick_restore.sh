#!/bin/bash

# Быстрый скрипт восстановления базы данных
# Запустите в терминале: bash quick_restore.sh

echo "🚀 Начинаем восстановление базы данных..."

# Переходим в каталог проекта
cd "C:\Users\Home K\Downloads\sns-panel\project"

echo "📁 Перешли в каталог проекта: $(pwd)"

# Проверяем подключение к Supabase
echo "🔍 Проверяем подключение к Supabase..."
supabase status

# Применяем миграции
echo "📦 Применяем миграции..."
supabase db push

# Развертываем Edge Functions
echo "⚡ Развертываем Edge Functions..."
supabase functions deploy

# Проверяем статус функций
echo "📊 Проверяем статус Edge Functions..."
supabase functions list

echo "✅ Восстановление завершено!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Запустите check_missing_functions.sql в Supabase SQL Editor"
echo "2. Запустите restore_missing_functions.sql в Supabase SQL Editor"
echo "3. Проверьте работоспособность через тесты в браузере"
echo ""
echo "🔗 Полезные ссылки:"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- SQL Editor: https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql"
echo "- Edge Functions: https://supabase.com/dashboard/project/[YOUR_PROJECT]/functions"
