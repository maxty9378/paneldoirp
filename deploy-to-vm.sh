#!/bin/bash

# Скрипт для деплоя на виртуальную машину
# Запустите этот скрипт на виртуальной машине

echo "🚀 Начинаем деплой DOIRP приложения..."

# Обновляем систему
echo "📦 Обновляем систему..."
sudo apt update

# Устанавливаем необходимые пакеты
echo "🔧 Устанавливаем Node.js, npm и Docker..."
sudo apt install -y nodejs npm docker.io

# Добавляем пользователя в группу docker
echo "👤 Добавляем пользователя в группу docker..."
sudo usermod -aG docker $USER

# Запускаем Docker
echo "🐳 Запускаем Docker..."
sudo systemctl start docker
sudo systemctl enable docker

# Клонируем репозиторий (если еще не клонирован)
if [ ! -d "paneldoirp" ]; then
    echo "📥 Клонируем репозиторий..."
    git clone https://github.com/maxty9378/paneldoirp.git
fi

cd paneldoirp

# Создаем Dockerfile
echo "📝 Создаем Dockerfile..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Создаем nginx.conf
echo "📝 Создаем nginx.conf..."
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen       80;
        server_name  localhost;
        root         /usr/share/nginx/html;
        index        index.html;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Останавливаем старый контейнер
echo "🛑 Останавливаем старый контейнер..."
sudo docker stop doirp-app 2>/dev/null || true
sudo docker rm doirp-app 2>/dev/null || true

# Собираем новый образ
echo "🔨 Собираем Docker образ..."
sudo docker build -t doirp-app:latest .

# Запускаем контейнер
echo "🚀 Запускаем приложение..."
sudo docker run -d \
    --name doirp-app \
    -p 80:80 \
    --restart unless-stopped \
    doirp-app:latest

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
sudo docker ps | grep doirp-app

echo "🎉 Деплой завершен!"
echo "🌐 Приложение доступно по адресу: http://158.160.200.214"
