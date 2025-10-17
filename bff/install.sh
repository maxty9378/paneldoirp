#!/bin/bash
set -e

echo "🚀 Начинаем установку DOIRP BFF на VM..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${GREEN}ℹ${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    log_warn "Скрипт запущен без sudo. Некоторые команды могут требовать sudo."
fi

# Обновление системы
log_info "Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка Docker
log_info "Установка Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    log_info "Docker установлен"
else
    log_info "Docker уже установлен"
fi

# Добавление пользователя в группу docker
log_info "Добавление пользователя в группу docker..."
sudo usermod -aG docker $USER

# Установка docker-compose
log_info "Установка docker-compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log_info "docker-compose установлен"
else
    log_info "docker-compose уже установлен"
fi

# Создание директории для проекта
log_info "Создание директории проекта..."
mkdir -p ~/doirp-bff
cd ~/doirp-bff

# Создание .env файла
log_info "Создание .env файла..."
cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://oaockmesooydvausfoca.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE
SUPABASE_SERVICE_KEY=your_service_key_here

# Cookie Configuration
COOKIE_DOMAIN=.sns.ru
COOKIE_NAME_ACCESS=sb_access
COOKIE_NAME_REFRESH=sb_refresh
COOKIE_SECURE=true
COOKIE_SAME_SITE=Lax

# CORS Configuration
CORS_ORIGIN=https://app.sns.ru
ALLOWED_ORIGINS=https://app.sns.ru,http://localhost:5173

# Server Configuration
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

log_warn "⚠️  ВАЖНО: Отредактируйте .env файл и укажите SUPABASE_SERVICE_KEY!"
log_warn "⚠️  ВАЖНО: Проверьте COOKIE_DOMAIN и CORS_ORIGIN!"

# Создание docker-compose.yml
log_info "Создание docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  bff:
    image: node:20-alpine
    container_name: doirp-bff
    working_dir: /app
    volumes:
      - ./:/app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    restart: unless-stopped
    command: sh -c "npm install && npm run build && npm start"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
EOF

# Создание package.json
log_info "Создание package.json..."
cat > package.json << 'EOF'
{
  "name": "doirp-bff",
  "version": "1.0.0",
  "description": "Backend-for-Frontend для проксирования запросов к Supabase",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts"
  },
  "keywords": ["bff", "supabase", "proxy"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "http-proxy-middleware": "^2.0.6",
    "pino": "^8.17.2",
    "pino-pretty": "^10.3.1",
    "cookie-parser": "^1.4.6"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/cookie-parser": "^1.4.6",
    "@types/node": "^20.11.5",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
EOF

# Создание tsconfig.json
log_info "Создание tsconfig.json..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Создание директории src
log_info "Создание структуры проекта..."
mkdir -p src/middleware src/routes src/services src/utils

log_info "✅ Базовая структура создана!"
log_info "📝 Следующие шаги:"
log_info "   1. Отредактируйте ~/doirp-bff/.env и укажите SUPABASE_SERVICE_KEY"
log_info "   2. Скопируйте файлы из локальной директории bff/src/ в ~/doirp-bff/src/"
log_info "   3. Запустите: cd ~/doirp-bff && docker-compose up -d"
log_info ""
log_info "Для копирования файлов используйте:"
log_info "   scp -i /path/to/ssh-key -r bff/src/* doirp@51.250.94.103:~/doirp-bff/src/"

