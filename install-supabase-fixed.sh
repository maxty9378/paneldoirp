#!/bin/bash
set -e

echo "🚀 Установка Supabase на Яндекс.Облако ВМ (исправленная версия)..."

# Проверяем Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    exit 1
fi

# Устанавливаем Docker Compose если нужно
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Устанавливаем Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Устанавливаем Supabase CLI через прямой бинарник
if ! command -v supabase &> /dev/null; then
    echo "📦 Устанавливаем Supabase CLI..."
    # Получаем последнюю версию
    LATEST_TAG=$(curl -s https://api.github.com/repos/supabase/cli/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    VERSION=${LATEST_TAG#v}
    
    # Скачиваем и устанавливаем
    curl -fsSL "https://github.com/supabase/cli/releases/download/${LATEST_TAG}/supabase_${VERSION}_linux_amd64.deb" -o /tmp/supabase.deb
    sudo dpkg -i /tmp/supabase.deb 2>&1 || sudo apt-get install -f -y
    rm /tmp/supabase.deb
    echo "✅ Supabase CLI установлен: $(supabase --version)"
fi

# Создаем директорию
mkdir -p ~/supabase
cd ~/supabase

# Инициализируем проект если нужно
if [ ! -f "supabase/config.toml" ]; then
    echo "🔧 Инициализируем Supabase проект..."
    supabase init
fi

# Генерируем пароли
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 32)
ANON_KEY=$(openssl rand -base64 32 | tr -d "=+/")
SERVICE_ROLE_KEY=$(openssl rand -base64 32 | tr -d "=+/")

# Создаем .env файл
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
echo "📋 Ключи для подключения:"
echo "ANON_KEY=$ANON_KEY"
echo "SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo ""

# Обновляем config.toml для production
if ! grep -q "port = 8000" supabase/config.toml 2>/dev/null; then
    echo "🔧 Настраиваем config.toml..."
    cat >> supabase/config.toml << 'EOF'

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
fi

echo "🚀 Запускаем Supabase..."
supabase start

echo ""
echo "✅ Supabase развернут!"
echo "API URL: http://51.250.94.103:8000"
echo "Studio URL: http://51.250.94.103:54323"
echo ""
echo "📋 Сохраните ключи из файла ~/supabase/.env"

