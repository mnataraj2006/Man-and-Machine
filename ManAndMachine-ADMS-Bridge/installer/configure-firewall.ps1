param(
  [int]$Port = 8081,
  [string]$DeviceIp = "192.168.0.203"
)

$ErrorActionPreference = "Stop"

$RuleName = "ManAndMachine-ADMS-Bridge-TCP-$Port"

Write-Host "Configuring Windows Defender Firewall rule '$RuleName'..." -ForegroundColor Cyan

$existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($existing) {
  Remove-NetFirewallRule -DisplayName $RuleName
}

if ([string]::IsNullOrWhiteSpace($DeviceIp)) {
  New-NetFirewallRule `
    -DisplayName $RuleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $Port `
    -Action Allow `
    -Profile Private,Domain | Out-Null
  Write-Host "Allowed inbound TCP port $Port on Private/Domain networks." -ForegroundColor Green
} else {
  New-NetFirewallRule `
    -DisplayName $RuleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $Port `
    -RemoteAddress $DeviceIp `
    -Action Allow `
    -Profile Private,Domain,Public | Out-Null
  Write-Host "Allowed inbound TCP port $Port specifically from eSSL X2008 IP $DeviceIp." -ForegroundColor Green
}
