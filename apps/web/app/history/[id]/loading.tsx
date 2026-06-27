import {
  CardSkeleton,
  SkeletonBlock,
  SkeletonLine,
  TableSkeleton
} from "@/components/loading-skeletons";

export default function HistoryDetailLoading() {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-2xl space-y-3">
            <SkeletonLine className="h-4 w-40" />
            <SkeletonLine className="h-8 w-96 max-w-full" />
            <SkeletonLine className="h-4 w-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-24" />
            <SkeletonBlock className="h-8 w-28" />
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <CardSkeleton lines={7} />
            <CardSkeleton lines={8} />
            <TableSkeleton rows={6} />
          </div>
          <aside className="grid content-start gap-6">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={6} />
          </aside>
        </section>
      </div>
    </main>
  );
}
