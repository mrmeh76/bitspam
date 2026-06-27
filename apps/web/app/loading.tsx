import { CardSkeleton, SkeletonBlock, SkeletonLine } from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="size-9 rounded-xl" />
            <SkeletonLine className="h-5 w-24" />
          </div>
          <div className="hidden gap-2 sm:flex">
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-8 w-24" />
            <SkeletonBlock className="h-8 w-36" />
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.58fr)]">
          <div className="flex min-h-130 items-center px-6 py-16 sm:px-10 lg:px-20">
            <div className="w-full max-w-4xl space-y-7">
              <SkeletonLine className="h-4 w-48" />
              <div className="space-y-4">
                <SkeletonLine className="h-14 w-full max-w-3xl" />
                <SkeletonLine className="h-14 w-full max-w-2xl" />
                <SkeletonLine className="h-14 w-full max-w-xl" />
              </div>
              <div className="space-y-3">
                <SkeletonLine className="h-5 w-full max-w-2xl" />
                <SkeletonLine className="h-5 w-full max-w-xl" />
              </div>
            </div>
          </div>

          <aside className="border-t border-border px-6 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:px-16">
            <div className="flex min-h-full flex-col justify-center gap-8">
              <div className="flex gap-2">
                <SkeletonBlock className="size-12 rounded-lg" />
                <SkeletonBlock className="size-12 rounded-lg" />
                <SkeletonBlock className="size-12 rounded-lg" />
              </div>
              <div className="space-y-3">
                <SkeletonLine className="h-5 w-full" />
                <SkeletonLine className="h-5 w-5/6" />
                <SkeletonLine className="h-5 w-2/3" />
              </div>
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-9 w-36" />
                <SkeletonBlock className="h-9 w-40" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1600px] gap-4 border-x border-border px-6 py-12 sm:px-10 md:grid-cols-2 lg:grid-cols-4 lg:px-20">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} lines={2} />
        ))}
      </section>
    </main>
  );
}
