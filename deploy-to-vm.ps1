# PowerShell скрипт для деплоя на виртуальную машину
# Загружает скрипт на VM и запускает его

Write-Host "Начинаем деплой DOIRP приложения на виртуальную машину..." -ForegroundColor Green

# Параметры подключения
$vmUser = "doirp777"
$vmHost = "158.160.200.214"
$sshKey = "src\ssh-keys\ssh-key-1758524386393"

Write-Host "Загружаем скрипт деплоя на виртуальную машину..." -ForegroundColor Yellow

# Загружаем скрипт на VM
scp -i $sshKey deploy-to-vm.sh ${vmUser}@${vmHost}:~/

Write-Host "Подключаемся к виртуальной машине..." -ForegroundColor Yellow

# Подключаемся к VM и запускаем скрипт
ssh -i $sshKey ${vmUser}@${vmHost} "chmod +x deploy-to-vm.sh && ./deploy-to-vm.sh"

Write-Host "Деплой завершен!" -ForegroundColor Green
Write-Host "Приложение доступно по адресу: http://${vmHost}" -ForegroundColor Cyan