$ErrorActionPreference = "Stop"

$InstallerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BridgeRoot = Split-Path -Parent $InstallerDir
$WinSwExe = Join-Path $InstallerDir "ManAndMachine-ADMS-Bridge.exe"
$WinSwXml = Join-Path $InstallerDir "ManAndMachine-ADMS-Bridge.xml"
$EnvFile = Join-Path $BridgeRoot ".env"

# Verify Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Please run this script as Administrator."
  exit 1
}

# Verify Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Error "Node.js 22+ is not installed or not in PATH. Install Node.js LTS first."
  exit 1
}

# Verify .env exists
if (-not (Test-Path $EnvFile)) {
  Write-Error ".env file not found at $EnvFile. Copy .env.example to .env and configure BRIDGE_SHARED_SECRET first."
  exit 1
}

# Ensure WinSW binary exists (download v2.12.0 if missing)
if (-not (Test-Path $WinSwExe)) {
  $winSwUrl = "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe"
  Write-Host "Downloading WinSW-x64.exe to $WinSwExe..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $winSwUrl -OutFile $WinSwExe
}

if (-not (Test-Path $WinSwXml)) {
  Write-Error "Missing service config XML: $WinSwXml"
  exit 1
}

Write-Host "Installing Windows Service 'ManAndMachineADMSBridge'..." -ForegroundColor Cyan
& $WinSwExe install $WinSwXml

Write-Host "Hardening .env and SQLite data directory permissions..." -ForegroundColor Cyan
& (Join-Path $InstallerDir "protect-files.ps1")

Write-Host "Configuring Windows Firewall..." -ForegroundColor Cyan
& (Join-Path $InstallerDir "configure-firewall.ps1")

Write-Host "Starting Windows Service 'ManAndMachineADMSBridge'..." -ForegroundColor Cyan
& $WinSwExe start $WinSwXml

Write-Host "Service installed and started successfully!" -ForegroundColor Green
Write-Host "Verify status with: npm run status" -ForegroundColor Yellow
