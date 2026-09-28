import { Skeleton } from "@/components/ui/skeleton";

export default function Carregando() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Carregando post">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-9 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="mx-auto flex w-full max-w-[555px] flex-col gap-3 rounded-[var(--radius-control)] border border-borda bg-surface-solid p-4">
          <div className="flex gap-2">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-16" />
          <Skeleton className="aspect-square" />
        </div>
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
