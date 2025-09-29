# PowerShell скрипт для деплоя на Яндекс.Облако
# Использование: .\deploy.ps1 [vm|serverless|k8s]

param(
    [Parameter(Position=0)]
    [ValidateSet("vm", "serverless", "k8s")]
    [string]$DeployType = "vm"
)

# Функции для вывода
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Проверка зависимостей
function Test-Dependencies {
    Write-Info "Проверка зависимостей..."
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker не установлен"
        exit 1
    }
    
    if (-not (Get-Command yc -ErrorAction SilentlyContinue)) {
        Write-Error "Yandex Cloud CLI не установлен"
        exit 1
    }
    
    Write-Info "Все зависимости найдены"
}

# Получение ID реестра
function Get-RegistryId {
    $registry = yc container registry list --format json | ConvertFrom-Json
    if (-not $registry -or $registry.Count -eq 0) {
        Write-Error "Не найден Container Registry. Создайте его сначала."
        exit 1
    }
    $script:RegistryId = $registry[0].id
    Write-Info "Найден реестр: $RegistryId"
}

# Сборка и загрузка образа
function Build-AndPush {
    Write-Info "Сборка Docker образа..."
    docker build -t "cr.yandex/$RegistryId/doirp-app:latest" .
    
    Write-Info "Загрузка образа в реестр..."
    docker push "cr.yandex/$RegistryId/doirp-app:latest"
    
    Write-Info "Образ успешно загружен"
}

# Деплой на VM
function Deploy-VM {
    Write-Info "Деплой на виртуальную машину..."
    
    # Получение IP VM
    $vmInfo = yc compute instance get doirp-vm --format json | ConvertFrom-Json
    $vmIp = $vmInfo.network_interfaces[0].primary_v4_address.one_to_one_nat.address
    
    if (-not $vmIp) {
        Write-Error "Не найдена VM с именем doirp-vm"
        exit 1
    }
    
    Write-Info "Подключение к VM: $vmIp"
    
    # Остановка старого контейнера
    ssh yc-user@$vmIp "sudo docker stop doirp-app || true"
    ssh yc-user@$vmIp "sudo docker rm doirp-app || true"
    
    # Запуск нового контейнера
    ssh yc-user@$vmIp "sudo docker run -d --name doirp-app -p 80:80 --restart unless-stopped cr.yandex/$RegistryId/doirp-app:latest"
    
    Write-Info "Деплой завершен! Приложение доступно по адресу: http://$vmIp"
}

# Деплой на Serverless Containers
function Deploy-Serverless {
    Write-Info "Деплой на Serverless Containers..."
    
    # Создание сервиса если не существует
    try {
        yc serverless container get --name doirp-service | Out-Null
    }
    catch {
        Write-Info "Создание сервиса doirp-service..."
        yc serverless container create --name doirp-service
    }
    
    # Создание ревизии
    Write-Info "Создание новой ревизии..."
    yc serverless container revision deploy `
        --container-name doirp-service `
        --image "cr.yandex/$RegistryId/doirp-app:latest" `
        --cores 1 `
        --memory 1GB `
        --execution-timeout 30s `
        --concurrency 10
    
    # Получение URL
    $serviceInfo = yc serverless container get --name doirp-service --format json | ConvertFrom-Json
    $url = $serviceInfo.url
    Write-Info "Деплой завершен! Приложение доступно по адресу: $url"
}

# Деплой на Kubernetes
function Deploy-K8s {
    Write-Info "Деплой на Kubernetes..."
    
    # Обновление образа в манифесте
    $deploymentContent = Get-Content "k8s/deployment.yaml" -Raw
    $deploymentContent = $deploymentContent -replace "cr.yandex/your-registry-id/doirp-app:latest", "cr.yandex/$RegistryId/doirp-app:latest"
    Set-Content "k8s/deployment.yaml" $deploymentContent
    
    # Применение манифестов
    kubectl apply -f k8s/deployment.yaml
    kubectl apply -f k8s/ingress.yaml
    
    # Ожидание готовности
    kubectl rollout status deployment/doirp-app
    
    Write-Info "Деплой завершен! Проверьте статус: kubectl get pods"
}

# Основная функция
function Main {
    Write-Info "Начинаем деплой типа: $DeployType"
    
    Test-Dependencies
    Get-RegistryId
    Build-AndPush
    
    switch ($DeployType) {
        "vm" { Deploy-VM }
        "serverless" { Deploy-Serverless }
        "k8s" { Deploy-K8s }
        default {
            Write-Error "Неизвестный тип деплоя: $DeployType"
            Write-Error "Доступные варианты: vm, serverless, k8s"
            exit 1
        }
    }
    
    Write-Info "Деплой успешно завершен!"
}

# Запуск
Main
