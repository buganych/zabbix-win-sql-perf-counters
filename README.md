# Windows + MSSQL счётчики для Zabbix

Однократный съём счётчиков Windows (как в Performance Monitor) и SQL Server, плюс готовый путь, чтобы вывести показатели ОС и СУБД в Zabbix.

## Что снимать

| Источник | Что это | Как получить одним вызовом |
| --- | --- | --- |
| PerfMon / `typeperf` / `Get-Counter` | Cooked-значения объектов `\Processor Information`, `\Memory`, `\PhysicalDisk`, `\SQLServer:*` | `typeperf -sc 1` или скрипт `Collect-WinMssqlSnapshot.ps1` |
| `sys.dm_os_performance_counters` | Те же счётчики SQL изнутри инстанса, но **сырые** | `scripts/Get-MssqlCounters.sql` |
| Zabbix agent 2 | Постоянный мониторинг | шаблоны *Windows by Zabbix agent* и *MSSQL by Zabbix agent 2* |

Для локализованной Windows в Zabbix используйте `perf_counter_en[...]` — английские имена, как в реестре `Perflib\009`.

`sys.dm_os_performance_counters` не равен графику PerfMon «как есть»:

- `PERF_COUNTER_BULK_COUNT` (`/sec`) — накопительный, нужен второй замер;
- Buffer cache hit ratio — дробь, делить на `Buffer cache hit ratio base`.

`Get-Counter` и `typeperf` уже отдают cooked-значения.

## Снять один раз на Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Collect-WinMssqlSnapshot.ps1 `
  -SqlInstance . `
  -OutFile .\snapshot.json `
  -SenderFile .\snapshot-zabbix_sender.txt
```

Именованный инстанс: `-SqlInstance PRODATA` (объект PerfMon будет `MSSQL$PRODATA`).

Только список объектов, как дерево в perfmon:

```bat
typeperf -qx > perfmon-all.txt
typeperf -qx "SQLServer*"
typeperf -qx "MSSQL$PRODATA*"
```

Дашборд в этом репозитории умеет открыть `snapshot.json`.

## Как вывести в Zabbix

**Постоянные графики (рекомендуется)**

1. Zabbix agent 2 на Windows.
2. Шаблон **Windows by Zabbix agent** — CPU, память, paging, диски, очереди.
3. Плагин MSSQL (`mssql.conf`) и шаблон **MSSQL by Zabbix agent 2**.
4. Элемент `mssql.perfcounter.get[...]` забирает все глобальные счётчики SQL одним JSON; графики — зависимые элементы.

**Один свой элемент на ОС+SQL**

```
Timeout=10
UserParameter=win.mssql.snapshot,powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\zabbix\Collect-WinMssqlSnapshot.ps1" -Stdout
```

Импортируйте `zabbix/template_win_mssql_snapshot.yaml`. JSONPath вида `$.values["mssql.page_life_expectancy"]`.

**Разовая отправка**

```
zabbix_sender -z zabbix.example.ru -s SQL01 -i snapshot-zabbix_sender.txt
```

Ключи trapper: `snapshot.os.cpu.util`, `snapshot.mssql.page_life_expectancy`, …

## Каталог

В дашборде (страница «Каталог») — пути PerfMon, ключи `perf_counter_en` и ключи официального шаблона MSSQL: PLE, buffer hit ratio, Batch Requests/sec, блокировки, память инстанса, задержки диска.

## Запуск дашборда

```bash
npm install
npm run dev
```

Откройте http://127.0.0.1:43127 — там демо-снимок. Загрузите свой JSON с Windows-хоста.

```bash
npm run build
npm start
```

Скрипты коллектора лежат в `scripts/` и раздаются с `/collectors/Collect-WinMssqlSnapshot.ps1`.
