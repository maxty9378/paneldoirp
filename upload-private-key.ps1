# PowerShell скрипт для загрузки приватного ключа на сервер
# Использование: .\upload-private-key.ps1

$SSH_KEY = "src\ssh\ssh-key-doirp-01"
$VM_USER = "doirp"
$VM_IP = "51.250.94.103"
$DOMAIN = "doirp.ru"

Write-Host "🔐 Загрузка приватного ключа для $DOMAIN..." -ForegroundColor Cyan

# Проверяем наличие SSH ключа
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "❌ SSH ключ не найден: $SSH_KEY" -ForegroundColor Red
    Write-Host ""
    Write-Host "Укажите правильный путь к SSH ключу" -ForegroundColor Yellow
    exit 1
}

# Проверяем наличие файла с ключом
$keyFile = "doirp.ru.key"
if (-not (Test-Path $keyFile)) {
    Write-Host "❌ Файл с приватным ключом не найден: $keyFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Создайте файл $keyFile и вставьте ваш приватный ключ:" -ForegroundColor Yellow
    Write-Host "-----BEGIN RSA PRIVATE KEY-----" -ForegroundColor Gray
    Write-Host "...ваш ключ..." -ForegroundColor Gray
    Write-Host "-----END RSA PRIVATE KEY-----" -ForegroundColor Gray
    exit 1
}

Write-Host "📤 Загружаю ключ на сервер..." -ForegroundColor Yellow

# Загружаем ключ на сервер
scp -i $SSH_KEY $keyFile "${VM_USER}@${VM_IP}:/tmp/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Ключ загружен на сервер" -ForegroundColor Green
    Write-Host ""
    Write-Host "Подключитесь к серверу и выполните:" -ForegroundColor Yellow
    Write-Host "ssh -l $VM_USER $VM_IP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Затем выполните:" -ForegroundColor Yellow
    Write-Host "sudo mkdir -p /etc/ssl/certs/$DOMAIN" -ForegroundColor Cyan
    Write-Host "sudo mv /tmp/$keyFile /etc/ssl/certs/$DOMAIN/privkey.pem" -ForegroundColor Cyan
    Write-Host "sudo chmod 600 /etc/ssl/certs/$DOMAIN/privkey.pem" -ForegroundColor Cyan
    Write-Host "sudo chown root:root /etc/ssl/certs/$DOMAIN/privkey.pem" -ForegroundColor Cyan
} else {
    Write-Host "❌ Ошибка при загрузке ключа" -ForegroundColor Red
    exit 1
}

