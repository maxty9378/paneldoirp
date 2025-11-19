# Установка сертификата от reg.ru для doirp.ru

## 📋 Что нужно сделать

### 1. Подготовьте файлы на локальной машине

У вас должны быть файлы от reg.ru:
- **Сертификат** (обычно `.crt` или `.pem` файл)
- **Приватный ключ** (`.key` файл) - у вас уже есть
- **Цепочка сертификатов** (если есть, обычно `chain.crt` или `ca-bundle.crt`)

### 2. Загрузите файлы на сервер

#### Вариант А: Через PowerShell (Windows)

```powershell
# Замените пути на реальные пути к вашим файлам
scp -i src/ssh/ssh-key-doirp-01 путь/к/сертификату.crt doirp@51.250.94.103:/tmp/doirp.ru.crt
scp -i src/ssh/ssh-key-doirp-01 путь/к/ключу.key doirp@51.250.94.103:/tmp/doirp.ru.key

# Если есть цепочка сертификатов:
scp -i src/ssh/ssh-key-doirp-01 путь/к/цепочке.crt doirp@51.250.94.103:/tmp/doirp.ru.chain.crt
```

#### Вариант Б: Используя приватный ключ, который вы уже показали

1. Создайте файл `doirp.ru.key` на вашем компьютере и вставьте приватный ключ
2. Загрузите на сервер:
```powershell
scp -i src/ssh/ssh-key-doirp-01 doirp.ru.key doirp@51.250.94.103:/tmp/doirp.ru.key
```

### 3. Разместите файлы на сервере

Подключитесь к серверу:
```bash
ssh -l doirp 51.250.94.103
```

Создайте директорию и переместите файлы:
```bash
# Создаем директорию для сертификатов
sudo mkdir -p /etc/nginx/ssl/doirp.ru

# Перемещаем сертификат
sudo mv /tmp/doirp.ru.crt /etc/nginx/ssl/doirp.ru/doirp.ru.crt

# Перемещаем приватный ключ
sudo mv /tmp/doirp.ru.key /etc/nginx/ssl/doirp.ru/doirp.ru.key

# Если есть цепочка сертификатов, объедините её с основным сертификатом:
if [ -f /tmp/doirp.ru.chain.crt ]; then
    # Объединяем сертификат и цепочку в fullchain
    sudo cat /tmp/doirp.ru.crt /tmp/doirp.ru.chain.crt > /tmp/doirp.ru.fullchain.crt
    sudo mv /tmp/doirp.ru.fullchain.crt /etc/nginx/ssl/doirp.ru/doirp.ru.crt
fi

# Устанавливаем правильные права доступа
sudo chmod 644 /etc/nginx/ssl/doirp.ru/doirp.ru.crt
sudo chmod 600 /etc/nginx/ssl/doirp.ru/doirp.ru.key
sudo chown root:root /etc/nginx/ssl/doirp.ru/*
```

### 4. Запустите скрипт настройки

Используйте готовый скрипт для reg.ru:
```bash
# Загрузите скрипт на сервер (с локальной машины)
# scp -i src/ssh/ssh-key-doirp-01 setup-regru-ssl.sh doirp@51.250.94.103:~/

# На сервере запустите:
chmod +x setup-regru-ssl.sh
./setup-regru-ssl.sh
```

### 5. Если используете Docker (как в setup-domain-ssl.sh)

Если вы используете Docker, нужно:
1. Положить сертификаты в `/etc/ssl/certs/doirp.ru/` (не `/etc/nginx/ssl/`)
2. Обновить скрипт setup-domain-ssl.sh для использования готового сертификата

**Для Docker:**

```bash
# Создаем директорию для Docker контейнера
sudo mkdir -p /etc/ssl/certs/doirp.ru

# Копируем сертификат
sudo cp /tmp/doirp.ru.crt /etc/ssl/certs/doirp.ru/fullchain.pem

# Если есть цепочка, объедините:
if [ -f /tmp/doirp.ru.chain.crt ]; then
    sudo cat /tmp/doirp.ru.crt /tmp/doirp.ru.chain.crt > /etc/ssl/certs/doirp.ru/fullchain.pem
else
    sudo cp /tmp/doirp.ru.crt /etc/ssl/certs/doirp.ru/fullchain.pem
fi

# Копируем ключ
sudo cp /tmp/doirp.ru.key /etc/ssl/certs/doirp.ru/privkey.pem

# Устанавливаем права
sudo chmod 644 /etc/ssl/certs/doirp.ru/fullchain.pem
sudo chmod 600 /etc/ssl/certs/doirp.ru/privkey.pem
sudo chown root:root /etc/ssl/certs/doirp.ru/*
```

## 📍 Итого: куда положить файлы

### Для обычного nginx (без Docker):
- **Сертификат:** `/etc/nginx/ssl/doirp.ru/doirp.ru.crt`
- **Ключ:** `/etc/nginx/ssl/doirp.ru/doirp.ru.key`

### Для Docker (как в setup-domain-ssl.sh):
- **Сертификат:** `/etc/ssl/certs/doirp.ru/fullchain.pem` (объедините сертификат + цепочку, если есть)
- **Ключ:** `/etc/ssl/certs/doirp.ru/privkey.pem`

## ✅ Проверка

После установки проверьте:
```bash
# Проверьте наличие файлов
sudo ls -la /etc/ssl/certs/doirp.ru/
# или
sudo ls -la /etc/nginx/ssl/doirp.ru/

# Проверьте сертификат
openssl x509 -in /etc/ssl/certs/doirp.ru/fullchain.pem -text -noout | grep -A 2 "Subject:"
```

## 🔧 Важно

1. **Если у вас есть цепочка сертификатов**, объедините её с основным сертификатом:
   ```bash
   cat doirp.ru.crt doirp.ru.chain.crt > doirp.ru.fullchain.crt
   ```
   И используйте `fullchain.crt` как сертификат.

2. **Права доступа**:
   - Сертификат: `644` (читаемый всеми)
   - Ключ: `600` (только владелец)

3. После установки перезапустите nginx или Docker контейнер.

