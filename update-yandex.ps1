# PowerShell script for updating DOIRP on Yandex Cloud VM
Write-Host "Starting DOIRP application update on Yandex Cloud VM..." -ForegroundColor Green

# Connection parameters
$vmUser = "doirp777"
$vmHost = "158.160.200.214"
$sshKey = "src\ssh-keys\ssh-key-1758524386393"

Write-Host "Uploading update script to virtual machine..." -ForegroundColor Yellow

# Upload auto-update script to VM
scp -i $sshKey auto-update.sh ${vmUser}@${vmHost}:~/

Write-Host "Connecting to virtual machine and running update..." -ForegroundColor Yellow

# Connect to VM and run update script
ssh -i $sshKey ${vmUser}@${vmHost} "cd ~/paneldoirp && chmod +x ~/auto-update.sh && ~/auto-update.sh"

Write-Host "Update completed!" -ForegroundColor Green
Write-Host "Application available at: http://${vmHost}" -ForegroundColor Cyan

