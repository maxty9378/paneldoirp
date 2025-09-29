@echo off
echo Настраиваем HTTPS с самоподписанным сертификатом...
scp -i "src\ssh-keys\ssh-key-1758524386393" setup-https-self-signed.sh doirp777@158.160.200.214:~/
ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "chmod +x setup-https-self-signed.sh && ./setup-https-self-signed.sh"
echo HTTPS настройка завершена!
echo Приложение доступно по адресу: https://158.160.200.214
pause
