import { Suspense } from "react";
import { EventsBrowser } from "@/components/events-browser";
import { EventGridSkeleton } from "@/components/states";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Upcoming events
        </h1>
        <p className="mt-1 text-muted-foreground">
          Music nights, workshops, food fairs and more, nearest first.
        </p>
      </div>
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={<EventGridSkeleton />}>
        <EventsBrowser />
      </Suspense>
    </div>
  );
}
