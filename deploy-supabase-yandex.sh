#!/bin/bash
# Скрипт для развертывания self-hosted Supabase на Яндекс.Облако ВМ
# Выполните на ВМ: ssh -l doirp 51.250.94.103

set -e

echo "🚀 Начинаем развертывание Supabase на Яндекс.Облако..."

# Обновляем систему
echo "📦 Обновляем систему..."
sudo apt update && sudo apt upgrade -y

# Устанавливаем Docker
echo "🐳 Устанавливаем Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Устанавливаем Docker Compose
echo "🐳 Устанавливаем Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Устанавливаем Supabase CLI
echo "📦 Устанавливаем Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.deb -o supabase.deb
    sudo dpkg -i supabase.deb || sudo apt-get install -f -y
    rm supabase.deb
fi

# Создаем директорию для Supabase
echo "📁 Создаем директорию для Supabase..."
mkdir -p ~/supabase
cd ~/supabase

# Инициализируем Supabase проект
echo "🔧 Инициализируем Supabase проект..."
supabase init

# Настраиваем переменные окружения
echo "⚙️ Настраиваем переменные окружения..."
cat > .env << EOF
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=$(openssl rand -base64 32)
ANON_KEY=$(openssl rand -base64 32)
SERVICE_ROLE_KEY=$(openssl rand -base64 32)
API_URL=http://51.250.94.103:8000
SITE_URL=http://51.250.94.103:3000
EOF

# Настраиваем config.toml для production
cat >> supabase/config.toml << EOF

[api]
enabled = true
port = 8000
schemas = ["public", "storage", "graphql_public"]

[db]
port = 5432
major_version = 15

[auth]
enabled = true
site_url = "http://51.250.94.103:3000"
additional_redirect_urls = ["http://51.250.94.103:3000/**"]
EOF

# Запускаем Supabase
echo "🚀 Запускаем Supabase..."
supabase start

echo "✅ Supabase развернут!"
echo ""
echo "📋 Информация для подключения:"
echo "API URL: http://51.250.94.103:8000"
echo "Studio URL: http://51.250.94.103:54323"
echo ""
echo "🔑 Ключи находятся в файле ~/supabase/.env"
echo ""
echo "⚠️  ВАЖНО:"
echo "1. Настройте файрвол в Яндекс.Облако для открытия портов: 8000, 54323"
echo "2. Измените пароли в .env файле"
echo "3. Настройте домен и SSL сертификат (рекомендуется)"

