import {
  SkeletonBlock,
  SkeletonLine,
  TableSkeleton
} from "@/components/loading-skeletons";

export default function HistoryLoading() {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-2xl space-y-3">
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="h-8 w-72 max-w-full" />
            <SkeletonLine className="h-4 w-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-8 w-24" />
          </div>
        </header>
        <TableSkeleton rows={8} />
      </div>
    </main>
  );
}
