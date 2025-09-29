@echo off
echo Настройка webhook для автоматического деплоя...
echo.

echo 1. Загружаем webhook скрипт на сервер...
scp -i "src\ssh-keys\ssh-key-1758524386393" webhook-deploy.sh doirp777@158.160.200.214:~/

echo 2. Настраиваем webhook на сервере...
ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x webhook-deploy.sh"

echo.
echo 3. Настройте webhook в GitHub:
echo    - Перейдите в https://github.com/maxty9378/paneldoirp/settings/hooks
echo    - Нажмите "Add webhook"
echo    - Payload URL: http://158.160.200.214:8080/webhook
echo    - Content type: application/json
echo    - Events: Just the push event
echo    - Active: ✓
echo.

echo 4. Для работы webhook нужно установить webhook сервер:
echo    - sudo apt install webhook
echo    - Создать конфигурацию webhook
echo.

echo 5. Альтернативно используйте GitHub Actions (уже настроено в .github/workflows/deploy.yml)
echo.

pause
