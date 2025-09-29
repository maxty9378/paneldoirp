@echo off
echo Начинаем деплой DOIRP приложения на виртуальную машину...

echo Загружаем скрипт деплоя на виртуальную машину...
scp -i "src\ssh-keys\ssh-key-1758524386393" deploy-to-vm.sh doirp777@158.160.200.214:~/

echo Подключаемся к виртуальной машине...
ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x deploy-to-vm.sh && ./deploy-to-vm.sh"

echo Деплой завершен!
echo Приложение доступно по адресу: http://158.160.200.214
pause
