-- Get-MssqlCounters.sql
-- One-shot SQL Server performance counters (same objects as PerfMon).
-- Requires VIEW SERVER STATE / VIEW PERFORMANCE STATE.
--
-- cntr_type:
--   65792      PERF_COUNTER_LARGE_RAWCOUNT   — брать as-is (PLE, connections, memory)
--   272696576  PERF_COUNTER_BULK_COUNT      — накопительный /sec, нужен второй замер
--   537003264  PERF_LARGE_RAW_FRACTION       — делить на base (buffer cache hit ratio)
--   1073939459 PERF_LARGE_RAW_BASE

SET NOCOUNT ON;

SELECT
    RTRIM(object_name)   AS object_name,
    RTRIM(counter_name)  AS counter_name,
    RTRIM(instance_name) AS instance_name,
    cntr_value,
    cntr_type
FROM sys.dm_os_performance_counters
WHERE counter_name IN (
        N'Buffer cache hit ratio',
        N'Buffer cache hit ratio base',
        N'Page life expectancy',
        N'Lazy writes/sec',
        N'Checkpoint pages/sec',
        N'Page reads/sec',
        N'Page writes/sec',
        N'Free list stalls/sec',
        N'Batch Requests/sec',
        N'SQL Compilations/sec',
        N'SQL Re-Compilations/sec',
        N'User Connections',
        N'Processes blocked',
        N'Logins/sec',
        N'Total Server Memory (KB)',
        N'Target Server Memory (KB)',
        N'Memory Grants Pending',
        N'Lock Waits/sec',
        N'Number of Deadlocks/sec',
        N'Full Scans/sec',
        N'Index Searches/sec',
        N'Page Splits/sec',
        N'Latch Waits/sec'
    )
  AND (
        instance_name IN (N'', N'_Total')
        OR counter_name IN (
            N'Page life expectancy',
            N'Buffer cache hit ratio',
            N'Buffer cache hit ratio base'
        )
      )
ORDER BY object_name, counter_name, instance_name;

-- Buffer cache hit ratio = 100.0 * ratio / base  (оба PERF_LARGE_RAW_*)
SELECT
    100.0 * ratio.cntr_value / NULLIF(base.cntr_value, 0) AS buffer_cache_hit_ratio_pct
FROM sys.dm_os_performance_counters AS ratio
JOIN sys.dm_os_performance_counters AS base
  ON base.object_name = ratio.object_name
 AND base.counter_name = N'Buffer cache hit ratio base'
WHERE ratio.counter_name = N'Buffer cache hit ratio';
