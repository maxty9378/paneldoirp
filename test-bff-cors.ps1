# Тест CORS для localhost:5175

Write-Host "=== Тест CORS с localhost:5175 ===" -ForegroundColor Green

$headers = @{
    "Origin" = "http://localhost:5175"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri http://51.250.94.103:3000/health `
        -Headers $headers `
        -UseBasicParsing
    
    Write-Host "✅ CORS работает!" -ForegroundColor Green
    Write-Host "Response Headers:" -ForegroundColor Cyan
    $response.Headers | Format-List
} catch {
    Write-Host "❌ CORS ошибка:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

