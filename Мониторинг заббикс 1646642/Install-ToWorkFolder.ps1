# Install-ToWorkFolder.ps1
# Копирует этот комплект в C:\Работа\Заслон\Мониторинг заббикс 1646642

[CmdletBinding()]
param(
    [string]$Destination = 'C:\Работа\Заслон\Мониторинг заббикс 1646642'
)

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
if ($src.TrimEnd('\') -ieq $Destination.TrimEnd('\')) {
    Write-Host "Комплект уже в $Destination"
    exit 0
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
Copy-Item -Path (Join-Path $src '*') -Destination $Destination -Recurse -Force
Write-Host "Скопировано в $Destination"
Write-Host "Дальше: $Destination\РАЗВЕРТЫВАНИЕ.md"
