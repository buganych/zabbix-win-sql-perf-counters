import { formatNumber } from "@/lib/format";
import type { MetricStatus, MetricUnit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export function KpiCard({
  label,
  value,
  unit,
  status,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  unit: MetricUnit;
  status: MetricStatus;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <StatusBadge status={status} />
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-medium tracking-tight",
          status === "crit" && "text-red-600 dark:text-red-400",
          status === "warn" && "text-amber-700 dark:text-amber-400"
        )}
      >
        {formatNumber(value, unit)}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
