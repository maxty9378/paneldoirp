# PowerShell скрипт для настройки российского SSL сертификата

Write-Host "Выберите тип SSL сертификата:" -ForegroundColor Yellow
Write-Host "1. Let's Encrypt (рекомендуется - признается всеми браузерами)" -ForegroundColor Green
Write-Host "2. Российский самоподписанный сертификат (с данными ООО)" -ForegroundColor Yellow
Write-Host "3. Cloudflare SSL (альтернативный вариант)" -ForegroundColor Cyan

$choice = Read-Host "Введите номер (1, 2 или 3)"

# Параметры подключения
$vmUser = "doirp777"
$vmHost = "158.160.200.214"
$sshKey = "src\ssh-keys\ssh-key-1758524386393"

if ($choice -eq "1") {
    Write-Host "Настраиваем Let's Encrypt сертификат..." -ForegroundColor Green
    
    # Загружаем скрипт на VM
    scp -i $sshKey setup-letsencrypt.sh ${vmUser}@${vmHost}:~/
    
    # Подключаемся к VM и запускаем скрипт
    ssh -i $sshKey ${vmUser}@${vmHost} "chmod +x setup-letsencrypt.sh && ./setup-letsencrypt.sh"
    
} elseif ($choice -eq "2") {
    Write-Host "Настраиваем российский самоподписанный сертификат..." -ForegroundColor Yellow
    
    # Создаем скрипт для российского сертификата
    $russianScript = @"
#!/bin/bash
echo "Создаем российский самоподписанный сертификат..."
sudo mkdir -p /etc/ssl/certs/doirp
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/certs/doirp/privkey.pem \
    -out /etc/ssl/certs/doirp/fullchain.pem \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=ООО ДОИРП/OU=IT Department/CN=158.160.200.214/emailAddress=d0irp@yandex.ru"
echo "Сертификат создан с данными ООО ДОИРП"
"@
    
    # Загружаем скрипт на VM
    echo $russianScript | scp -i $sshKey - ${vmUser}@${vmHost}:~/setup-russian-cert.sh
    
    # Подключаемся к VM и запускаем скрипт
    ssh -i $sshKey ${vmUser}@${vmHost} "chmod +x setup-russian-cert.sh && ./setup-russian-cert.sh"
    
} elseif ($choice -eq "3") {
    Write-Host "Настраиваем Cloudflare SSL..." -ForegroundColor Cyan
    
    # Загружаем скрипт на VM
    scp -i $sshKey setup-cloudflare-ssl.sh ${vmUser}@${vmHost}:~/
    
    # Подключаемся к VM и запускаем скрипт
    ssh -i $sshKey ${vmUser}@${vmHost} "chmod +x setup-cloudflare-ssl.sh && ./setup-cloudflare-ssl.sh"
    
} else {
    Write-Host "Неверный выбор. Запустите скрипт снова." -ForegroundColor Red
    exit 1
}

Write-Host "SSL настройка завершена!" -ForegroundColor Green
Write-Host "Приложение доступно по адресу: https://${vmHost}" -ForegroundColor Cyan
