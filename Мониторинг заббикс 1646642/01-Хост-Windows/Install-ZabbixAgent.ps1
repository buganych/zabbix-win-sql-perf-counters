# Install-ZabbixAgent.ps1
# Копирует коллектор и UserParameter на Windows-хост с Zabbix agent / agent 2.
# Запускать от администратора.

[CmdletBinding()]
param(
    [string]$ScriptDir = 'C:\zabbix',
    [string]$SqlInstance = '.',
    [string]$AgentConfDir,
    [switch]$RestartAgent
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$here = $PSScriptRoot
if (-not $AgentConfDir) {
    $candidates = @(
        'C:\Program Files\Zabbix Agent 2\zabbix_agent2.d',
        'C:\Program Files\Zabbix Agent 2\conf\zabbix_agent2.d',
        'C:\Program Files\Zabbix Agent\zabbix_agentd.d',
        'C:\zabbix\conf\zabbix_agent2.d'
    )
    $AgentConfDir = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $AgentConfDir) {
    throw 'Не найден каталог zabbix_agent2.d. Укажите -AgentConfDir.'
}

New-Item -ItemType Directory -Force -Path $ScriptDir | Out-Null

Copy-Item -Force (Join-Path $here 'Collect-WinMssqlSnapshot.ps1') (Join-Path $ScriptDir 'Collect-WinMssqlSnapshot.ps1')
Copy-Item -Force (Join-Path $here 'Get-MssqlCounters.sql') (Join-Path $ScriptDir 'Get-MssqlCounters.sql')

$settings = @"
# Сгенерировано Install-ZabbixAgent.ps1
`$SqlInstance = '$SqlInstance'
"@
$utf8bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText((Join-Path $ScriptDir 'settings.ps1'), $settings, $utf8bom)

$scriptPath = Join-Path $ScriptDir 'Collect-WinMssqlSnapshot.ps1'
$conf = @"
# Windows OS + MSSQL snapshot (задача 1646642)
# Два образца Get-Counter, timeout агента не меньше 10 с.

Timeout=10
UnsafeUserParameters=1
UserParameter=win.mssql.snapshot,powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$scriptPath" -Stdout
"@
$confPath = Join-Path $AgentConfDir 'win-mssql-snapshot.conf'
[System.IO.File]::WriteAllText($confPath, $conf, $utf8bom)

Write-Host "Коллектор: $scriptPath"
Write-Host "UserParameter: $confPath"
Write-Host "Проверьте Include= в zabbix_agent2.conf на каталог $AgentConfDir"
Write-Host "На сервере Zabbix импортируйте шаблон из папки 02-Zabbix-сервер"

if ($RestartAgent) {
    $svc = Get-Service -Name 'Zabbix Agent 2','Zabbix Agent' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($svc) {
        Restart-Service -Name $svc.Name
        Write-Host "Служба $($svc.Name) перезапущена"
    } else {
        Write-Warning 'Служба Zabbix Agent не найдена — перезапустите вручную.'
    }
}
