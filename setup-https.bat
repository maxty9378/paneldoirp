@echo off
echo Выберите тип SSL сертификата:
echo 1. Let's Encrypt (рекомендуется для продакшена)
echo 2. Самоподписанный сертификат (для тестирования)

set /p choice="Введите номер (1 или 2): "

if "%choice%"=="1" (
    echo Настраиваем HTTPS с Let's Encrypt сертификатом...
    scp -i "src\ssh-keys\ssh-key-1758524386393" setup-https.sh doirp777@158.160.200.214:~/
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-https.sh && ./setup-https.sh"
) else if "%choice%"=="2" (
    echo Настраиваем HTTPS с самоподписанным сертификатом...
    scp -i "src\ssh-keys\ssh-key-1758524386393" setup-https-self-signed.sh doirp777@158.160.200.214:~/
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-https-self-signed.sh && ./setup-https-self-signed.sh"
) else (
    echo Неверный выбор. Запустите скрипт снова.
    pause
    exit /b 1
)

echo HTTPS настройка завершена!
echo Приложение доступно по адресу: https://158.160.200.214
pause
