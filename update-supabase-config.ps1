# Скрипт для обновления конфигурации Supabase на Яндекс.Облако
# Выполните после развертывания Supabase на ВМ

param(
    [string]$YandexIP = "51.250.94.103",
    [string]$AnonKey = ""
)

Write-Host "🔧 Обновление конфигурации Supabase..." -ForegroundColor Cyan

# Если ключ не указан, запрашиваем
if ([string]::IsNullOrEmpty($AnonKey)) {
    Write-Host "Введите ANON_KEY из файла ~/supabase/.env на ВМ:" -ForegroundColor Yellow
    $AnonKey = Read-Host
}

# Создаем или обновляем .env.production.local
$envFile = ".env.production.local"
$supabaseUrl = "http://$YandexIP:8000"

$envContent = @"
# Supabase на Яндекс.Облако
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$AnonKey
"@

Set-Content -Path $envFile -Value $envContent -Encoding UTF8

Write-Host "✅ Конфигурация обновлена!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Новые настройки:" -ForegroundColor Cyan
Write-Host "  URL: $supabaseUrl" -ForegroundColor White
Write-Host "  Key: $($AnonKey.Substring(0, [Math]::Min(20, $AnonKey.Length)))..." -ForegroundColor White
Write-Host ""
Write-Host "🔄 Пересоберите приложение:" -ForegroundColor Yellow
Write-Host "  npm run build" -ForegroundColor White

