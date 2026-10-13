"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarX, Heart, Settings2 } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { Pagination } from "@/components/pagination";
import {
  EmptyState,
  ErrorState,
  EventGridSkeleton,
} from "@/components/states";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";
import type { EventItem } from "@/lib/types";

export default function FeedPage() {
  const [page, setPage] = useState(1);
  const favourites = useApi<{ categories: string[] }>("favourites");
  const feed = useApi<EventItem[]>(`feed?page=${page}`);

  const failed =
    favourites.state.status === "error"
      ? favourites.state
      : feed.state.status === "error"
        ? feed.state
        : null;
  const ready =
    favourites.state.status === "success" && feed.state.status === "success";
  const noFavourites =
    favourites.state.status === "success" &&
    favourites.state.result.data.categories.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            My Feed
          </h1>
          <p className="mt-1 text-muted-foreground">
            Upcoming events from your favourite categories.
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/favourites">
            <Settings2 /> Edit favourites
          </Link>
        </Button>
      </div>

      {failed ? (
        <ErrorState
          message={failed.message}
          onRetry={() => {
            favourites.retry();
            feed.retry();
          }}
        />
      ) : !ready ? (
        <EventGridSkeleton count={3} />
      ) : noFavourites ? (
        <EmptyState
          icon={<Heart />}
          title="Pick your favourite categories"
          description="Choose a few categories like Music or Food and your feed will fill up with matching events."
          action={
            <Button asChild size="lg">
              <Link href="/favourites">Choose categories</Link>
            </Button>
          }
        />
      ) : feed.state.status === "success" &&
        feed.state.result.data.length === 0 ? (
        <EmptyState
          icon={<CalendarX />}
          title="No upcoming events in your categories"
          description="Nothing is scheduled right now. Add more categories or browse all events."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" size="lg" className="h-full">
                <Link href="/favourites">Add categories</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/">Browse all events</Link>
              </Button>
            </div>
          }
        />
      ) : (
        feed.state.status === "success" && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {feed.state.result.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {feed.state.result.metaData && (
              <Pagination
                meta={feed.state.result.metaData}
                onPageChange={(next) => {
                  setPage(next);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </>
        )
      )}
    </div>
  );
}
