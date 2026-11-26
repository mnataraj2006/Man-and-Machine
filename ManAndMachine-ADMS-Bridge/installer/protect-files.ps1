$ErrorActionPreference = "Stop"

$InstallerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BridgeRoot = Split-Path -Parent $InstallerDir
$EnvFile = Join-Path $BridgeRoot ".env"
$DataDir = Join-Path $BridgeRoot "data"

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Please run this script as Administrator."
  exit 1
}

if (-not (Test-Path $DataDir)) {
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

function Restrict-Path($TargetPath) {
  if (-not (Test-Path $TargetPath)) { return }
  Write-Host "Hardening NTFS permissions on $TargetPath..." -ForegroundColor Cyan
  & icacls $TargetPath /inheritance:r | Out-Null
  & icacls $TargetPath /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    & icacls $TargetPath /grant:r "SYSTEM:F" "Administrators:F" | Out-Null
  }
}

Restrict-Path $EnvFile
Restrict-Path $DataDir

Write-Host "File permissions hardened (SYSTEM and Administrators only)." -ForegroundColor Green
