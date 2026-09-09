"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@/components/code-block";
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
import { catalog } from "@/lib/catalog";
import type { SourceKind } from "@/lib/types";

function CopyCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      className="max-w-full justify-start font-mono text-[11px]"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "скопировано" : value}
    </Button>
  );
}

function CatalogRows({ source }: { source?: SourceKind }) {
  const [q, setQuery] = useState("");
  const rows = useMemo(() => {
    const list = source ? catalog.filter((m) => m.source === source) : catalog;
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (m) =>
        m.id.includes(needle) ||
        m.name.toLowerCase().includes(needle) ||
        m.perfmonPath.toLowerCase().includes(needle) ||
        m.zabbixOfficialKey.toLowerCase().includes(needle)
    );
  }, [q, source]);

  return (
    <div className="space-y-3">
      <Input value={q} onChange={(e) => setQuery(e.target.value)} placeholder="Фильтр каталога…" />
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Показатель</TableHead>
              <TableHead className="hidden md:table-cell">PerfMon</TableHead>
              <TableHead>Ключ Zabbix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{m.name}</div>
                  <p className="mt-1 max-w-xl text-xs text-muted-foreground">{m.description}</p>
                  {m.warn || m.crit ? (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                      {m.warn ? `внимание: ${m.warn.note}` : null}
                      {m.warn && m.crit ? " · " : null}
                      {m.crit ? `критично: ${m.crit.note}` : null}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="hidden align-top md:table-cell">
                  <CopyCell value={m.perfmonPath} />
                </TableCell>
                <TableCell className="align-top">
                  <CopyCell value={m.zabbixOfficialKey} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CatalogView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Каталог счётчиков</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Тот же набор, что снимает коллектор и что обычно выводят в Zabbix: системные объекты PerfMon и счётчики SQL Server.
          Для локализованной Windows используйте <code className="font-mono">perf_counter_en</code> — английские имена, как в PerfMon locale 009.
        </p>
      </div>
      <Tabs defaultValue="os">
        <TabsList>
          <TabsTrigger value="os">Windows OS</TabsTrigger>
          <TabsTrigger value="mssql">MSSQL</TabsTrigger>
          <TabsTrigger value="lld">Обнаружение</TabsTrigger>
        </TabsList>
        <TabsContent value="os" className="mt-4">
          <CatalogRows source="os" />
        </TabsContent>
        <TabsContent value="mssql" className="mt-4">
          <CatalogRows source="mssql" />
        </TabsContent>
        <TabsContent value="lld" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Диски, сетевые интерфейсы и именованные инстансы SQL удобнее не перечислять вручную, а открывать через LLD.
          </p>
          <CodeBlock
            code={`# экземпляры PhysicalDisk
perf_instance_en.discovery[PhysicalDisk]

# прототип элемента
perf_counter_en["\\PhysicalDisk({#INSTANCE})\\Avg. Disk sec/Read",60]

# экземпляры Network Interface
perf_instance_en.discovery[Network Interface]

# объекты SQL (default instance)
perf_instance_en.discovery[SQLServer:Databases]`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
