#!/bin/bash

# Скрипт для настройки HTTPS с доменом
# ВАЖНО: Сначала зарегистрируйте домен и настройте DNS

echo "🌐 Настраиваем HTTPS с доменом для DOIRP приложения..."

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app
sudo docker rm doirp-app

# Устанавливаем certbot
echo "📦 Устанавливаем certbot..."
sudo apt update
sudo apt install -y certbot

# Создаем nginx конфигурацию для HTTPS
echo "📝 Создаем nginx конфигурацию для HTTPS..."
cat > nginx-https-domain.conf << 'EOF'
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
        listen       443 ssl;
        server_name  _;
        root         /usr/share/nginx/html;
        index        index.html;
        
        # SSL конфигурация
        ssl_certificate /etc/ssl/certs/doirp/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/doirp/privkey.pem;
        
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

# Создаем директорию для сертификатов
sudo mkdir -p /etc/ssl/certs/doirp

# Создаем самоподписанный сертификат
echo "🔐 Создаем самоподписанный сертификат..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/certs/doirp/privkey.pem \
    -out /etc/ssl/certs/doirp/fullchain.pem \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=ООО ДОИРП/OU=IT Department/CN=158.160.200.214/emailAddress=d0irp@yandex.ru"

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
COPY nginx-https-domain.conf /etc/nginx/nginx.conf
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
    -v /etc/ssl/certs/doirp:/etc/ssl/certs/doirp:ro \
    --restart unless-stopped \
    doirp-app:https

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
sudo docker ps | grep doirp-app

echo "🎉 HTTPS настроен!"
echo "🔒 Приложение доступно по адресам:"
echo "   - https://158.160.200.214 (с предупреждением о сертификате)"
echo "   - http://158.160.200.214 (редирект на HTTPS)"
echo "⚠️  Браузер покажет предупреждение о самоподписанном сертификате"
echo "💡 Для полного решения зарегистрируйте домен и настройте Let's Encrypt"
