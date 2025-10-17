# 🔒 Руководство по настройке HTTPS

## Варианты настройки

### 1️⃣ **С доменом (рекомендуется)**

Если у вас есть домен (например, `doirp.sns.ru`):

```bash
# Подключитесь к серверу
ssh root@51.250.94.103

# Настройте DNS
# В панели управления доменом добавьте A-запись:
# doirp.sns.ru -> 51.250.94.103

# Запустите скрипт
sudo bash setup-https-letsencrypt-with-domain.sh doirp.sns.ru
```

### 2️⃣ **Без домена (только IP)**

Если у вас нет домена, можно использовать IP с самоподписанным сертификатом:

```bash
# Подключитесь к серверу
ssh root@51.250.94.103

# Запустите скрипт
sudo bash setup-https-self-signed.sh
```

## 📋 Предварительные требования

1. **Сервер с Ubuntu/Debian**
2. **Nginx установлен**
3. **Домен указывает на сервер** (для Let's Encrypt)
4. **Порт 80 и 443 открыты** в firewall

## 🔧 Ручная настройка (пошагово)

### Шаг 1: Установка Certbot

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

### Шаг 2: Настройка Nginx

Создайте файл `/etc/nginx/sites-available/doirp`:

```nginx
server {
    listen 80;
    server_name yourdomain.ru;  # Замените на ваш домен

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/doirp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Шаг 3: Получение SSL-сертификата

```bash
sudo certbot --nginx -d yourdomain.ru
```

Certbot автоматически:
- Получит сертификат от Let's Encrypt
- Настроит Nginx для HTTPS
- Добавит редирект с HTTP на HTTPS

### Шаг 4: Автообновление сертификата

Let's Encrypt сертификаты действительны 90 дней. Настройте автообновление:

```bash
# Добавить в crontab
sudo crontab -e

# Добавить строку:
0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'
```

### Шаг 5: Проверка

```bash
# Проверить статус Nginx
sudo systemctl status nginx

# Проверить сертификаты
sudo certbot certificates

# Проверить сайт
curl -I https://yourdomain.ru
```

## 🔥 Настройка Firewall

```bash
# UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Или iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

## 🎯 Обновление приложения

После настройки HTTPS обновите `.env` файл:

```env
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

И пересоберите приложение:

```bash
npm run build
sudo cp -r dist/* /var/www/html/
```

## 🐛 Решение проблем

### Ошибка: "Failed to obtain certificate"

**Причина:** Домен не указывает на сервер или порт 80 закрыт.

**Решение:**
```bash
# Проверить DNS
nslookup yourdomain.ru

# Проверить порт 80
sudo netstat -tlnp | grep :80

# Открыть порт 80
sudo ufw allow 80/tcp
```

### Ошибка: "Connection refused"

**Причина:** Nginx не запущен или конфигурация неверна.

**Решение:**
```bash
# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx

# Проверить логи
sudo tail -f /var/log/nginx/error.log
```

### Сертификат не обновляется

**Решение:**
```bash
# Обновить вручную
sudo certbot renew --force-renewal

# Проверить cron
sudo crontab -l
```

## 📚 Полезные ссылки

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot User Guide](https://certbot.eff.org/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)

## ✅ Чеклист

- [ ] Certbot установлен
- [ ] Nginx настроен
- [ ] DNS настроен (для Let's Encrypt)
- [ ] Порт 80 и 443 открыты
- [ ] SSL-сертификат получен
- [ ] Автообновление настроено
- [ ] Сайт доступен по HTTPS
- [ ] HTTP редиректит на HTTPS

