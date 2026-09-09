import { catalog } from "@/lib/catalog";
import type { Snapshot, SnapshotMetric } from "@/lib/types";

const demoValues: Record<string, number> = {
  "os.cpu.util": 61.4,
  "os.cpu.privileged": 12.8,
  "os.cpu.user": 48.1,
  "os.cpu.interrupt": 1.4,
  "os.cpu.dpc": 2.1,
  "os.cpu.queue": 3,
  "os.system.context_switches": 8420,
  "os.system.threads": 1842,
  "os.memory.available_mbytes": 1842,
  "os.memory.committed_pct": 67.3,
  "os.memory.pages_sec": 18.4,
  "os.memory.page_faults_sec": 1240,
  "os.memory.pool_nonpaged": 186_400_000,
  "os.memory.free_pte": 12_480_000,
  "os.paging.usage": 8.2,
  "os.disk.reads_sec": 142.6,
  "os.disk.writes_sec": 88.3,
  "os.disk.queue": 1.2,
  "os.disk.idle": 64.5,
  "os.disk.avg_read_sec": 0.0048,
  "os.disk.avg_write_sec": 0.0061,
  "mssql.buffer_cache_hit_ratio": 99.12,
  "mssql.page_life_expectancy": 4280,
  "mssql.lazy_writes_sec": 0.4,
  "mssql.checkpoint_pages_sec": 32.1,
  "mssql.page_reads_sec": 24.7,
  "mssql.page_writes_sec": 41.2,
  "mssql.free_list_stalls_sec": 0,
  "mssql.batch_requests_sec": 612.8,
  "mssql.sql_compilations_sec": 38.4,
  "mssql.sql_recompilations_sec": 1.2,
  "mssql.user_connections": 86,
  "mssql.processes_blocked": 0,
  "mssql.logins_sec": 0.3,
  "mssql.total_server_memory_kb": 28_311_552,
  "mssql.target_server_memory_kb": 29_360_128,
  "mssql.memory_grants_pending": 0,
  "mssql.lock_waits_sec": 0.2,
  "mssql.deadlocks_sec": 0,
  "mssql.full_scans_sec": 4.1,
  "mssql.index_searches_sec": 18_420,
  "mssql.page_splits_sec": 6.3,
  "mssql.latch_waits_sec": 11.8,
};

function metricFromCatalog(id: string, value: number): SnapshotMetric {
  const c = catalog.find((m) => m.id === id);
  if (!c) {
    throw new Error(`Unknown catalog id ${id}`);
  }
  return {
    id: c.id,
    source: c.source,
    group: c.group,
    name: c.name,
    path: c.perfmonPath,
    value,
    unit: c.unit,
  };
}

export const sampleSnapshot: Snapshot = {
  meta: {
    host: "SQL01.corp.local",
    collected_at: "2026-09-09T07:15:22+03:00",
    sample_interval_sec: 1,
    sql_instance: "MSSQLSERVER",
    sql_object_prefix: "SQLServer",
    collector: "Collect-WinMssqlSnapshot.ps1",
    demo: true,
  },
  values: demoValues,
  metrics: Object.entries(demoValues).map(([id, value]) => metricFromCatalog(id, value)),
  disks: [
    {
      instance: "_Total",
      reads_sec: 142.6,
      writes_sec: 88.3,
      queue: 1.2,
      idle_pct: 64.5,
      avg_read_sec: 0.0048,
      avg_write_sec: 0.0061,
    },
    {
      instance: "0 C:",
      reads_sec: 12.1,
      writes_sec: 9.4,
      queue: 0.1,
      idle_pct: 92.2,
      avg_read_sec: 0.0031,
      avg_write_sec: 0.0044,
    },
    {
      instance: "1 D:",
      reads_sec: 98.4,
      writes_sec: 41.8,
      queue: 0.8,
      idle_pct: 58.1,
      avg_read_sec: 0.0052,
      avg_write_sec: 0.0068,
    },
    {
      instance: "2 L:",
      reads_sec: 0.2,
      writes_sec: 37.1,
      queue: 0.3,
      idle_pct: 71.4,
      avg_read_sec: 0.0021,
      avg_write_sec: 0.0028,
    },
  ],
  sql_dmv: [
    { object_name: "SQLServer:Buffer Manager", counter_name: "Page life expectancy", instance_name: "", cntr_value: 4280, cntr_type: 65792 },
    { object_name: "SQLServer:Buffer Manager", counter_name: "Buffer cache hit ratio", instance_name: "", cntr_value: 18421, cntr_type: 537003264 },
    { object_name: "SQLServer:Buffer Manager", counter_name: "Buffer cache hit ratio base", instance_name: "", cntr_value: 18584, cntr_type: 1073939459 },
    { object_name: "SQLServer:SQL Statistics", counter_name: "Batch Requests/sec", instance_name: "", cntr_value: 184_220_112, cntr_type: 272696576 },
  ],
};
