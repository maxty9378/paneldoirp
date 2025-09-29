#!/bin/bash

# Скрипт для настройки Let's Encrypt сертификата
# Запустите этот скрипт на виртуальной машине

echo "🔒 Настраиваем Let's Encrypt сертификат для DOIRP приложения..."

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app
sudo docker rm doirp-app

# Устанавливаем certbot
echo "📦 Устанавливаем certbot..."
sudo apt update
sudo apt install -y certbot

# Создаем временный nginx контейнер для получения сертификата
echo "🔐 Получаем Let's Encrypt сертификат..."

# Создаем простую nginx конфигурацию для получения сертификата
cat > nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    server {
        listen       80;
        server_name  158.160.200.214;
        root         /usr/share/nginx/html;
        index        index.html;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
EOF

# Запускаем временный nginx контейнер
sudo docker run -d \
    --name nginx-temp \
    -p 80:80 \
    -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf \
    -v /usr/share/nginx/html:/usr/share/nginx/html \
    -v /var/www/certbot:/var/www/certbot \
    nginx:alpine

# Создаем директорию для ACME challenge
sudo mkdir -p /var/www/certbot

# Ждем запуска nginx
sleep 5

# Получаем сертификат
echo "📜 Получаем Let's Encrypt сертификат..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email d0irp@yandex.ru \
    --agree-tos \
    --no-eff-email \
    -d 158.160.200.214 \
    --non-interactive

# Останавливаем временный контейнер
sudo docker stop nginx-temp
sudo docker rm nginx-temp

# Создаем nginx конфигурацию с Let's Encrypt сертификатом
echo "📝 Создаем nginx конфигурацию с Let's Encrypt..."
cat > nginx-letsencrypt.conf << 'EOF'
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
        server_name  158.160.200.214;
        return 301 https://$host$request_uri;
    }
    
    # HTTPS сервер
    server {
        listen       443 ssl;
        server_name  158.160.200.214;
        root         /usr/share/nginx/html;
        index        index.html;
        
        # Let's Encrypt SSL конфигурация
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

# Обновляем Dockerfile для Let's Encrypt
echo "📝 Обновляем Dockerfile для Let's Encrypt..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-letsencrypt.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
EOF

# Собираем новый образ
echo "🔨 Собираем новый Docker образ с Let's Encrypt..."
sudo docker build -t doirp-app:letsencrypt .

# Запускаем контейнер с Let's Encrypt
echo "🚀 Запускаем приложение с Let's Encrypt сертификатом..."
sudo docker run -d \
    --name doirp-app \
    -p 80:80 \
    -p 443:443 \
    -v /etc/letsencrypt:/etc/letsencrypt:ro \
    --restart unless-stopped \
    doirp-app:letsencrypt

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
sudo docker ps | grep doirp-app

# Настраиваем автоматическое обновление сертификата
echo "🔄 Настраиваем автоматическое обновление сертификата..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && /usr/bin/docker restart doirp-app") | crontab -

echo "🎉 Let's Encrypt настроен!"
echo "🔒 Приложение доступно по адресу: https://158.160.200.214"
echo "✅ Сертификат будет автоматически обновляться каждые 90 дней"
echo "🌍 Сертификат признается всеми браузерами и антивирусами"
