#!/bin/bash
set -e

echo "🧹 Очищаем старый проект..."
cd ~
rm -rf supabase
mkdir supabase
cd supabase

echo "🔧 Инициализируем Supabase..."
supabase init

echo "⚙️ Настраиваем config.toml..."
# Изменяем порт API на 8000
sed -i 's/port = 54321/port = 8000/' supabase/config.toml

echo "🔑 Генерируем ключи..."
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 32)
ANON_KEY=$(openssl rand -base64 32 | tr -d "=+/")
SERVICE_ROLE_KEY=$(openssl rand -base64 32 | tr -d "=+/")

cat > .env << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
API_URL=http://51.250.94.103:8000
SITE_URL=http://51.250.94.103:3000
EOF

echo "✅ Конфигурация создана"
echo ""
echo "📋 Ключи:"
echo "ANON_KEY=$ANON_KEY"
echo "SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo ""

echo "🚀 Запускаем Supabase..."
supabase start

echo ""
echo "✅ Готово!"
echo "API URL: http://51.250.94.103:8000"

