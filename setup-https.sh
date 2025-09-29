#!/bin/bash

# Скрипт для настройки HTTPS с Let's Encrypt
# Запустите этот скрипт на виртуальной машине

echo "🔒 Настраиваем HTTPS для DOIRP приложения..."

# Устанавливаем certbot
echo "📦 Устанавливаем certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app
sudo docker rm doirp-app

# Создаем обновленную nginx конфигурацию с HTTPS
echo "📝 Создаем nginx конфигурацию с HTTPS..."
cat > nginx-https.conf << 'EOF'
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
    
    # HTTP сервер - редирект на HTTPS
    server {
        listen       80;
        server_name  _;
        return 301 https://$host$request_uri;
    }
    
    # HTTPS сервер
    server {
        listen       443 ssl http2;
        server_name  _;
        root         /usr/share/nginx/html;
        index        index.html;
        
        # SSL конфигурация (будет обновлена certbot)
        ssl_certificate /etc/letsencrypt/live/158.160.200.214/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/158.160.200.214/privkey.pem;
        
        # SSL настройки
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Безопасность
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
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

# Создаем временный nginx контейнер для получения сертификата
echo "🔐 Получаем SSL сертификат..."
sudo docker run -d \
    --name nginx-temp \
    -p 80:80 \
    -p 443:443 \
    -v $(pwd)/nginx-https.conf:/etc/nginx/nginx.conf \
    -v /usr/share/nginx/html:/usr/share/nginx/html \
    nginx:alpine

# Ждем запуска nginx
sleep 5

# Получаем сертификат
echo "📜 Получаем Let's Encrypt сертификат..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/usr/share/nginx/html \
    --email d0irp@yandex.ru \
    --agree-tos \
    --no-eff-email \
    -d 158.160.200.214 \
    --non-interactive

# Останавливаем временный контейнер
sudo docker stop nginx-temp
sudo docker rm nginx-temp

# Обновляем Dockerfile для HTTPS
echo "📝 Обновляем Dockerfile для HTTPS..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-https.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
EOF

# Собираем новый образ
echo "🔨 Собираем новый Docker образ с HTTPS..."
sudo docker build -t doirp-app:https .

# Запускаем контейнер с HTTPS
echo "🚀 Запускаем приложение с HTTPS..."
sudo docker run -d \
    --name doirp-app \
    -p 80:80 \
    -p 443:443 \
    -v /etc/letsencrypt:/etc/letsencrypt:ro \
    --restart unless-stopped \
    doirp-app:https

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
sudo docker ps | grep doirp-app

echo "🎉 HTTPS настроен!"
echo "🔒 Приложение доступно по адресу: https://158.160.200.214"
echo "📋 Сертификат будет автоматически обновляться каждые 90 дней"
