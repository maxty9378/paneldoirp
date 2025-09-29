@echo off
echo Выберите тип SSL сертификата:
echo 1. Let's Encrypt (рекомендуется - признается всеми браузерами)
echo 2. Российский самоподписанный сертификат (с данными ООО)
echo 3. Cloudflare SSL (альтернативный вариант)

set /p choice="Введите номер (1, 2 или 3): "

if "%choice%"=="1" (
    echo Настраиваем Let's Encrypt сертификат...
    scp -i "src\ssh-keys\ssh-key-1758524386393" setup-letsencrypt.sh doirp777@158.160.200.214:~/
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-letsencrypt.sh && ./setup-letsencrypt.sh"
) else if "%choice%"=="2" (
    echo Настраиваем российский самоподписанный сертификат...
    echo Создаем сертификат с данными ООО ДОИРП...
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "sudo mkdir -p /etc/ssl/certs/doirp && sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/certs/doirp/privkey.pem -out /etc/ssl/certs/doirp/fullchain.pem -subj '/C=RU/ST=Moscow/L=Moscow/O=ООО ДОИРП/OU=IT Department/CN=158.160.200.214/emailAddress=d0irp@yandex.ru'"
    echo Сертификат создан с данными ООО ДОИРП
) else if "%choice%"=="3" (
    echo Настраиваем Cloudflare SSL...
    scp -i "src\ssh-keys\ssh-key-1758524386393" setup-cloudflare-ssl.sh doirp777@158.160.200.214:~/
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-cloudflare-ssl.sh && ./setup-cloudflare-ssl.sh"
) else (
    echo Неверный выбор. Запустите скрипт снова.
    pause
    exit /b 1
)

echo SSL настройка завершена!
echo Приложение доступно по адресу: https://158.160.200.214
pause
