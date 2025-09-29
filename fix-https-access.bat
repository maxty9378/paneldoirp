@echo off
echo Решения проблемы с HTTPS доступом:
echo.
echo 1. Использовать HTTP (быстрое решение)
echo 2. Настроить HTTPS с самоподписанным сертификатом
echo 3. Настроить HTTPS с доменом + Let's Encrypt
echo.

set /p choice="Выберите вариант (1-3): "

if "%choice%"=="1" (
    echo.
    echo ✅ HTTP уже настроен!
    echo 🌐 Откройте в браузере: http://158.160.200.214
    echo ⚠️  НЕ используйте https:// - только http://
    echo.
    pause
    exit /b 0
) else if "%choice%"=="2" (
    echo Настраиваем HTTPS с самоподписанным сертификатом...
    scp -i "src\ssh-keys\ssh-key-1758524386393" setup-domain-https.sh doirp777@158.160.200.214:~/
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-domain-https.sh && ./setup-domain-https.sh"
) else if "%choice%"=="3" (
    echo.
    echo Для настройки HTTPS с доменом нужно:
    echo 1. Зарегистрировать домен (например, doirp.ru)
    echo 2. Настроить DNS записи A-запись на 158.160.200.214
    echo 3. Запустить скрипт настройки Let's Encrypt
    echo.
    echo После настройки домена запустите:
    echo scp -i "src\ssh-keys\ssh-key-1758524386393" setup-domain-ssl.sh doirp777@158.160.200.214:~/
    echo ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-domain-ssl.sh && ./setup-domain-ssl.sh"
    echo.
    pause
    exit /b 0
) else (
    echo Неверный выбор. Запустите скрипт снова.
    pause
    exit /b 1
)

echo.
echo Настройка завершена!
echo Приложение должно быть доступно по HTTPS.
pause
