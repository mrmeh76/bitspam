import {
  GitPullRequest,
  History,
  LayoutDashboard,
  LogOut,
  PlugZap,
  Search,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { AuthSession } from "@/lib/auth";

export function DashboardShell({
  session,
  showInstallApp = false,
  title,
  subtitle,
  children
}: {
  session: AuthSession;
  showInstallApp?: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-border bg-sidebar px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 px-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <div className="text-sm font-semibold">BitSpam</div>
              <div className="text-xs text-muted-foreground">Maintainer console</div>
            </div>
          </div>

          <nav className="mt-6 grid gap-1">
            <NavLink href="/dashboard" icon={<LayoutDashboard />}>Dashboard</NavLink>
            {showInstallApp ? (
              <NavLink href="/api/github/install" icon={<PlugZap />}>Install app</NavLink>
            ) : null}
            <NavLink href="/analyze" icon={<Search />}>Analyze URL</NavLink>
            <NavLink href="/history" icon={<History />}>History</NavLink>
          </nav>

          <div className="mt-6 rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2">
              {session.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-8 rounded-full"
                  src={session.user.avatarUrl}
                />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                  <UserRound className="size-4" />
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{session.user.login}</div>
                <div className="text-xs text-muted-foreground">GitHub connected</div>
              </div>
            </div>
            <form action="/api/auth/logout" className="mt-3" method="post">
              <Button className="w-full justify-start" size="sm" type="submit" variant="outline">
                <LogOut />
                Sign out
              </Button>
            </form>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-border bg-card px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <GitPullRequest className="size-4" />
                  Production PR triage
                </div>
                <h1 className="text-2xl font-semibold tracking-[-0.01em] sm:text-3xl">{title}</h1>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
              </div>
              <div className="flex gap-2">
                {showInstallApp ? (
                  <Button render={<Link href="/api/github/install" />} variant="outline">
                    <PlugZap />
                    Install app
                  </Button>
                ) : null}
                <Button render={<Link href="/analyze" />} variant="outline">
                  <Search />
                  Analyze URL
                </Button>
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

function NavLink({
  href,
  icon,
  children
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      href={href}
    >
      <span className="[&_svg]:size-4">{icon}</span>
      {children}
    </Link>
  );
}
