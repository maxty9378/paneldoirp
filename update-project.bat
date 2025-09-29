@echo off
echo Обновление проекта с GitHub...
echo.

echo Загружаем скрипт обновления на виртуальную машину...
scp -i "src\ssh-keys\ssh-key-1758524386393" auto-update.sh doirp777@158.160.200.214:~/

echo Запускаем обновление проекта...
ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x auto-update.sh && ./auto-update.sh"

echo.
echo Обновление завершено!
echo Приложение доступно по адресу: https://158.160.200.214
pause
