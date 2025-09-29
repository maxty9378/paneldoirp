#!/bin/bash

# Скрипт для настройки HTTP доступа (временное решение)
# Запустите этот скрипт на виртуальной машине

echo "🌐 Настраиваем HTTP доступ для DOIRP приложения..."

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app
sudo docker rm doirp-app

# Создаем nginx конфигурацию для HTTP
echo "📝 Создаем nginx конфигурацию для HTTP..."
cat > nginx-http.conf << 'EOF'
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
    
    # HTTP сервер
    server {
        listen       80;
        server_name  _;
        root         /usr/share/nginx/html;
        index        index.html;
        
        # Безопасность
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        
        # Основные маршруты
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Статические файлы
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Обновляем Dockerfile для HTTP
echo "📝 Обновляем Dockerfile для HTTP..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-http.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Собираем новый образ
echo "🔨 Собираем новый Docker образ для HTTP..."
sudo docker build -t doirp-app:http .

# Запускаем контейнер с HTTP
echo "🚀 Запускаем приложение с HTTP доступом..."
sudo docker run -d \
    --name doirp-app \
    -p 80:80 \
    --restart unless-stopped \
    doirp-app:http

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
sudo docker ps | grep doirp-app

echo "🎉 HTTP доступ настроен!"
echo "🌐 Приложение доступно по адресу: http://158.160.200.214"
echo "⚠️  Внимание: HTTP не защищен, используйте только для тестирования"
echo "🔒 Для продакшена рекомендуется настроить HTTPS с доменом"
