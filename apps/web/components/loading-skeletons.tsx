import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return <SkeletonBlock className={cn("h-3", className)} />;
}

export function PageHeaderSkeleton() {
  return (
    <header className="border-b border-border bg-card px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-xl space-y-3">
          <SkeletonLine className="h-4 w-36" />
          <SkeletonLine className="h-8 w-72 max-w-full" />
          <SkeletonLine className="h-4 w-full max-w-lg" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-8 w-28" />
        </div>
      </div>
    </header>
  );
}

export function CardSkeleton({
  className,
  lines = 3
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="space-y-3">
        <SkeletonLine className="h-5 w-40" />
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLine
            className={cn(index === lines - 1 ? "w-2/3" : "w-full")}
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <SkeletonLine className="h-5 w-32" />
        <SkeletonLine className="h-4 w-20" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="grid grid-cols-[1fr_100px_72px] gap-4" key={index}>
            <SkeletonLine className="h-4" />
            <SkeletonLine className="h-4" />
            <SkeletonLine className="h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
