import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="public-page-bg flex items-center justify-center px-4 py-12">
      <section className="public-card relative z-10 w-full max-w-md p-8 text-center">
        <div className="public-status-icon mb-5">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Page not found
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          This page is not available.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          The link may be expired, moved, or unavailable for your current account.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">
            <Home className="h-4 w-4" aria-hidden="true" />
            Return to MoEngage
          </Link>
        </Button>
      </section>
    </main>
  );
}
