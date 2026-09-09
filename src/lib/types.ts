export type SourceKind = "os" | "mssql";

export type MetricUnit = "%" | "count" | "/sec" | "ms" | "sec" | "bytes" | "MB" | "KB";

export type MetricStatus = "ok" | "warn" | "crit" | "info";

export type CatalogMetric = {
  id: string;
  source: SourceKind;
  group: string;
  name: string;
  description: string;
  perfmonPath: string;
  zabbixPerfKey: string;
  zabbixOfficialKey: string;
  jsonPath: string;
  unit: MetricUnit;
  warn?: { op: "gt" | "lt"; value: number; note: string };
  crit?: { op: "gt" | "lt"; value: number; note: string };
};

export type SnapshotMetric = {
  id: string;
  source: SourceKind;
  group: string;
  name: string;
  path: string;
  value: number | null;
  unit: MetricUnit;
};

export type SnapshotMeta = {
  host: string;
  collected_at: string;
  sample_interval_sec: number;
  sql_instance: string | null;
  sql_object_prefix: string | null;
  collector: string;
  demo?: boolean;
};

export type Snapshot = {
  meta: SnapshotMeta;
  values: Record<string, number | null>;
  metrics: SnapshotMetric[];
  disks?: Array<{ instance: string; reads_sec: number; writes_sec: number; queue: number; idle_pct: number; avg_read_sec: number; avg_write_sec: number }>;
  sql_dmv?: Array<{
    object_name: string;
    counter_name: string;
    instance_name: string;
    cntr_value: number;
    cntr_type: number;
  }>;
};
