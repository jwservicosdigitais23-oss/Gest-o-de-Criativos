import { StatusPill } from "@/components/ui/status-pill";
import type { StatusVisual } from "@/lib/status";
import { cn } from "@/lib/utils";

/** @deprecated use StatusPill (components/ui/status-pill). */
export function StatusBadge({ status, className }: { status: StatusVisual; className?: string }) {
  return <StatusPill status={status} className={className} />;
}

export function Pilula({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-label font-semibold", className)}>
      {children}
    </span>
  );
}
