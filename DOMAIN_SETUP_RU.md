# Подключение домена к Яндекс.Облако ВМ

## Быстрая инструкция

### 1. Настройка DNS (у регистратора домена)

Добавьте A-запись:
- **Тип:** A
- **Имя:** @ (для корневого) или поддомен (например `api`, `supabase`)
- **Значение:** `51.250.94.103`
- **TTL:** 3600

**Примеры:**
- `doirp.ru` → `51.250.94.103`
- `api.doirp.ru` → `51.250.94.103`

### 2. Установка Nginx на сервере

```bash
# Подключитесь к серверу
ssh -i src/ssh/ssh-key-doirp-01 doirp@51.250.94.103

# Запустите скрипт (замените YOUR_DOMAIN на ваш домен)
chmod +x setup-nginx-domain.sh
sudo bash setup-nginx-domain.sh api.doirp.ru
```

Скрипт:
- Установит Nginx
- Настроит прокси на Supabase (порт 8000)
- Проверит конфигурацию

### 3. Получение SSL сертификата (HTTPS)

После настройки DNS (подождите 5-10 минут):

```bash
# Замените YOUR_DOMAIN на ваш домен
sudo bash setup-ssl-cert.sh api.doirp.ru
```

### 4. Обновление конфигурации Supabase

После получения SSL:

```bash
cd ~/supabase
supabase stop

# Отредактируйте .env
nano .env
# Измените:
# API_URL=https://api.doirp.ru
# SITE_URL=https://api.doirp.ru

supabase start
```

### 5. Обновление конфигурации приложения

В файле `.env.production.local` измените:
```
VITE_SUPABASE_URL=https://api.doirp.ru
```

## Проверка

1. Проверьте DNS:
   ```bash
   nslookup api.doirp.ru
   # Должен вернуть: 51.250.94.103
   ```

2. Проверьте HTTP (до SSL):
   ```bash
   curl http://api.doirp.ru/health
   # Должен вернуть: healthy
   ```

3. Проверьте HTTPS (после SSL):
   ```bash
   curl https://api.doirp.ru/health
   ```

## Важно

- DNS изменения распространяются 5-60 минут
- Для Let's Encrypt нужен публичный IP (у вас есть: 51.250.94.103)
- Убедитесь, что порт 80 и 443 открыты в файрволе Яндекс.Облако

