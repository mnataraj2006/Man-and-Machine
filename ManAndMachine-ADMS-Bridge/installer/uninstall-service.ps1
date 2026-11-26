$ErrorActionPreference = "Stop"

$InstallerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WinSwExe = Join-Path $InstallerDir "ManAndMachine-ADMS-Bridge.exe"
$WinSwXml = Join-Path $InstallerDir "ManAndMachine-ADMS-Bridge.xml"

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Please run this script as Administrator."
  exit 1
}

if (Test-Path $WinSwExe) {
  Write-Host "Stopping service..." -ForegroundColor Cyan
  & $WinSwExe stop $WinSwXml 2>$null
  Write-Host "Uninstalling service..." -ForegroundColor Cyan
  & $WinSwExe uninstall $WinSwXml
  Write-Host "Service uninstalled." -ForegroundColor Green
} else {
  Write-Warning "WinSW executable not found at $WinSwExe. Attempting sc.exe delete..."
  sc.exe stop ManAndMachineADMSBridge 2>$null
  sc.exe delete ManAndMachineADMSBridge
}
