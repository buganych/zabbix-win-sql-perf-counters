# Collect-WinMssqlSnapshot.ps1
# One-shot Windows PerfMon + SQL Server counters for Zabbix.
# Cooked values, same family as perfmon.exe / typeperf -sc 1.

[CmdletBinding()]
param(
    [string]$SqlInstance = '.',
    [string]$SqlUser,
    [string]$SqlPassword,
    [string]$OutFile = '.\snapshot.json',
    [string]$SenderFile,
    [string]$ZabbixHost,
    [int]$SampleInterval = 1,
    [switch]$Stdout,
    [switch]$SkipSql,
    [switch]$SkipDmv
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$settingsFile = Join-Path $PSScriptRoot 'settings.ps1'
if ((Test-Path -LiteralPath $settingsFile) -and -not $PSBoundParameters.ContainsKey('SqlInstance')) {
    . $settingsFile
}

function Write-Err([string]$Message) {
    [Console]::Error.WriteLine($Message)
}

function Normalize-Path([string]$Path) {
    if ([string]::IsNullOrEmpty($Path)) { return $Path }
    return ($Path -replace '^\\\\[^\\]+\\', '\')
}

$osMap = [ordered]@{
    'os.cpu.util'                   = '\Processor Information(_Total)\% Processor Time'
    'os.cpu.privileged'             = '\Processor Information(_Total)\% Privileged Time'
    'os.cpu.user'                  = '\Processor Information(_Total)\% User Time'
    'os.cpu.interrupt'            = '\Processor Information(_Total)\% Interrupt Time'
    'os.cpu.dpc'                   = '\Processor Information(_Total)\% DPC Time'
    'os.cpu.queue'                 = '\System\Processor Queue Length'
    'os.system.context_switches'    = '\System\Context Switches/sec'
    'os.system.threads'             = '\System\Threads'
    'os.memory.available_mbytes'    = '\Memory\Available MBytes'
    'os.memory.committed_pct'       = '\Memory\% Committed Bytes In Use'
    'os.memory.pages_sec'           = '\Memory\Pages/sec'
    'os.memory.page_faults_sec'     = '\Memory\Page Faults/sec'
    'os.memory.pool_nonpaged'       = '\Memory\Pool Nonpaged Bytes'
    'os.memory.free_pte'            = '\Memory\Free System Page Table Entries'
    'os.paging.usage'               = '\Paging File(_Total)\% Usage'
    'os.disk.reads_sec'             = '\PhysicalDisk(_Total)\Disk Reads/sec'
    'os.disk.writes_sec'            = '\PhysicalDisk(_Total)\Disk Writes/sec'
    'os.disk.queue'                 = '\PhysicalDisk(_Total)\Current Disk Queue Length'
    'os.disk.idle'                  = '\PhysicalDisk(_Total)\% Idle Time'
    'os.disk.avg_read_sec'          = '\PhysicalDisk(_Total)\Avg. Disk sec/Read'
    'os.disk.avg_write_sec'         = '\PhysicalDisk(_Total)\Avg. Disk sec/Write'
}

$sqlRel = [ordered]@{
    'mssql.buffer_cache_hit_ratio'  = ':Buffer Manager\Buffer cache hit ratio'
    'mssql.page_life_expectancy'     = ':Buffer Manager\Page life expectancy'
    'mssql.lazy_writes_sec'         = ':Buffer Manager\Lazy writes/sec'
    'mssql.checkpoint_pages_sec'    = ':Buffer Manager\Checkpoint pages/sec'
    'mssql.page_reads_sec'           = ':Buffer Manager\Page reads/sec'
    'mssql.page_writes_sec'          = ':Buffer Manager\Page writes/sec'
    'mssql.free_list_stalls_sec'     = ':Buffer Manager\Free list stalls/sec'
    'mssql.batch_requests_sec'       = ':SQL Statistics\Batch Requests/sec'
    'mssql.sql_compilations_sec'     = ':SQL Statistics\SQL Compilations/sec'
    'mssql.sql_recompilations_sec'   = ':SQL Statistics\SQL Re-Compilations/sec'
    'mssql.user_connections'         = ':General Statistics\User Connections'
    'mssql.processes_blocked'        = ':General Statistics\Processes blocked'
    'mssql.logins_sec'              = ':General Statistics\Logins/sec'
    'mssql.total_server_memory_kb'  = ':Memory Manager\Total Server Memory (KB)'
    'mssql.target_server_memory_kb'  = ':Memory Manager\Target Server Memory (KB)'
    'mssql.memory_grants_pending'    = ':Memory Manager\Memory Grants Pending'
    'mssql.lock_waits_sec'           = ':Locks(_Total)\Lock Waits/sec'
    'mssql.deadlocks_sec'            = ':Locks(_Total)\Number of Deadlocks/sec'
    'mssql.full_scans_sec'           = ':Access Methods\Full Scans/sec'
    'mssql.index_searches_sec'      = ':Access Methods\Index Searches/sec'
    'mssql.page_splits_sec'          = ':Access Methods\Page Splits/sec'
    'mssql.latch_waits_sec'          = ':Latches\Latch Waits/sec'
}

$metaNames = @{
    'os.cpu.util' = @('CPU', 'Загрузка CPU', '%')
    'os.cpu.privileged' = @('CPU', 'CPU privileged time', '%')
    'os.cpu.user' = @('CPU', 'CPU user time', '%')
    'os.cpu.interrupt' = @('CPU', 'CPU interrupt time', '%')
    'os.cpu.dpc' = @('CPU', 'CPU DPC time', '%')
    'os.cpu.queue' = @('CPU', 'Processor Queue Length', 'count')
    'os.system.context_switches' = @('Система', 'Context Switches/sec', '/sec')
    'os.system.threads' = @('Система', 'Threads', 'count')
    'os.memory.available_mbytes' = @('Память', 'Available MBytes', 'MB')
    'os.memory.committed_pct' = @('Память', '% Committed Bytes In Use', '%')
    'os.memory.pages_sec' = @('Память', 'Pages/sec', '/sec')
    'os.memory.page_faults_sec' = @('Память', 'Page Faults/sec', '/sec')
    'os.memory.pool_nonpaged' = @('Память', 'Pool Nonpaged Bytes', 'bytes')
    'os.memory.free_pte' = @('Память', 'Free System Page Table Entries', 'count')
    'os.paging.usage' = @('Память', 'Paging File % Usage', '%')
    'os.disk.reads_sec' = @('Диск', 'Disk Reads/sec (_Total)', '/sec')
    'os.disk.writes_sec' = @('Диск', 'Disk Writes/sec (_Total)', '/sec')
    'os.disk.queue' = @('Диск', 'Current Disk Queue Length', 'count')
    'os.disk.idle' = @('Диск', '% Idle Time', '%')
    'os.disk.avg_read_sec' = @('Диск', 'Avg. Disk sec/Read', 'sec')
    'os.disk.avg_write_sec' = @('Диск', 'Avg. Disk sec/Write', 'sec')
    'mssql.buffer_cache_hit_ratio' = @('Buffer Manager', 'Buffer cache hit ratio', '%')
    'mssql.page_life_expectancy' = @('Buffer Manager', 'Page life expectancy', 'sec')
    'mssql.lazy_writes_sec' = @('Buffer Manager', 'Lazy writes/sec', '/sec')
    'mssql.checkpoint_pages_sec' = @('Buffer Manager', 'Checkpoint pages/sec', '/sec')
    'mssql.page_reads_sec' = @('Buffer Manager', 'Page reads/sec', '/sec')
    'mssql.page_writes_sec' = @('Buffer Manager', 'Page writes/sec', '/sec')
    'mssql.free_list_stalls_sec' = @('Buffer Manager', 'Free list stalls/sec', '/sec')
    'mssql.batch_requests_sec' = @('SQL Statistics', 'Batch Requests/sec', '/sec')
    'mssql.sql_compilations_sec' = @('SQL Statistics', 'SQL Compilations/sec', '/sec')
    'mssql.sql_recompilations_sec' = @('SQL Statistics', 'SQL Re-Compilations/sec', '/sec')
    'mssql.user_connections' = @('General Statistics', 'User Connections', 'count')
    'mssql.processes_blocked' = @('General Statistics', 'Processes blocked', 'count')
    'mssql.logins_sec' = @('General Statistics', 'Logins/sec', '/sec')
    'mssql.total_server_memory_kb' = @('Memory Manager', 'Total Server Memory', 'KB')
    'mssql.target_server_memory_kb' = @('Memory Manager', 'Target Server Memory', 'KB')
    'mssql.memory_grants_pending' = @('Memory Manager', 'Memory Grants Pending', 'count')
    'mssql.lock_waits_sec' = @('Locks', 'Lock Waits/sec', '/sec')
    'mssql.deadlocks_sec' = @('Locks', 'Number of Deadlocks/sec', '/sec')
    'mssql.full_scans_sec' = @('Access Methods', 'Full Scans/sec', '/sec')
    'mssql.index_searches_sec' = @('Access Methods', 'Index Searches/sec', '/sec')
    'mssql.page_splits_sec' = @('Access Methods', 'Page Splits/sec', '/sec')
    'mssql.latch_waits_sec' = @('Latches', 'Latch Waits/sec', '/sec')
}

function Resolve-SqlPrefix {
    param([string]$RequestedInstance)

    $sets = @()
    try {
        $sets = @(Get-Counter -ListSet * -ErrorAction SilentlyContinue |
            Where-Object { $_.CounterSetName -like 'SQLServer:*' -or $_.CounterSetName -like 'MSSQL$*' } |
            Select-Object -ExpandProperty CounterSetName)
    } catch {
        Write-Err "Не удалось перечислить объекты PerfMon SQL: $($_.Exception.Message)"
    }

    $prefixes = @()
    foreach ($name in $sets) {
        if ($name -match '^(SQLServer):') { $prefixes += 'SQLServer' }
        elseif ($name -match '^(MSSQL\$[^:]+):') { $prefixes += $Matches[1] }
    }
    $prefixes = $prefixes | Select-Object -Unique

    if ($prefixes.Count -eq 0) { return $null }

    $want = $RequestedInstance
    if ($want -eq '.' -or [string]::IsNullOrWhiteSpace($want) -or $want -eq '(local)') {
        if ($prefixes -contains 'SQLServer') { return 'SQLServer' }
        return @($prefixes)[0]
    }
    if ($want -eq 'MSSQLSERVER' -and ($prefixes -contains 'SQLServer')) { return 'SQLServer' }
    $named = "MSSQL`$$want"
    if ($prefixes -contains $named) { return $named }
    if ($prefixes -contains $want) { return $want }
    return @($prefixes)[0]
}

function Get-Cooked {
    param([string[]]$Counters, [int]$Interval)

    if (-not $Counters -or $Counters.Count -eq 0) { return @{} }
    $byPath = @{}

    try {
        $data = Get-Counter -Counter $Counters -SampleInterval $Interval -MaxSamples 2 -ErrorAction Stop
        $last = @($data)[-1]
        foreach ($sample in $last.CounterSamples) {
            $byPath[(Normalize-Path $sample.Path)] = [double]$sample.CookedValue
        }
        return $byPath
    } catch {
        Write-Err "Пакетный Get-Counter не удался, снимаю по одному: $($_.Exception.Message)"
    }

    foreach ($path in $Counters) {
        try {
            $data = Get-Counter -Counter $path -SampleInterval $Interval -MaxSamples 2 -ErrorAction Stop
            $sample = @($data)[-1].CounterSamples[0]
            $byPath[(Normalize-Path $sample.Path)] = [double]$sample.CookedValue
        } catch {
            Write-Err "Нет счётчика $path"
        }
    }
    return $byPath
}

function Get-Disks([int]$Interval) {
    $paths = @(
        '\PhysicalDisk(*)\Disk Reads/sec',
        '\PhysicalDisk(*)\Disk Writes/sec',
        '\PhysicalDisk(*)\Current Disk Queue Length',
        '\PhysicalDisk(*)\% Idle Time',
        '\PhysicalDisk(*)\Avg. Disk sec/Read',
        '\PhysicalDisk(*)\Avg. Disk sec/Write'
    )
    $cooked = Get-Cooked -Counters $paths -Interval $Interval
    $instances = @{}
    foreach ($key in $cooked.Keys) {
        if ($key -match '\\PhysicalDisk\(([^)]+)\)\\(.+)$') {
            $inst = $Matches[1]
            $counter = $Matches[2]
            if (-not $instances.ContainsKey($inst)) {
                $instances[$inst] = @{ instance = $inst }
            }
            switch ($counter) {
                'Disk Reads/sec' { $instances[$inst].reads_sec = [math]::Round($cooked[$key], 4) }
                'Disk Writes/sec' { $instances[$inst].writes_sec = [math]::Round($cooked[$key], 4) }
                'Current Disk Queue Length' { $instances[$inst].queue = [math]::Round($cooked[$key], 4) }
                '% Idle Time' { $instances[$inst].idle_pct = [math]::Round($cooked[$key], 4) }
                'Avg. Disk sec/Read' { $instances[$inst].avg_read_sec = [math]::Round($cooked[$key], 6) }
                'Avg. Disk sec/Write' { $instances[$inst].avg_write_sec = [math]::Round($cooked[$key], 6) }
            }
        }
    }
    return @($instances.Values | Sort-Object { $_.instance })
}

function Invoke-SqlQuery {
    param([string]$Server, [string]$Query, [string]$User, [string]$Password)

    $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
    $csb['Data Source'] = $Server
    $csb['Initial Catalog'] = 'master'
    $csb['Connect Timeout'] = 8
    $csb['TrustServerCertificate'] = $true
    if ([string]::IsNullOrWhiteSpace($User)) {
        $csb['Integrated Security'] = $true
    } else {
        $csb['Integrated Security'] = $false
        $csb['User ID'] = $User
        $csb['Password'] = $Password
    }

    $conn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $Query
    $cmd.CommandTimeout = 15
    $rows = @()
    try {
        $conn.Open()
        $reader = $cmd.ExecuteReader()
        while ($reader.Read()) {
            $rows += [pscustomobject]@{
                object_name   = ([string]$reader['object_name']).Trim()
                counter_name  = ([string]$reader['counter_name']).Trim()
                instance_name = ([string]$reader['instance_name']).Trim()
                cntr_value    = [int64]$reader['cntr_value']
                cntr_type     = [int]$reader['cntr_type']
            }
        }
        $reader.Close()
    } finally {
        $conn.Dispose()
    }
    return $rows
}

$sqlPrefix = $null
if (-not $SkipSql) {
    $sqlPrefix = Resolve-SqlPrefix -RequestedInstance $SqlInstance
    if (-not $sqlPrefix) {
        Write-Err 'Объекты SQL Server в PerfMon не найдены. Инстанс не установлен или счётчики не зарегистрированы.'
    }
}

$counterPaths = @($osMap.Values)
$sqlMap = [ordered]@{}
if ($sqlPrefix) {
    foreach ($id in $sqlRel.Keys) {
        $sqlMap[$id] = "\$sqlPrefix$($sqlRel[$id])"
        $counterPaths += $sqlMap[$id]
    }
}

$cooked = Get-Cooked -Counters $counterPaths -Interval $SampleInterval

function Get-CookedValue([string]$Path) {
    if ($cooked.ContainsKey($Path)) { return [double]$cooked[$Path] }
    foreach ($key in $cooked.Keys) {
        if ($key.EndsWith($Path, [System.StringComparison]::OrdinalIgnoreCase)) {
            return [double]$cooked[$key]
        }
    }
    return $null
}

$values = [ordered]@{}
$metrics = New-Object System.Collections.Generic.List[object]

function Add-Metric([string]$Id, [string]$Path, [string]$Source) {
    $info = $script:metaNames[$Id]
    $raw = Get-CookedValue $Path
    $value = $null
    if ($null -ne $raw) { $value = [math]::Round($raw, 6) }
    $script:values[$Id] = $value
    $script:metrics.Add([pscustomobject]@{
        id     = $Id
        source = $Source
        group  = $info[0]
        name   = $info[1]
        path   = $Path
        value  = $value
        unit   = $info[2]
    }) | Out-Null
}

foreach ($id in $osMap.Keys) { Add-Metric $id $osMap[$id] 'os' }
foreach ($id in $sqlMap.Keys) { Add-Metric $id $sqlMap[$id] 'mssql' }

$disks = @()
try { $disks = @(Get-Disks -Interval $SampleInterval) } catch { Write-Err $_.Exception.Message }

$sqlDmv = @()
if (-not $SkipSql -and -not $SkipDmv) {
    $query = @'
SELECT RTRIM(object_name) AS object_name, RTRIM(counter_name) AS counter_name,
       RTRIM(instance_name) AS instance_name, cntr_value, cntr_type
FROM sys.dm_os_performance_counters
WHERE (
        instance_name IN ('', '_Total')
        OR counter_name IN (N'Page life expectancy', N'Buffer cache hit ratio', N'Buffer cache hit ratio base')
      )
  AND counter_name IN (
        N'Buffer cache hit ratio', N'Buffer cache hit ratio base', N'Page life expectancy',
        N'Lazy writes/sec', N'Checkpoint pages/sec', N'Page reads/sec', N'Page writes/sec',
        N'Free list stalls/sec', N'Batch Requests/sec', N'SQL Compilations/sec', N'SQL Re-Compilations/sec',
        N'User Connections', N'Processes blocked', N'Logins/sec',
        N'Total Server Memory (KB)', N'Target Server Memory (KB)', N'Memory Grants Pending',
        N'Lock Waits/sec', N'Number of Deadlocks/sec', N'Full Scans/sec', N'Index Searches/sec',
        N'Page Splits/sec', N'Latch Waits/sec'
      );
'@
    try {
        $sqlDmv = @(Invoke-SqlQuery -Server $SqlInstance -Query $query -User $SqlUser -Password $SqlPassword)
    } catch {
        Write-Err "DMV недоступен ($SqlInstance): $($_.Exception.Message)"
    }
}

$snapshot = [ordered]@{
    meta = [ordered]@{
        host                 = $env:COMPUTERNAME
        collected_at         = (Get-Date).ToString('o')
        sample_interval_sec  = $SampleInterval
        sql_instance         = $SqlInstance
        sql_object_prefix    = $sqlPrefix
        collector            = 'Collect-WinMssqlSnapshot.ps1'
        demo                 = $false
    }
    values  = $values
    metrics = $metrics
    disks   = $disks
    sql_dmv = $sqlDmv
}

$json = $snapshot | ConvertTo-Json -Depth 8 -Compress
$utf8 = New-Object System.Text.UTF8Encoding $false

if ($Stdout) {
    Write-Output $json
} else {
    $outPath = $OutFile
    if (-not [System.IO.Path]::IsPathRooted($outPath)) {
        $outPath = Join-Path (Get-Location) $outPath
    }
    $dir = Split-Path -Parent $outPath
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
    [System.IO.File]::WriteAllText($outPath, $json, $utf8)
}

$targetHost = if ($ZabbixHost) { $ZabbixHost } else { $env:COMPUTERNAME }
$senderLines = foreach ($key in $values.Keys) {
    if ($null -ne $values[$key]) {
        '"{0}" snapshot.{1} {2}' -f $targetHost, $key, $values[$key]
    }
}

if ($SenderFile) {
    [System.IO.File]::WriteAllLines($SenderFile, $senderLines, $utf8)
}

if (-not $Stdout) {
    Write-Err ("Снято {0} метрик, SQL prefix={1}" -f $metrics.Count, $sqlPrefix)
}
