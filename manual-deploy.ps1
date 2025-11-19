# Скрипт для ручного деплоя на Yandex VM
# Использование: .\manual-deploy.ps1

Write-Host "🚀 Начинаем ручной деплой на Yandex VM..." -ForegroundColor Green

# Параметры подключения
$SERVER_HOST = "51.250.94.103"
$SERVER_USER = "doirp"
$DEPLOY_PATH = "/var/www/doirp"
$ARCHIVE = "doirp-deploy.tar.gz"

# Проверяем наличие архива
if (-not (Test-Path $ARCHIVE)) {
    Write-Host "❌ Архив $ARCHIVE не найден!" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Архив найден: $ARCHIVE" -ForegroundColor Green
$fileSize = (Get-Item $ARCHIVE).Length / 1MB
Write-Host "📊 Размер архива: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan

# Загружаем архив на сервер
Write-Host "📤 Загружаем архив на сервер..." -ForegroundColor Yellow
scp $ARCHIVE "${SERVER_USER}@${SERVER_HOST}:/tmp/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при загрузке архива!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Архив загружен на сервер" -ForegroundColor Green

# Подключаемся к серверу и выполняем деплой
Write-Host "🔧 Выполняем деплой на сервере..." -ForegroundColor Yellow

$deployScript = @"
echo '🧹 Очищаем старую версию...'
sudo rm -rf /var/www/doirp/*
sudo rm -rf /var/www/doirp/.* 2>/dev/null || true

echo '📦 Распаковываем новую версию...'
cd /tmp
sudo tar -xzf doirp-deploy.tar.gz -C /var/www/doirp/

echo '🔒 Устанавливаем права доступа...'
sudo chown -R www-data:www-data /var/www/doirp/
sudo chmod -R 755 /var/www/doirp/

echo '🔄 Перезагружаем Nginx...'
sudo systemctl reload nginx

echo '🧹 Очищаем временные файлы...'
rm -f /tmp/doirp-deploy.tar.gz

echo '✅ Деплой завершен успешно!'
"@

ssh "${SERVER_USER}@${SERVER_HOST}" $deployScript

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy completed successfully!" -ForegroundColor Green
    Write-Host "Application available at: https://$SERVER_HOST" -ForegroundColor Cyan
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
    exit 1
}

