"use client";

import "./globals.css";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/** Shown when the root layout itself fails; it replaces the whole page, so it brings its own html and body. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en-IN">
      <body className="flex min-h-dvh flex-col items-center justify-center p-6 text-center font-sans">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="mt-2 max-w-md text-muted-foreground">We could not load DialNFind. Please try again in a moment.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
          Try again
        </button>
      </body>
    </html>
  );
}
