# Скрипт для замены useAuth на useAuthBFF

Write-Host "Замена useAuth на useAuthBFF..." -ForegroundColor Green

$files = Get-ChildItem -Path "src\components" -Recurse -Include "*.tsx","*.ts" | Where-Object { $_.FullName -notmatch "node_modules" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    if ($content -match "from ['\`"].*hooks/useAuth['\`"]") {
        Write-Host "Обновление: $($file.FullName)" -ForegroundColor Yellow
        
        # Заменяем импорт
        $content = $content -replace "from ['\`"].*hooks/useAuth['\`"]", "from '../hooks/useAuthBFF'"
        $content = $content -replace "from ['\`"].*hooks/useAuth['\`"]", "from '../../hooks/useAuthBFF'"
        $content = $content -replace "from ['\`"].*hooks/useAuth['\`"]", "from '../../../hooks/useAuthBFF'"
        $content = $content -replace "from ['\`"].*hooks/useAuth['\`"]", "from '../../../../hooks/useAuthBFF'"
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}

Write-Host "Готово!" -ForegroundColor Green

