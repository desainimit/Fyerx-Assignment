"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarDays, CalendarX, MapPin, Ticket } from "lucide-react";
import { CardDesigner } from "@/components/card-designer";
import { RemindButton } from "@/components/remind-button";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { EventItem } from "@/lib/types";

export function EventDetail({ id }: { id: string }) {
  const { state, retry } = useApi<EventItem>(`events/${id}`);
  // Read the clock once per mount; rendering must not depend on it changing.
  const [now] = useState(() => Date.now());

  if (state.status === "loading") {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="aspect-21/9 w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (state.status === "error") {
    // 400 = malformed id, 404 = unknown or inactive event.
    return state.code === 404 || state.code === 400 ? (
      <EmptyState
        icon={<CalendarX />}
        title="Event not found"
        description="This event may have been removed or is no longer available."
        action={
          <Button asChild size="lg">
            <Link href="/">Browse events</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState message={state.message} onRetry={retry} />
    );
  }

  const event = state.result.data;
  const isPast = new Date(event.startsAt).getTime() < now;

  return (
    <article className="space-y-10">
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All events
        </Link>

        <div className="relative aspect-16/9 overflow-hidden rounded-2xl bg-muted md:aspect-21/9">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.imageUrl} alt="" className="size-full object-cover" />
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{event.category.name}</Badge>
              {isPast && <Badge variant="secondary">This event has ended</Badge>}
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
              {event.title}
            </h1>
            <div className="flex flex-col gap-2 text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4" aria-hidden />
                {formatDate(event.startsAt)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4" aria-hidden />
                {event.city}
              </span>
              <span className="flex items-center gap-2 font-semibold text-primary">
                <Ticket className="size-4" aria-hidden />
                {formatPrice(event.pricePaise)}
              </span>
            </div>
          </div>
          {!isPast && <RemindButton eventId={event.id} />}
        </div>

        <p className="max-w-3xl leading-relaxed whitespace-pre-line text-foreground/90">
          {event.description}
        </p>
      </div>

      <section aria-labelledby="designer-heading" className="space-y-4">
        <div>
          <h2 id="designer-heading" className="text-xl font-bold tracking-tight">
            Design your card
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a background and add up to 3 stickers. Your design is saved
            for this event.
          </p>
        </div>
        <CardDesigner event={event} />
      </section>
    </article>
  );
}
