@echo off
echo Настройка GitHub Actions для автоматического деплоя...
echo.

echo 1. Откройте настройки секретов GitHub:
echo    https://github.com/maxty9378/paneldoirp/settings/secrets/actions
echo.

echo 2. Нажмите "New repository secret"
echo.

echo 3. Имя секрета: SSH_PRIVATE_KEY
echo.

echo 4. Скопируйте содержимое SSH ключа из файла:
echo    src\ssh-keys\ssh-key-1758524386393
echo.

echo 5. Нажмите "Add secret"
echo.

echo 6. После добавления секрета:
echo    - Перейдите в Actions: https://github.com/maxty9378/paneldoirp/actions
echo    - Нажмите "Re-run all jobs" на последнем workflow
echo    - Или сделайте новый push для запуска деплоя
echo.

echo 7. Альтернативно используйте ручной деплой:
echo    .\update-project.bat
echo.

echo 8. Проверьте статус приложения:
echo    https://158.160.200.214
echo.

pause
