# Скрипт для деплоя обновленных функций Supabase
# Использование: .\deploy-supabase-functions.ps1

Write-Host "🚀 Деплой обновленных функций Supabase..." -ForegroundColor Cyan
Write-Host ""

# Функции, которые нужно задеплоить (используют URL приложения)
$functions = @(
    "generate-persistent-qr",
    "auth-by-qr-token", 
    "qr-direct-auth"
)

Write-Host "📋 Функции для деплоя:" -ForegroundColor Yellow
foreach ($func in $functions) {
    Write-Host "  - $func" -ForegroundColor White
}
Write-Host ""

# Проверяем наличие Supabase CLI
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI не найден!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите Supabase CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Supabase CLI найден" -ForegroundColor Green
Write-Host ""

# Проверяем, связан ли проект
Write-Host "🔍 Проверяем связанный проект..." -ForegroundColor Yellow
$projectLink = supabase projects list 2>&1 | Select-String -Pattern "LINKED"
if ($projectLink) {
    Write-Host "✅ Проект связан" -ForegroundColor Green
} else {
    Write-Host "⚠️  Проект не связан. Нужно связать проект." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Свяжите проект:" -ForegroundColor Yellow
    Write-Host "  supabase link --project-ref <PROJECT_REF>" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Или задеплойте функции напрямую:" -ForegroundColor Yellow
    Write-Host "  supabase functions deploy <function-name> --project-ref <PROJECT_REF>" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "🚀 Начинаем деплой функций..." -ForegroundColor Cyan
Write-Host ""

# Деплоим каждую функцию
foreach ($func in $functions) {
    Write-Host "📦 Деплой функции: $func" -ForegroundColor Yellow
    supabase functions deploy $func
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func задеплоена успешно" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка при деплое $func" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "✅ Деплой завершен!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Что было обновлено:" -ForegroundColor Cyan
Write-Host "  - generate-persistent-qr: использует https://doirp.ru вместо IP" -ForegroundColor White
Write-Host "  - auth-by-qr-token: использует https://doirp.ru вместо IP" -ForegroundColor White
Write-Host "  - qr-direct-auth: использует https://doirp.ru вместо IP" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Проверьте постоянный QR - теперь он должен использовать домен doirp.ru" -ForegroundColor Yellow

