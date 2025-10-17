@echo off
echo ========================================
echo Установка DOIRP BFF на Яндекс Облако VM
echo ========================================
echo.

set VM_IP=51.250.94.103
set VM_USER=doirp
set SSH_KEY=src\ssh\ssh-key-doirp-01

echo Шаг 1: Проверка SSH ключа...
if not exist "%SSH_KEY%" (
    echo ОШИБКА: SSH ключ не найден: %SSH_KEY%
    pause
    exit /b 1
)
echo SSH ключ найден
echo.

echo Шаг 2: Проверка подключения к VM...
ssh -i %SSH_KEY% -o StrictHostKeyChecking=no -o ConnectTimeout=10 %VM_USER%@%VM_IP% "echo 'Подключение успешно!'" 2>nul
if errorlevel 1 (
    echo ОШИБКА: Не удается подключиться к VM
    echo Проверьте:
    echo - SSH ключ правильный
    echo - VM доступна по IP %VM_IP%
    echo - Пользователь %VM_USER% существует
    pause
    exit /b 1
)
echo Подключение успешно!
echo.

echo Шаг 3: Установка Docker на VM...
ssh -i %SSH_KEY% %VM_USER%@%VM_IP% "sudo apt update && sudo apt install -y docker.io docker-compose"
echo.

echo Шаг 4: Создание директории проекта...
ssh -i %SSH_KEY% %VM_USER%@%VM_IP% "mkdir -p ~/doirp-bff"
echo.

echo Шаг 5: Загрузка файлов проекта...
echo Загрузка package.json...
scp -i %SSH_KEY% package.json %VM_USER%@%VM_IP%:~/doirp-bff/
echo Загрузка tsconfig.json...
scp -i %SSH_KEY% tsconfig.json %VM_USER%@%VM_IP%:~/doirp-bff/
echo Загрузка docker-compose.yml...
scp -i %SSH_KEY% docker-compose.yml %VM_USER%@%VM_IP%:~/doirp-bff/
echo Загрузка .env.example...
scp -i %SSH_KEY% .env.example %VM_USER%@%VM_IP%:~/doirp-bff/.env
echo.

echo Шаг 6: Загрузка исходного кода...
echo Загрузка директории src...
scp -i %SSH_KEY% -r src %VM_USER%@%VM_IP%:~/doirp-bff/
echo.

echo Шаг 7: Запуск BFF...
ssh -i %SSH_KEY% %VM_USER%@%VM_IP% "cd ~/doirp-bff && docker-compose up -d"
echo.

echo ========================================
echo Установка завершена!
echo BFF доступен по адресу: http://%VM_IP%:3000
echo ========================================
echo.
echo Проверка статуса:
ssh -i %SSH_KEY% %VM_USER%@%VM_IP% "cd ~/doirp-bff && docker-compose ps"
echo.
echo Просмотр логов:
ssh -i %SSH_KEY% %VM_USER%@%VM_IP% "cd ~/doirp-bff && docker-compose logs -f"
echo.
pause

