# 🔗 Подключение к виртуальной машине

## 📋 Инструкция по подключению

### 1. Создание виртуальной машины в Яндекс.Облако

```bash
# Создайте виртуальную машину
yc compute instance create \
  --name doirp-vm \
  --zone ru-central1-a \
  --cores 2 \
  --memory 4 \
  --create-boot-disk image-family=ubuntu-2004-lts,size=20 \
  --ssh-key ~/.ssh/id_rsa.pub
```

### 2. Получение IP адреса

```bash
# Получите внешний IP адрес
yc compute instance get doirp-vm --format json | jq -r '.network_interfaces[0].primary_v4_address.one_to_one_nat.address'
```

### 3. Подключение по SSH

```bash
# Подключитесь к виртуальной машине
ssh yc-user@YOUR_VM_IP
```

### 4. Установка необходимого ПО

```bash
# Обновите систему
sudo apt update

# Установите Docker
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Установите Git
sudo apt install -y git

# Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 5. Клонирование и деплой проекта

```bash
# Клонируйте репозиторий
git clone https://github.com/maxty9378/paneldoirp.git
cd paneldoirp

# Соберите Docker образ
sudo docker build -t doirp-app:latest .

# Запустите контейнер
sudo docker run -d \
  --name doirp-app \
  -p 80:80 \
  --restart unless-stopped \
  doirp-app:latest
```

### 6. Проверка работы

```bash
# Проверьте статус контейнера
sudo docker ps

# Проверьте логи
sudo docker logs doirp-app
```

## 🔧 Полезные команды

### Обновление приложения
```bash
cd ~/paneldoirp
git pull origin main
sudo docker stop doirp-app
sudo docker rm doirp-app
sudo docker build -t doirp-app:latest .
sudo docker run -d --name doirp-app -p 80:80 --restart unless-stopped doirp-app:latest
```

### Просмотр логов
```bash
sudo docker logs -f doirp-app
```

### Остановка/запуск контейнера
```bash
sudo docker stop doirp-app
sudo docker start doirp-app
```

## 📝 Примечания

- Замените `YOUR_VM_IP` на реальный IP адрес вашей виртуальной машины
- Убедитесь, что у вас настроен SSH ключ для подключения
- Приложение будет доступно по адресу `http://YOUR_VM_IP`
