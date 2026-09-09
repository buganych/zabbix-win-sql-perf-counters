import { CodeBlock } from "@/components/code-block";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const typeperfOnce = `typeperf -sc 1 ^
  "\\Processor Information(_Total)\\% Processor Time" ^
  "\\Memory\\Available MBytes" ^
  "\\PhysicalDisk(_Total)\\Avg. Disk sec/Read" ^
  "\\SQLServer:Buffer Manager\\Page life expectancy" ^
  "\\SQLServer:SQL Statistics\\Batch Requests/sec"`;

const typeperfList = `:: полный список объектов, как дерево в perfmon.exe
typeperf -qx > C:\\temp\\perfmon-all.txt

:: только SQL Server (default instance)
typeperf -qx "SQLServer*" > C:\\temp\\mssql-counters.txt

:: именованный инстанс
typeperf -qx "MSSQL$PRODATA*" > C:\\temp\\mssql-named.txt`;

const powershellOnce = `Get-Counter -Counter @(
  '\\Processor Information(_Total)\\% Processor Time',
  '\\Memory\\Available MBytes',
  '\\Paging File(_Total)\\% Usage',
  '\\SQLServer:Buffer Manager\\Page life expectancy',
  '\\SQLServer:Buffer Manager\\Buffer cache hit ratio',
  '\\SQLServer:SQL Statistics\\Batch Requests/sec'
) -SampleInterval 1 -MaxSamples 2 |
  Select-Object -Last 1 |
  ForEach-Object { $_.CounterSamples } |
  Select-Object Path, CookedValue`;

const collector = `# на Windows, от администратора или учётки с правами на PerfMon и VIEW SERVER STATE
powershell -NoProfile -ExecutionPolicy Bypass -File .\\Collect-WinMssqlSnapshot.ps1 \`
  -SqlInstance . \`
  -OutFile .\\snapshot.json

# только JSON в stdout — для UserParameter агента
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\zabbix\\Collect-WinMssqlSnapshot.ps1 -Stdout`;

const sql = `SELECT
  RTRIM(object_name)  AS object_name,
  RTRIM(counter_name) AS counter_name,
  RTRIM(instance_name) AS instance_name,
  cntr_value,
  cntr_type
FROM sys.dm_os_performance_counters
WHERE counter_name IN (
  N'Buffer cache hit ratio',
  N'Buffer cache hit ratio base',
  N'Page life expectancy',
  N'Lazy writes/sec',
  N'Page reads/sec',
  N'Page writes/sec',
  N'Batch Requests/sec',
  N'SQL Compilations/sec',
  N'SQL Re-Compilations/sec',
  N'User Connections',
  N'Processes blocked',
  N'Total Server Memory (KB)',
  N'Target Server Memory (KB)',
  N'Memory Grants Pending',
  N'Lock Waits/sec',
  N'Number of Deadlocks/sec',
  N'Full Scans/sec',
  N'Index Searches/sec'
);`;

export function CollectView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Однократный съём</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          PerfMon, <code className="font-mono">typeperf</code> и{" "}
          <code className="font-mono">Get-Counter</code> читают уже «приготовленные» (cooked) значения — как график в
          Performance Monitor. <code className="font-mono">sys.dm_os_performance_counters</code> отдаёт сырые счётчики:
          для /sec нужен второй замер, для Buffer cache hit ratio — деление на base.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Как в PerfMon, один образец</CardTitle>
            <CardDescription>
              <code className="font-mono">typeperf -sc 1</code> ждёт интервал и печатает одну строку. Это ближайший аналог
              «снять сейчас».
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={typeperfOnce} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Инвентаризация всех счётчиков</CardTitle>
            <CardDescription>
              Нужно понять, какие объекты есть на хосте (default vs MSSQL$NAME), прежде чем заводить элементы Zabbix.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={typeperfList} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PowerShell Get-Counter</CardTitle>
          <CardDescription>
            Два образца с интервалом 1 с — чтобы /sec и Avg. Disk sec/* посчитались так же, как в perfmon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={powershellOnce} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Коллектор этого репозитория</CardTitle>
          <CardDescription>
            Один вызов снимает каталог ОС + MSSQL, диски и опционально DMV, пишет JSON для дашборда и Zabbix.
            Скрипт лежит в <code className="font-mono">scripts/Collect-WinMssqlSnapshot.ps1</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeBlock code={collector} />
          <div className="flex flex-wrap gap-4 text-sm">
            <a className="underline underline-offset-2" href="/collectors/Collect-WinMssqlSnapshot.ps1">
              Collect-WinMssqlSnapshot.ps1
            </a>
            <a className="underline underline-offset-2" href="/collectors/Get-MssqlCounters.sql">
              Get-MssqlCounters.sql
            </a>
            <a className="underline underline-offset-2" href="/sample-snapshot.json">
              пример snapshot.json
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MSSQL одним запросом</CardTitle>
          <CardDescription>
            Те же объекты, что видит PerfMon, но изнутри инстанса. Нужно право VIEW SERVER STATE / VIEW PERFORMANCE STATE.
            Готовый файл: <code className="font-mono">scripts/Get-MssqlCounters.sql</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={sql} />
        </CardContent>
      </Card>
    </div>
  );
}
