import {
  CardSkeleton,
  SkeletonBlock,
  SkeletonLine
} from "@/components/loading-skeletons";

export default function AnalyzeLoading() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-2xl space-y-3">
            <SkeletonLine className="h-4 w-44" />
            <SkeletonLine className="h-8 w-72 max-w-full" />
            <SkeletonLine className="h-4 w-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-8 w-24" />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="space-y-4">
              <SkeletonLine className="h-5 w-36" />
              <SkeletonLine className="h-4 w-full" />
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-9 w-28" />
            </div>
          </div>
          <div className="grid gap-4">
            <CardSkeleton lines={4} />
            <div className="grid gap-4 sm:grid-cols-2">
              <CardSkeleton lines={3} />
              <CardSkeleton lines={3} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
