"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("group relative", className)}>
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="absolute top-2 right-2 z-10 bg-background/80"
        onClick={copy}
      >
        {copied ? <Copy className="hidden" /> : <Copy />}
        {copied ? <Check data-icon="inline-start" /> : null}
        {copied ? "Скопировано" : "Копировать"}
      </Button>
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 pr-28 font-mono text-[12.5px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
