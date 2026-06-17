"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="public-page-bg flex items-center justify-center px-4 py-12">
      <section className="public-card relative z-10 w-full max-w-md p-8 text-center" role="alert">
        <div className="public-status-icon mb-5 bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          We could not load this screen.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Retry the page. If the issue continues, sign in again or contact your administrator.
        </p>
        <Button type="button" onClick={reset} className="mt-6 w-full">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      </section>
    </main>
  );
}
