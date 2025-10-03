# PowerShell script for deployment to virtual machine
# Uploads script to VM and runs it

Write-Host "Starting DOIRP application deployment to virtual machine..." -ForegroundColor Green

# Connection parameters
$vmUser = "doirp777"
$vmHost = "158.160.200.214"
$sshKey = "src\ssh-keys\ssh-key-1758524386393"

Write-Host "Uploading deployment script to virtual machine..." -ForegroundColor Yellow

# Upload script to VM
scp -i $sshKey deploy-to-vm.sh ${vmUser}@${vmHost}:~/

Write-Host "Connecting to virtual machine..." -ForegroundColor Yellow

# Connect to VM and run script
ssh -i $sshKey ${vmUser}@${vmHost} "chmod +x deploy-to-vm.sh && ./deploy-to-vm.sh"

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Application available at: http://$vmHost" -ForegroundColor Cyan
