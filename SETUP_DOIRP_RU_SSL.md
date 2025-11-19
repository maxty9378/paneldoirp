# Настройка SSL для doirp.ru

## 📋 Что нужно сделать

### 1. Сохраните приватный ключ на сервере

#### Вариант А: Через PowerShell (Windows)

1. Сохраните приватный ключ в файл `doirp.ru.key`:
```powershell
# Создайте файл doirp.ru.key и вставьте ваш приватный ключ
```

2. Загрузите ключ на сервер:
```powershell
scp -i src/ssh/ssh-key-doirp-01 doirp.ru.key doirp@51.250.94.103:/tmp/
```

3. Подключитесь к серверу и переместите ключ:
```bash
ssh -l doirp 51.250.94.103
sudo mkdir -p /etc/ssl/certs/doirp.ru
sudo mv /tmp/doirp.ru.key /etc/ssl/certs/doirp.ru/privkey.pem
sudo chmod 600 /etc/ssl/certs/doirp.ru/privkey.pem
sudo chown root:root /etc/ssl/certs/doirp.ru/privkey.pem
```

#### Вариант Б: Прямо на сервере

1. Подключитесь к серверу:
```bash
ssh -l doirp 51.250.94.103
```

2. Создайте файл с приватным ключом:
```bash
sudo mkdir -p /etc/ssl/certs/doirp.ru
sudo nano /etc/ssl/certs/doirp.ru/privkey.pem
# Вставьте приватный ключ (весь блок от -----BEGIN до -----END)
# Сохраните: Ctrl+O, Enter, Ctrl+X
```

3. Установите права доступа:
```bash
sudo chmod 600 /etc/ssl/certs/doirp.ru/privkey.pem
sudo chown root:root /etc/ssl/certs/doirp.ru/privkey.pem
```

### 2. Настройте DNS записи

Убедитесь, что DNS записи настроены:
- **A запись** `doirp.ru` → `51.250.94.103`
- **A запись** `www.doirp.ru` → `51.250.94.103`

Проверка:
```bash
nslookup doirp.ru
nslookup www.doirp.ru
# Должны показывать 51.250.94.103
```

### 3. Запустите скрипт настройки SSL

Загрузите скрипт на сервер:
```bash
scp -i src/ssh/ssh-key-doirp-01 setup-domain-ssl.sh doirp@51.250.94.103:~/
```

Подключитесь к серверу и запустите:
```bash
ssh -l doirp 51.250.94.103
chmod +x setup-domain-ssl.sh
./setup-domain-ssl.sh
```

### 4. Если у вас уже есть готовый сертификат

Если вы получили сертификат из Yandex Certificate Manager:

1. Сохраните сертификат на сервере:
```bash
sudo nano /etc/ssl/certs/doirp.ru/fullchain.pem
# Вставьте сертификат (если есть цепочка - объедините сертификат и цепочку)
```

2. Установите права:
```bash
sudo chmod 644 /etc/ssl/certs/doirp.ru/fullchain.pem
sudo chown root:root /etc/ssl/certs/doirp.ru/fullchain.pem
```

3. Обновите nginx конфигурацию (если нужно) и перезапустите контейнер

## ✅ Проверка

После настройки проверьте:
```bash
curl -I https://doirp.ru
curl -I https://www.doirp.ru
```

В браузере откройте:
- https://doirp.ru
- https://www.doirp.ru

## 🔧 Если что-то пошло не так

1. Проверьте логи nginx:
```bash
sudo docker logs doirp-app
```

2. Проверьте права доступа к сертификатам:
```bash
sudo ls -la /etc/ssl/certs/doirp.ru/
```

3. Убедитесь, что порты 80 и 443 открыты в Yandex Cloud Firewall

