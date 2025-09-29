#!/bin/bash

# Скрипт для деплоя на Яндекс.Облако
# Использование: ./deploy.sh [vm|serverless|k8s]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка наличия необходимых инструментов
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
        exit 1
    fi
    
    if ! command -v yc &> /dev/null; then
        error "Yandex Cloud CLI не установлен"
        exit 1
    fi
    
    log "Все зависимости найдены"
}

# Получение ID реестра
get_registry_id() {
    REGISTRY_ID=$(yc container registry list --format json | jq -r '.[0].id')
    if [ -z "$REGISTRY_ID" ]; then
        error "Не найден Container Registry. Создайте его сначала."
        exit 1
    fi
    log "Найден реестр: $REGISTRY_ID"
}

# Сборка и загрузка образа
build_and_push() {
    log "Сборка Docker образа..."
    docker build -t cr.yandex/$REGISTRY_ID/doirp-app:latest .
    
    log "Загрузка образа в реестр..."
    docker push cr.yandex/$REGISTRY_ID/doirp-app:latest
    
    log "Образ успешно загружен"
}

# Деплой на VM
deploy_vm() {
    log "Деплой на виртуальную машину..."
    
    # Получение IP VM
    VM_IP=$(yc compute instance get doirp-vm --format json | jq -r '.network_interfaces[0].primary_v4_address.one_to_one_nat.address')
    
    if [ -z "$VM_IP" ]; then
        error "Не найдена VM с именем doirp-vm"
        exit 1
    fi
    
    log "Подключение к VM: $VM_IP"
    
    # Остановка старого контейнера
    ssh yc-user@$VM_IP "sudo docker stop doirp-app || true"
    ssh yc-user@$VM_IP "sudo docker rm doirp-app || true"
    
    # Запуск нового контейнера
    ssh yc-user@$VM_IP "sudo docker run -d --name doirp-app -p 80:80 --restart unless-stopped cr.yandex/$REGISTRY_ID/doirp-app:latest"
    
    log "Деплой завершен! Приложение доступно по адресу: http://$VM_IP"
}

# Деплой на Serverless Containers
deploy_serverless() {
    log "Деплой на Serverless Containers..."
    
    # Создание сервиса если не существует
    if ! yc serverless container get --name doirp-service &> /dev/null; then
        log "Создание сервиса doirp-service..."
        yc serverless container create --name doirp-service
    fi
    
    # Создание ревизии
    log "Создание новой ревизии..."
    yc serverless container revision deploy \
        --container-name doirp-service \
        --image cr.yandex/$REGISTRY_ID/doirp-app:latest \
        --cores 1 \
        --memory 1GB \
        --execution-timeout 30s \
        --concurrency 10
    
    # Получение URL
    URL=$(yc serverless container get --name doirp-service --format json | jq -r '.url')
    log "Деплой завершен! Приложение доступно по адресу: $URL"
}

# Деплой на Kubernetes
deploy_k8s() {
    log "Деплой на Kubernetes..."
    
    # Обновление образа в манифесте
    sed -i "s|cr.yandex/your-registry-id/doirp-app:latest|cr.yandex/$REGISTRY_ID/doirp-app:latest|g" k8s/deployment.yaml
    
    # Применение манифестов
    kubectl apply -f k8s/deployment.yaml
    kubectl apply -f k8s/ingress.yaml
    
    # Ожидание готовности
    kubectl rollout status deployment/doirp-app
    
    log "Деплой завершен! Проверьте статус: kubectl get pods"
}

# Основная функция
main() {
    DEPLOY_TYPE=${1:-"vm"}
    
    log "Начинаем деплой типа: $DEPLOY_TYPE"
    
    check_dependencies
    get_registry_id
    build_and_push
    
    case $DEPLOY_TYPE in
        "vm")
            deploy_vm
            ;;
        "serverless")
            deploy_serverless
            ;;
        "k8s")
            deploy_k8s
            ;;
        *)
            error "Неизвестный тип деплоя: $DEPLOY_TYPE"
            error "Доступные варианты: vm, serverless, k8s"
            exit 1
            ;;
    esac
    
    log "Деплой успешно завершен!"
}

# Запуск
main "$@"
