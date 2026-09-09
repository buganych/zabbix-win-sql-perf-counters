# Send-Snapshot.ps1
# Разовый снимок и отправка в Zabbix trapper (zabbix_sender).

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ZabbixServer,
    [string]$ZabbixHost = $env:COMPUTERNAME,
    [int]$Port = 10051,
    [string]$SqlInstance = '.',
    [string]$SenderExe
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $PSScriptRoot
$collector = Join-Path $here '01-Хост-Windows\Collect-WinMssqlSnapshot.ps1'
if (-not (Test-Path $collector)) {
    $collector = Join-Path $PSScriptRoot '..\01-Хост-Windows\Collect-WinMssqlSnapshot.ps1'
}

$work = Join-Path $env:TEMP 'win-mssql-snapshot'
New-Item -ItemType Directory -Force -Path $work | Out-Null
$json = Join-Path $work 'snapshot.json'
$senderFile = Join-Path $work 'snapshot-zabbix_sender.txt'

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $collector `
    -SqlInstance $SqlInstance -OutFile $json -SenderFile $senderFile -ZabbixHost $ZabbixHost

if (-not $SenderExe) {
    $SenderExe = @(
        'C:\Program Files\Zabbix Agent 2\zabbix_sender.exe',
        'C:\Program Files\Zabbix Agent\zabbix_sender.exe'
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $SenderExe) {
    throw 'Не найден zabbix_sender.exe. Укажите -SenderExe. Файл данных: ' + $senderFile
}

& $SenderExe -z $ZabbixServer -p $Port -i $senderFile
Write-Host "JSON: $json"
Write-Host "Sender: $senderFile"
