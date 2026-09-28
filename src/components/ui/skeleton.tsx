import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-[var(--radius-control)] bg-border/70", className)} aria-hidden {...props} />;
}
