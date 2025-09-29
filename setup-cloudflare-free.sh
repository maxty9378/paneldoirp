#!/bin/bash

# Скрипт для настройки бесплатного SSL через Cloudflare
# Запустите этот скрипт на виртуальной машине

echo "☁️ Настраиваем бесплатный SSL через Cloudflare..."

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app
sudo docker rm doirp-app

# Создаем nginx конфигурацию для Cloudflare
echo "📝 Создаем nginx конфигурацию для Cloudflare..."
cat > nginx-cloudflare-free.conf << 'EOF'
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
    
    # HTTPS сервер с Cloudflare SSL
    server {
        listen       443 ssl;
        server_name  _;
        root         /usr/share/nginx/html;
        index        index.html;
        
        # Cloudflare SSL конфигурация
        ssl_certificate /etc/ssl/certs/cloudflare-origin.pem;
        ssl_certificate_key /etc/ssl/certs/cloudflare-origin.key;
        
        # SSL настройки для Cloudflare
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Cloudflare IP ranges
        set_real_ip_from 103.21.244.0/22;
        set_real_ip_from 103.22.200.0/22;
        set_real_ip_from 103.31.4.0/22;
        set_real_ip_from 104.16.0.0/13;
        set_real_ip_from 104.24.0.0/14;
        set_real_ip_from 108.162.192.0/18;
        set_real_ip_from 131.0.72.0/22;
        set_real_ip_from 141.101.64.0/18;
        set_real_ip_from 162.158.0.0/15;
        set_real_ip_from 172.64.0.0/13;
        set_real_ip_from 173.245.48.0/20;
        set_real_ip_from 188.114.96.0/20;
        set_real_ip_from 190.93.240.0/20;
        set_real_ip_from 197.234.240.0/22;
        set_real_ip_from 198.41.128.0/17;
        real_ip_header CF-Connecting-IP;
        
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
sudo mkdir -p /etc/ssl/certs

# Создаем Cloudflare Origin сертификат
echo "🔐 Создаем Cloudflare Origin сертификат..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/certs/cloudflare-origin.key \
    -out /etc/ssl/certs/cloudflare-origin.pem \
    -subj "/C=US/ST=CA/L=San Francisco/O=Cloudflare Inc/OU=IT Department/CN=*.cloudflare.com/emailAddress=support@cloudflare.com"

# Обновляем Dockerfile для Cloudflare
echo "📝 Обновляем Dockerfile для Cloudflare..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-cloudflare-free.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
EOF

# Собираем новый образ
echo "🔨 Собираем новый Docker образ с Cloudflare..."
sudo docker build -t doirp-app:cloudflare .

# Запускаем контейнер с Cloudflare
echo "🚀 Запускаем приложение с Cloudflare SSL..."
sudo docker run -d \
    --name doirp-app \
    -p 80:80 \
    -p 443:443 \
    -v /etc/ssl/certs:/etc/ssl/certs:ro \
    --restart unless-stopped \
    doirp-app:cloudflare

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
sudo docker ps | grep doirp-app

echo "🎉 Cloudflare SSL настроен!"
echo "🔒 Приложение доступно по адресу: https://158.160.200.214"
echo "☁️ Для полной настройки Cloudflare:"
echo "   1. Зарегистрируйтесь на cloudflare.com"
echo "   2. Добавьте домен в Cloudflare"
echo "   3. Настройте DNS записи"
echo "   4. Включите SSL/TLS в режиме 'Full (strict)'"
