import type { MetricStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const tones: Record<MetricStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  crit: "bg-red-500/15 text-red-700 dark:text-red-400",
  info: "bg-muted text-muted-foreground",
};

const labels: Record<MetricStatus, string> = {
  ok: "норма",
  warn: "внимание",
  crit: "критично",
  info: "нет данных",
};

export function StatusBadge({ status }: { status: MetricStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium tracking-wide uppercase",
        tones[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

export function statusDot(status: MetricStatus) {
  return cn(
    "size-2 rounded-full",
    status === "ok" && "bg-emerald-500",
    status === "warn" && "bg-amber-500",
    status === "crit" && "bg-red-500",
    status === "info" && "bg-muted-foreground"
  );
}
