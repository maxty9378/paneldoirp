# PowerShell скрипт для настройки HTTPS
# Выберите один из вариантов: Let's Encrypt или самоподписанный сертификат

Write-Host "Выберите тип SSL сертификата:" -ForegroundColor Yellow
Write-Host "1. Let's Encrypt (рекомендуется для продакшена)" -ForegroundColor Green
Write-Host "2. Самоподписанный сертификат (для тестирования)" -ForegroundColor Yellow

$choice = Read-Host "Введите номер (1 или 2)"

# Параметры подключения
$vmUser = "doirp777"
$vmHost = "158.160.200.214"
$sshKey = "src\ssh-keys\ssh-key-1758524386393"

if ($choice -eq "1") {
    Write-Host "Настраиваем HTTPS с Let's Encrypt сертификатом..." -ForegroundColor Green
    
    # Загружаем скрипт на VM
    scp -i $sshKey setup-https.sh ${vmUser}@${vmHost}:~/
    
    # Подключаемся к VM и запускаем скрипт
    ssh -i $sshKey ${vmUser}@${vmHost} "chmod +x setup-https.sh && ./setup-https.sh"
    
} elseif ($choice -eq "2") {
    Write-Host "Настраиваем HTTPS с самоподписанным сертификатом..." -ForegroundColor Yellow
    
    # Загружаем скрипт на VM
    scp -i $sshKey setup-https-self-signed.sh ${vmUser}@${vmHost}:~/
    
    # Подключаемся к VM и запускаем скрипт
    ssh -i $sshKey ${vmUser}@${vmHost} "chmod +x setup-https-self-signed.sh && ./setup-https-self-signed.sh"
    
} else {
    Write-Host "Неверный выбор. Запустите скрипт снова." -ForegroundColor Red
    exit 1
}

Write-Host "HTTPS настройка завершена!" -ForegroundColor Green
Write-Host "Приложение доступно по адресу: https://${vmHost}" -ForegroundColor Cyan
