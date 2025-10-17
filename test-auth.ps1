# Test BFF authorization
$ErrorActionPreference = "Continue"
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

Write-Host "=== Testing BFF Health ===" -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "https://51.250.94.103:3001/health" -UseBasicParsing
    Write-Host "Health Status: $($healthResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($healthResponse.Content)" -ForegroundColor Green
} catch {
    Write-Host "Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Testing Sign In ===" -ForegroundColor Cyan
$body = @{
    email = "doirp.sns777@gmail.com"
    password = "123456"
} | ConvertTo-Json

try {
    $signInResponse = Invoke-WebRequest -Uri "https://51.250.94.103:3001/auth/sign-in" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing `
        -SessionVariable session
    
    Write-Host "Sign In Status: $($signInResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($signInResponse.Content)" -ForegroundColor Green
    
    # Check cookies
    Write-Host "`nCookies received:" -ForegroundColor Yellow
    foreach ($cookie in $session.Cookies.GetCookies("https://51.250.94.103:3001")) {
        Write-Host "  - $($cookie.Name): $($cookie.Value.Substring(0, [Math]::Min(50, $cookie.Value.Length)))..." -ForegroundColor Yellow
    }
    
    # Test /auth/me with session
    Write-Host "`n=== Testing /auth/me ===" -ForegroundColor Cyan
    try {
        $meResponse = Invoke-WebRequest -Uri "https://51.250.94.103:3001/auth/me" `
            -Method GET `
            -WebSession $session `
            -UseBasicParsing
        
        Write-Host "/auth/me Status: $($meResponse.StatusCode)" -ForegroundColor Green
        Write-Host "User Data: $($meResponse.Content)" -ForegroundColor Green
    } catch {
        Write-Host "/auth/me Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Sign In Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response: $responseBody" -ForegroundColor Red
    }
}

