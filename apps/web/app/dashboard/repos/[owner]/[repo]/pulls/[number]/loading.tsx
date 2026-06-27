import {
  CardSkeleton,
  PageHeaderSkeleton,
  SkeletonBlock,
  SkeletonLine,
  TableSkeleton
} from "@/components/loading-skeletons";

export default function PullRequestLoading() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-border bg-sidebar px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 px-2">
            <SkeletonBlock className="size-8 rounded-lg" />
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-20" />
              <SkeletonLine className="h-3 w-28" />
            </div>
          </div>
          <div className="mt-6 grid gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock className="h-9 w-full" key={index} />
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <PageHeaderSkeleton />
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-28" />
              <SkeletonBlock className="h-8 w-28" />
            </div>
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="grid gap-6">
                <CardSkeleton lines={7} />
                <CardSkeleton lines={8} />
                <TableSkeleton rows={6} />
              </div>
              <aside className="grid content-start gap-6">
                <CardSkeleton lines={5} />
                <CardSkeleton lines={4} />
                <CardSkeleton lines={6} />
                <CardSkeleton lines={4} />
              </aside>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
