"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const pendingTimeoutMs = 8000;

export function NavigationProgress() {
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const clearPendingId = window.setTimeout(() => {
      setIsPending(false);
    }, 0);

    return () => {
      window.clearTimeout(clearPendingId);
    };
  }, [pathname]);

  useEffect(() => {
    function beginPending() {
      setIsPending(true);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setIsPending(false);
        timeoutRef.current = null;
      }, pendingTimeoutMs);
    }

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search
      ) {
        return;
      }

      beginPending();
    }

    function handleSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) {
        return;
      }

      const form = event.target;

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const action = form.getAttribute("action") ?? window.location.pathname;
      const nextUrl = new URL(action, window.location.href);

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      beginPending();
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!isPending) {
    return null;
  }

  return (
    <div aria-live="polite" role="status">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/10">
        <div className="h-full w-2/3 animate-[bitspam-progress_1.1s_ease-in-out_infinite] bg-primary" />
      </div>
      <div className="pointer-events-none fixed right-4 top-4 z-50 hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm sm:flex">
        <Loader2 className="size-3.5 animate-spin text-primary" />
        Loading
      </div>
    </div>
  );
}
