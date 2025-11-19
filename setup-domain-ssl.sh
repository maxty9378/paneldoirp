#!/bin/bash

# Скрипт для настройки SSL с доменом doirp.ru
# Запустите этот скрипт на виртуальной машине

DOMAIN="doirp.ru"
CERT_DIR="/etc/ssl/certs/${DOMAIN}"

echo "🌐 Настраиваем SSL с доменом ${DOMAIN} для DOIRP приложения..."

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app 2>/dev/null || true
sudo docker rm doirp-app 2>/dev/null || true

# Создаем директорию для сертификатов
echo "📁 Создаем директорию для сертификатов..."
sudo mkdir -p "$CERT_DIR"

# Проверяем наличие существующего приватного ключа и сертификата
if [ -f "$CERT_DIR/privkey.pem" ] && [ -f "$CERT_DIR/fullchain.pem" ]; then
    echo "✅ Найдены существующие сертификат и приватный ключ"
    USE_EXISTING_CERT=true
    USE_EXISTING_KEY=true
elif [ -f "$CERT_DIR/privkey.pem" ]; then
    echo "✅ Найден существующий приватный ключ (сертификат будет получен через Let's Encrypt)"
    USE_EXISTING_CERT=false
    USE_EXISTING_KEY=true
    # Устанавливаем certbot для получения сертификата
    if ! command -v certbot &> /dev/null; then
        echo "📦 Устанавливаем certbot..."
        sudo apt update
        sudo apt install -y certbot
    fi
else
    echo "⚠️  Приватный ключ не найден. Будет использован Let's Encrypt"
    USE_EXISTING_CERT=false
    USE_EXISTING_KEY=false
    # Устанавливаем certbot для получения нового сертификата
    echo "📦 Устанавливаем certbot..."
    sudo apt update
    sudo apt install -y certbot
fi

# Создаем nginx конфигурацию для домена
echo "📝 Создаем nginx конфигурацию для домена..."
cat > nginx-domain.conf << 'EOF'
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
        server_name  doirp.ru www.doirp.ru;
        return 301 https://$host$request_uri;
    }
    
    # HTTPS сервер
    server {
        listen       443 ssl http2;
        server_name  doirp.ru www.doirp.ru;
        root         /usr/share/nginx/html;
        index        index.html;
        
        # SSL конфигурация
        ssl_certificate /etc/ssl/certs/doirp.ru/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/doirp.ru/privkey.pem;
        
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

# Получаем или используем существующий сертификат
if [ "$USE_EXISTING_CERT" = true ]; then
    echo "✅ Используем существующий сертификат от reg.ru"
    echo "   Сертификат: $CERT_DIR/fullchain.pem"
    echo "   Ключ: $CERT_DIR/privkey.pem"
elif [ "$USE_EXISTING_KEY" = true ]; then
    echo "✅ Используем существующий приватный ключ"
    
    # Проверяем наличие сертификата
    if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
        echo "⚠️  Сертификат не найден. Получаем новый через Let's Encrypt..."
        
        # Устанавливаем certbot если не установлен
        if ! command -v certbot &> /dev/null; then
            echo "📦 Устанавливаем certbot..."
            sudo apt update
            sudo apt install -y certbot
        fi
        
        # Создаем временный nginx контейнер для получения сертификата
        cat > nginx-temp.conf << 'NGINX_EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    server {
        listen       80;
        server_name  doirp.ru www.doirp.ru;
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
NGINX_EOF
        
        sudo docker run -d \
            --name nginx-temp \
            -p 80:80 \
            -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf \
            -v /usr/share/nginx/html:/usr/share/nginx/html \
            -v /var/www/certbot:/var/www/certbot \
            nginx:alpine
        
        sudo mkdir -p /var/www/certbot
        sleep 5
        
        # Используем существующий ключ для получения сертификата
        echo "📜 Получаем Let's Encrypt сертификат с существующим ключом..."
        sudo certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email d0irp@yandex.ru \
            --agree-tos \
            --no-eff-email \
            --key-path "$CERT_DIR/privkey.pem" \
            -d doirp.ru -d www.doirp.ru \
            --non-interactive
        
        # Копируем сертификат в нужное место
        sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem "$CERT_DIR/" 2>/dev/null || \
        sudo cp /etc/letsencrypt/archive/${DOMAIN}/fullchain*.pem "$CERT_DIR/fullchain.pem" 2>/dev/null || true
        
        sudo docker stop nginx-temp
        sudo docker rm nginx-temp
    fi
else
    echo "🔐 Получаем новый Let's Encrypt сертификат для домена..."
    
    # Создаем временный nginx контейнер для получения сертификата
    cat > nginx-temp.conf << 'NGINX_EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    server {
        listen       80;
        server_name  doirp.ru www.doirp.ru;
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
NGINX_EOF
    
    sudo docker run -d \
        --name nginx-temp \
        -p 80:80 \
        -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf \
        -v /usr/share/nginx/html:/usr/share/nginx/html \
        -v /var/www/certbot:/var/www/certbot \
        nginx:alpine
    
    sudo mkdir -p /var/www/certbot
    sleep 5
    
    echo "📜 Получаем Let's Encrypt сертификат для домена..."
    sudo certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email d0irp@yandex.ru \
        --agree-tos \
        --no-eff-email \
        -d doirp.ru -d www.doirp.ru \
        --non-interactive
    
    # Копируем сертификаты в нужное место
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem "$CERT_DIR/"
        sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem "$CERT_DIR/"
    fi
    
    sudo docker stop nginx-temp
    sudo docker rm nginx-temp
fi

# Устанавливаем права доступа
if [ -f "$CERT_DIR/fullchain.pem" ]; then
    sudo chmod 644 "$CERT_DIR/fullchain.pem"
    sudo chown root:root "$CERT_DIR/fullchain.pem"
fi
if [ -f "$CERT_DIR/privkey.pem" ]; then
    sudo chmod 600 "$CERT_DIR/privkey.pem"
    sudo chown root:root "$CERT_DIR/privkey.pem"
fi

# Обновляем Dockerfile для домена
echo "📝 Обновляем Dockerfile для домена..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-domain.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
EOF

# Собираем новый образ
echo "🔨 Собираем новый Docker образ с доменом..."
sudo docker build -t doirp-app:domain .

# Запускаем контейнер с доменом
echo "🚀 Запускаем приложение с доменом..."
sudo docker run -d \
    --name doirp-app \
    -p 80:80 \
    -p 443:443 \
    -v "$CERT_DIR:/etc/ssl/certs/doirp.ru:ro" \
    --restart unless-stopped \
    doirp-app:domain

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
sudo docker ps | grep doirp-app

# Настраиваем автоматическое обновление сертификата
echo "🔄 Настраиваем автоматическое обновление сертификата..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && /usr/bin/docker restart doirp-app") | crontab -

echo "🎉 Домен настроен!"
echo "🔒 Приложение доступно по адресам:"
echo "   - https://doirp.ru"
echo "   - https://www.doirp.ru"
echo "✅ Сертификат будет автоматически обновляться каждые 90 дней (если используется Let's Encrypt)"
echo "🌍 Сертификат признается всеми браузерами и антивирусами"
