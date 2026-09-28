import { Skeleton } from "@/components/ui/skeleton";

export default function Carregando() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando calendário">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-10 w-full max-w-lg" />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-control)] border border-borda bg-borda">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-24 bg-surface-solid p-2">
            <Skeleton className="h-4 w-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
