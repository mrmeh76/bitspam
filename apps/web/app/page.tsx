import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-8 px-5 py-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-foreground" />
          BitSpam
        </div>
        <section className="max-w-3xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Public PR analysis for maintainer attention.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Score a public GitHub pull request for intent, scope, validation,
            risk, CI signal, and maintainer burden.
          </p>
          <Button size="lg" render={<Link href="/analyze" />}>
            Analyze a PR
            <ArrowRight />
          </Button>
        </section>
      </div>
    </main>
  );
}
