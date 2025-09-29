@echo off
echo Обновляем сертификат из Yandex Cloud Certificate Manager...
echo.

echo Загружаем скрипт обновления на виртуальную машину...
scp -i "src\ssh-keys\ssh-key-1758524386393" update-yandex-certificate.sh doirp777@158.160.200.214:~/

echo Запускаем обновление сертификата...
ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x update-yandex-certificate.sh && ./update-yandex-certificate.sh"

echo.
echo Сертификат из Yandex Cloud обновлен!
echo Приложение доступно по адресу: https://158.160.200.214
echo ID сертификата: fpqt314vthq5r8tt535h
pause
