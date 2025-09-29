@echo off
echo Решения проблемы с блокировкой Касперского:
echo.
echo 1. Настроить домен + Let's Encrypt (рекомендуется)
echo 2. Настроить Cloudflare SSL (бесплатно)
echo 3. Временно использовать HTTP (быстрое решение)
echo 4. Добавить сертификат в доверенные в Касперском
echo.

set /p choice="Выберите вариант (1-4): "

if "%choice%"=="1" (
    echo Настраиваем домен + Let's Encrypt...
    echo ВАЖНО: Сначала нужно зарегистрировать домен doirp.yandexcloud.ru
    echo или другой домен и настроить DNS записи
    scp -i "src\ssh-keys\ssh-key-1758524386393" setup-domain-ssl.sh doirp777@158.160.200.214:~/
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-domain-ssl.sh && ./setup-domain-ssl.sh"
) else if "%choice%"=="2" (
    echo Настраиваем Cloudflare SSL...
    scp -i "src\ssh-keys\ssh-key-1758524386393" setup-cloudflare-free.sh doirp777@158.160.200.214:~/
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-cloudflare-free.sh && ./setup-cloudflare-free.sh"
) else if "%choice%"=="3" (
    echo Настраиваем HTTP доступ...
    scp -i "src\ssh-keys\ssh-key-1758524386393" setup-http-access.sh doirp777@158.160.200.214:~/
    ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-http-access.sh && ./setup-http-access.sh"
) else if "%choice%"=="4" (
    echo Инструкция по добавлению сертификата в доверенные:
    echo.
    echo 1. Откройте Касперский
    echo 2. Перейдите в "Настройки" - "Дополнительно" - "Угрозы и исключения"
    echo 3. Нажмите "Добавить" в разделе "Исключения"
    echo 4. Выберите "Веб-сайт"
    echo 5. Введите адрес: https://158.160.200.214
    echo 6. Нажмите "Добавить"
    echo.
    echo ИЛИ
    echo.
    echo 1. В браузере нажмите на замок рядом с адресом
    echo 2. Выберите "Сертификат"
    echo 3. Нажмите "Установить сертификат"
    echo 4. Выберите "Локальный компьютер"
    echo 5. Разместите в "Доверенные корневые центры сертификации"
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
echo Приложение должно быть доступно без блокировки Касперского.
pause
