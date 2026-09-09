import { catalogById } from "@/lib/catalog";
import type { CatalogMetric, MetricStatus, Snapshot, SnapshotMetric } from "@/lib/types";

function cmp(op: "gt" | "lt", value: number, threshold: number) {
  return op === "gt" ? value > threshold : value < threshold;
}

export function metricStatus(metric: CatalogMetric, value: number | null | undefined): MetricStatus {
  if (value == null || Number.isNaN(value)) return "info";
  if (metric.crit && cmp(metric.crit.op, value, metric.crit.value)) return "crit";
  if (metric.warn && cmp(metric.warn.op, value, metric.warn.value)) return "warn";
  return "ok";
}

export function snapshotMetricStatus(metric: SnapshotMetric): MetricStatus {
  const cat = catalogById[metric.id];
  if (!cat) return "info";
  return metricStatus(cat, metric.value);
}

export function snapshotCounts(snapshot: Snapshot) {
  let ok = 0;
  let warn = 0;
  let crit = 0;
  let info = 0;
  for (const m of snapshot.metrics) {
    const s = snapshotMetricStatus(m);
    if (s === "ok") ok += 1;
    else if (s === "warn") warn += 1;
    else if (s === "crit") crit += 1;
    else info += 1;
  }
  return { ok, warn, crit, info, total: snapshot.metrics.length };
}

export function parseSnapshot(raw: unknown): Snapshot {
  if (!raw || typeof raw !== "object") {
    throw new Error("Ожидался JSON-объект снимка");
  }
  const data = raw as Partial<Snapshot>;
  if (!data.meta || !data.values || !Array.isArray(data.metrics)) {
    throw new Error("В файле нет meta, values или metrics — это не снимок коллектора");
  }
  return data as Snapshot;
}
