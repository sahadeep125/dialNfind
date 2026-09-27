import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold">We could not find that page</h1>
      <p className="mt-2 max-w-md text-muted-foreground">The link may be old, or the listing may have been removed. Try searching for the service you need.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="cta">
          <Link href="/search">Search services</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
