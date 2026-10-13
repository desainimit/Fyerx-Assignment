"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, CalendarX, Plus } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { EventItem } from "@/lib/types";

export default function AdminEventsPage() {
  const [page, setPage] = useState(1);
  const { state, retry } = useApi<EventItem[]>(`admin/events?page=${page}&limit=10`);
  // Status changes made on this page, shown before the server confirms them.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [now] = useState(() => Date.now());

  async function setActive(event: EventItem, isActive: boolean) {
    setOverrides((current) => ({ ...current, [event.id]: isActive }));
    try {
      await api(`admin/events/${event.id}/status`, {
        method: "PATCH",
        body: { isActive },
      });
      toast.success(`“${event.title}” is now ${isActive ? "active" : "inactive"}`);
    } catch (error) {
      setOverrides((current) => ({ ...current, [event.id]: !isActive }));
      toast.error("Couldn't update the event", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Manage events
          </h1>
          <p className="mt-1 text-muted-foreground">
            Inactive events are hidden from visitors but never deleted.
          </p>
        </div>
        <Button asChild size="lg" className="h-10">
          <Link href="/admin/events/new">
            <Plus /> Add event
          </Link>
        </Button>
      </div>

      {state.status === "loading" && (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      )}
      {state.status === "error" && (
        <ErrorState message={state.message} onRetry={retry} />
      )}
      {state.status === "success" && state.result.data.length === 0 && (
        <EmptyState
          icon={<CalendarX />}
          title="No events yet"
          description="Create the first event and it will appear on the board."
          action={
            <Button asChild size="lg">
              <Link href="/admin/events/new">
                <CalendarPlus /> Add event
              </Link>
            </Button>
          }
        />
      )}
      {state.status === "success" && state.result.data.length > 0 && (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {state.result.data.map((event) => {
              const active = overrides[event.id] ?? event.isActive;
              const past = new Date(event.startsAt).getTime() < now;
              return (
                <li
                  key={event.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.imageUrl}
                    alt=""
                    className="hidden size-14 shrink-0 rounded-lg object-cover sm:block"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{event.title}</p>
                      <Badge variant="secondary">{event.category.name}</Badge>
                      {past && <Badge variant="outline">Past</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.startsAt)} · {event.city} ·{" "}
                      {formatPrice(event.pricePaise)}
                    </p>
                  </div>
                  <label className="flex items-center gap-3 text-sm font-medium sm:w-32 sm:justify-end">
                    <Switch
                      checked={active}
                      onCheckedChange={(checked) => setActive(event, checked)}
                      aria-label={`${event.title} is ${active ? "active" : "inactive"}`}
                    />
                    <span className={active ? "text-primary" : "text-muted-foreground"}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {state.result.metaData && (
            <Pagination meta={state.result.metaData} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
