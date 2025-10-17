# Тест BFF авторизации с реальными данными

Write-Host "=== Тест BFF Health ===" -ForegroundColor Green
$health = Invoke-WebRequest -Uri http://51.250.94.103:3000/health -UseBasicParsing
Write-Host $health.Content

Write-Host "`n=== Тест BFF Sign-In (doirp.sns777@gmail.com) ===" -ForegroundColor Green
$body = @{
    email = "doirp.sns777@gmail.com"
    password = "123456"
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
    
    Write-Host "✅ Пользователь получен:" -ForegroundColor Green
    Write-Host $me.Content
} catch {
    Write-Host "❌ Ошибка авторизации:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}

