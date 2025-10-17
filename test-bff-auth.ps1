# Тест BFF авторизации

Write-Host "=== Тест BFF Health ===" -ForegroundColor Green
$health = Invoke-WebRequest -Uri http://51.250.94.103:3000/health -UseBasicParsing
Write-Host $health.Content

Write-Host "`n=== Тест BFF Sign-In ===" -ForegroundColor Green
$body = @{
    email = "test@sns.ru"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri http://51.250.94.103:3000/auth/sign-in `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing `
        -SessionVariable session
    
    Write-Host "✅ Авторизация успешна!" -ForegroundColor Green
    Write-Host $response.Content
    
    Write-Host "`n=== Проверка /auth/me ===" -ForegroundColor Green
    $me = Invoke-WebRequest -Uri http://51.250.94.103:3000/auth/me `
        -WebSession $session `
        -UseBasicParsing
    
    Write-Host $me.Content
} catch {
    Write-Host "❌ Ошибка авторизации:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.Exception.Response.StatusCode
}

