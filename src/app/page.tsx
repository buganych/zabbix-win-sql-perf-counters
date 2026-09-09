import { TooltipProvider } from "@/components/ui/tooltip";
import { SnapshotWorkbench } from "@/components/snapshot-workbench";

export default function HomePage() {
  return (
    <TooltipProvider>
      <SnapshotWorkbench />
    </TooltipProvider>
  );
}
