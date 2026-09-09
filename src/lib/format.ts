import type { MetricUnit } from "@/lib/types";

export function formatNumber(value: number | null | undefined, unit: MetricUnit): string {
  if (value == null || Number.isNaN(value)) return "—";

  if (unit === "sec") {
    const ms = value * 1000;
    if (ms < 1) return `${(ms * 1000).toFixed(0)} мкс`;
    if (ms < 10) return `${ms.toFixed(2)} мс`;
    return `${ms.toFixed(1)} мс`;
  }

  if (unit === "bytes") {
    return formatBytes(value);
  }

  if (unit === "KB") {
    return formatBytes(value * 1024);
  }

  if (unit === "MB") {
    if (value >= 1024) return `${(value / 1024).toFixed(1)} ГБ`;
    return `${Math.round(value)} МБ`;
  }

  if (unit === "%") {
    return `${value.toFixed(value >= 10 ? 1 : 2)} %`;
  }

  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1000).toFixed(1)}k`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value >= 10 ? 1 : 2);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} КБ`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(0)} МБ`;
  return `${(mb / 1024).toFixed(1)} ГБ`;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(d);
}

export function unitSuffix(unit: MetricUnit): string {
  switch (unit) {
    case "%":
      return "%";
    case "/sec":
      return "/с";
    case "ms":
      return "мс";
    case "sec":
      return "с";
    case "bytes":
      return "Б";
    case "MB":
      return "МБ";
    case "KB":
      return "КБ";
    default:
      return "";
  }
}

export function toZabbixSender(host: string, values: Record<string, number | null>): string {
  return Object.entries(values)
    .filter(([, v]) => v != null && !Number.isNaN(v))
    .map(([key, value]) => `"${host}" snapshot.${key} ${value}`)
    .join("\n");
}
