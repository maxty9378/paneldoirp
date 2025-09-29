# Деплой на Яндекс.Облако

## Варианты деплоя

### 1. Яндекс.Облако Container Registry + Compute Cloud

#### Шаг 1: Подготовка
1. Установите Yandex Cloud CLI:
```bash
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash
```

2. Настройте аутентификацию:
```bash
yc init
```

#### Шаг 2: Создание Container Registry
```bash
# Создайте реестр
yc container registry create --name doirp-registry

# Получите ID реестра
yc container registry list

# Настройте Docker для работы с реестром
yc container registry configure-docker
```

#### Шаг 3: Сборка и загрузка образа
```bash
# Соберите образ
docker build -t cr.yandex/your-registry-id/doirp-app:latest .

# Загрузите в реестр
docker push cr.yandex/your-registry-id/doirp-app:latest
```

#### Шаг 4: Создание виртуальной машины
```bash
# Создайте VM с Docker
yc compute instance create \
  --name doirp-vm \
  --zone ru-central1-a \
  --cores 2 \
  --memory 4 \
  --create-boot-disk image-family=container-optimized-image,size=20 \
  --ssh-key ~/.ssh/id_rsa.pub

# Получите IP адрес
yc compute instance get doirp-vm
```

#### Шаг 5: Деплой на VM
```bash
# Подключитесь к VM
ssh yc-user@your-vm-ip

# Запустите контейнер
sudo docker run -d \
  --name doirp-app \
  -p 80:80 \
  --restart unless-stopped \
  cr.yandex/your-registry-id/doirp-app:latest
```

### 2. Яндекс.Облако Serverless Containers

#### Шаг 1: Создание сервиса
```bash
# Создайте сервис
yc serverless container create --name doirp-service

# Создайте ревизию
yc serverless container revision deploy \
  --container-name doirp-service \
  --image cr.yandex/your-registry-id/doirp-app:latest \
  --cores 1 \
  --memory 1GB \
  --execution-timeout 30s \
  --concurrency 10 \
  --service-account-id your-service-account-id
```

#### Шаг 2: Создание API Gateway
```bash
# Создайте API Gateway
yc serverless api-gateway create \
  --name doirp-gateway \
  --spec api-gateway-spec.yaml
```

### 3. Яндекс.Облако Managed Service for Kubernetes

#### Шаг 1: Создание кластера
```bash
# Создайте кластер
yc managed-kubernetes cluster create \
  --name doirp-cluster \
  --zone ru-central1-a \
  --network-name default \
  --subnet-name default-ru-central1-a \
  --service-account-name doirp-k8s-sa \
  --node-service-account-name doirp-k8s-node-sa

# Получите kubeconfig
yc managed-kubernetes cluster get-credentials --id your-cluster-id
```

#### Шаг 2: Деплой приложения
```bash
# Примените манифесты
kubectl apply -f k8s/
```

## Мониторинг и логи

### Просмотр логов
```bash
# Для VM
sudo docker logs doirp-app

# Для Serverless Containers
yc serverless container logs --name doirp-service

# Для Kubernetes
kubectl logs -l app=doirp-app
```

### Мониторинг ресурсов
```bash
# Для VM
yc compute instance list

# Для Serverless Containers
yc serverless container list

# Для Kubernetes
kubectl top pods
```

## Обновление приложения

### Обновление образа
```bash
# Соберите новый образ
docker build -t cr.yandex/your-registry-id/doirp-app:v2.0.0 .

# Загрузите в реестр
docker push cr.yandex/your-registry-id/doirp-app:v2.0.0

# Обновите деплой
# Для VM:
sudo docker stop doirp-app
sudo docker rm doirp-app
sudo docker run -d --name doirp-app -p 80:80 cr.yandex/your-registry-id/doirp-app:v2.0.0

# Для Serverless Containers:
yc serverless container revision deploy --container-name doirp-service --image cr.yandex/your-registry-id/doirp-app:v2.0.0

# Для Kubernetes:
kubectl set image deployment/doirp-app app=cr.yandex/your-registry-id/doirp-app:v2.0.0
```

## Безопасность

### Настройка HTTPS
1. Получите SSL сертификат (Let's Encrypt или Yandex Certificate Manager)
2. Настройте nginx для работы с HTTPS
3. Обновите конфигурацию nginx.conf

### Настройка домена
1. Зарегистрируйте домен
2. Настройте DNS записи
3. Привяжите домен к вашему сервису

## Стоимость

Примерная стоимость для разных вариантов:
- **VM (2 vCPU, 4GB RAM)**: ~2000₽/месяц
- **Serverless Containers**: ~500-1500₽/месяц (зависит от нагрузки)
- **Managed Kubernetes**: ~3000₽/месяц + ресурсы нод

## Полезные команды

```bash
# Просмотр всех ресурсов
yc resource-manager resource list

# Удаление ресурсов
yc compute instance delete doirp-vm
yc container registry delete doirp-registry
yc serverless container delete doirp-service
```
