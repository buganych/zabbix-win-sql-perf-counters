"use client";

import { AlertTriangle, FileJson, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge, statusDot } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { catalogById } from "@/lib/catalog";
import { formatNumber, formatWhen, toZabbixSender } from "@/lib/format";
import { sampleSnapshot } from "@/lib/sample-snapshot";
import { metricStatus, parseSnapshot, snapshotCounts, snapshotMetricStatus } from "@/lib/status";
import type { Snapshot, SnapshotMetric, SourceKind } from "@/lib/types";
import { cn } from "@/lib/utils";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function MetricTable({
  metrics,
  source,
}: {
  metrics: SnapshotMetric[];
  source?: SourceKind;
}) {
  const rows = source ? metrics.filter((m) => m.source === source) : metrics;

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[88px]">Статус</TableHead>
            <TableHead>Показатель</TableHead>
            <TableHead className="hidden md:table-cell">Группа</TableHead>
            <TableHead className="text-right">Значение</TableHead>
            <TableHead className="hidden lg:table-cell">Путь PerfMon</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                В снимке нет счётчиков этой группы
              </TableCell>
            </TableRow>
          ) : (
            rows.map((m) => {
              const status = snapshotMetricStatus(m);
              const cat = catalogById[m.id];
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className={statusDot(status)} />
                      <StatusBadge status={status} />
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{m.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{m.id}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{m.group}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(m.value, m.unit)}</TableCell>
                  <TableCell className="hidden max-w-md truncate font-mono text-[11px] text-muted-foreground lg:table-cell">
                    {m.path || cat?.perfmonPath}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function SnapshotWorkbench() {
  const [snapshot, setSnapshot] = useState<Snapshot>(sampleSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const counts = snapshotCounts(snapshot);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snapshot.metrics;
    return snapshot.metrics.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.path.toLowerCase().includes(q) ||
        m.group.toLowerCase().includes(q)
    );
  }, [query, snapshot.metrics]);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseSnapshot(JSON.parse(String(reader.result)));
        setSnapshot(parsed);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось прочитать JSON");
      }
    };
    reader.readAsText(file);
  }

  const cpu = snapshot.values["os.cpu.util"];
  const mem = snapshot.values["os.memory.committed_pct"];
  const disk = snapshot.values["os.disk.avg_read_sec"];
  const ple = snapshot.values["mssql.page_life_expectancy"];
  const bchr = snapshot.values["mssql.buffer_cache_hit_ratio"];
  const batch = snapshot.values["mssql.batch_requests_sec"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight">{snapshot.meta.host}</h1>
            {snapshot.meta.demo ? (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium tracking-wide text-sky-700 uppercase dark:text-sky-400">
                демо
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Снято {formatWhen(snapshot.meta.collected_at)} · интервал {snapshot.meta.sample_interval_sec} с
            {snapshot.meta.sql_instance ? ` · SQL ${snapshot.meta.sql_instance}` : " · SQL не найден"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload data-icon="inline-start" />
            Загрузить JSON
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadText(
                `${snapshot.meta.host}-zabbix_sender.txt`,
                toZabbixSender(snapshot.meta.host, snapshot.values)
              )
            }
          >
            <FileJson data-icon="inline-start" />
            zabbix_sender
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSnapshot(sampleSnapshot);
              setError(null);
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Демо
          </Button>
        </div>
      </div>

      {snapshot.meta.demo ? (
        <Alert>
          <AlertTitle>Это демонстрационный снимок</AlertTitle>
          <AlertDescription>
            На Windows снимите реальные счётчики скриптом{" "}
            <a className="underline underline-offset-2" href="/collect">
              Collect-WinMssqlSnapshot.ps1
            </a>{" "}
            и загрузите JSON. Постоянный вывод в Zabbix — официальные шаблоны ОС и MSSQL, либо один master-элемент с этим JSON.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Файл не принят</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <KpiCard
          label="CPU"
          value={cpu}
          unit="%"
          status={metricStatus(catalogById["os.cpu.util"], cpu)}
          hint="Processor Time"
        />
        <KpiCard
          label="Commit"
          value={mem}
          unit="%"
          status={metricStatus(catalogById["os.memory.committed_pct"], mem)}
          hint="память ОС"
        />
        <KpiCard
          label="Чтение диска"
          value={disk}
          unit="sec"
          status={metricStatus(catalogById["os.disk.avg_read_sec"], disk)}
          hint="Avg. Disk sec/Read"
        />
        <KpiCard
          label="PLE"
          value={ple}
          unit="sec"
          status={metricStatus(catalogById["mssql.page_life_expectancy"], ple)}
          hint="жизнь страницы"
        />
        <KpiCard
          label="Buffer hit"
          value={bchr}
          unit="%"
          status={metricStatus(catalogById["mssql.buffer_cache_hit_ratio"], bchr)}
          hint="buffer pool"
        />
        <KpiCard
          label="Batch/sec"
          value={batch}
          unit="/sec"
          status={metricStatus(catalogById["mssql.batch_requests_sec"], batch)}
          hint="нагрузка SQL"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className={cn("rounded-full px-2.5 py-1", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}>
          норма {counts.ok}
        </span>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-800 dark:text-amber-400">
          внимание {counts.warn}
        </span>
        <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-700 dark:text-red-400">
          критично {counts.crit}
        </span>
        <span className="text-muted-foreground">всего {counts.total}</span>
      </div>

      <Tabs defaultValue="all">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line" className="w-full sm:w-auto">
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="os">ОС Windows</TabsTrigger>
            <TabsTrigger value="mssql">MSSQL</TabsTrigger>
            <TabsTrigger value="disks">Диски</TabsTrigger>
            <TabsTrigger value="keys">Ключи Zabbix</TabsTrigger>
          </TabsList>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени, id, пути…"
            className="sm:max-w-xs"
          />
        </div>
        <TabsContent value="all" className="mt-4">
          <MetricTable metrics={filtered} />
        </TabsContent>
        <TabsContent value="os" className="mt-4">
          <MetricTable metrics={filtered} source="os" />
        </TabsContent>
        <TabsContent value="mssql" className="mt-4">
          <MetricTable metrics={filtered} source="mssql" />
        </TabsContent>
        <TabsContent value="disks" className="mt-4">
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Экземпляр</TableHead>
                  <TableHead className="text-right">Reads/sec</TableHead>
                  <TableHead className="text-right">Writes/sec</TableHead>
                  <TableHead className="text-right">Queue</TableHead>
                  <TableHead className="text-right">Idle %</TableHead>
                  <TableHead className="text-right">Read</TableHead>
                  <TableHead className="text-right">Write</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(snapshot.disks ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      В снимке нет экземпляров PhysicalDisk
                    </TableCell>
                  </TableRow>
                ) : (
                  (snapshot.disks ?? []).map((d) => (
                    <TableRow key={d.instance}>
                      <TableCell className="font-mono">{d.instance}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(d.reads_sec, "/sec")}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(d.writes_sec, "/sec")}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(d.queue, "count")}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(d.idle_pct, "%")}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(d.avg_read_sec, "sec")}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(d.avg_write_sec, "sec")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="keys" className="mt-4">
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Показатель</TableHead>
                  <TableHead>JSONPath</TableHead>
                  <TableHead className="hidden md:table-cell">Официальный ключ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const cat = catalogById[m.id];
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">snapshot.{m.id}</div>
                      </TableCell>
                      <TableCell className="font-mono text-[12px]">{cat?.jsonPath ?? `$.values["${m.id}"]`}</TableCell>
                      <TableCell className="hidden max-w-md truncate font-mono text-[12px] md:table-cell">
                        {cat?.zabbixOfficialKey}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
