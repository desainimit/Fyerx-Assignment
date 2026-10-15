"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SearchX, Search, X } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { Pagination } from "@/components/pagination";
import {
  EmptyState,
  ErrorState,
  EventGridSkeleton,
} from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/lib/use-api";
import type { Category, EventItem } from "@/lib/types";

const ALL = "all";

/**
 * The URL is the single source of truth for filters and page, so they
 * combine, survive a refresh and can be shared as a link.
 */
export function EventsBrowser() {
  const pathname = usePathname();
  const params = useSearchParams();
  const category = params.get("category") ?? "";
  const city = params.get("city") ?? "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;

  const [search, setSearch] = useState(q);
  const [previousQuery, setPreviousQuery] = useState(q);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Shared links and browser navigation must also update the search field.
  if (q !== previousQuery) {
    setPreviousQuery(q);
    setSearch(q);
  }

  const filters = useApi<{ categories: Category[]; cities: string[] }>(
    "events/filters",
  );

  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (city) query.set("city", city);
  if (q) query.set("q", q);
  query.set("page", String(page));
  const { state, retry } = useApi<EventItem[]>(`events?${query}`);

  const update = useCallback((changes: Record<string, string>) => {
    // Read the current URL so a delayed search cannot restore removed filters.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any filter change starts again from page 1.
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString();
    // These filters fetch on the client. Next.js syncs useSearchParams with
    // replaceState, and the URL changes immediately even during rapid edits.
    window.history.replaceState(
      null,
      "",
      `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
    );
  }, [pathname]);

  // Wait until typing pauses before searching, instead of on every key.
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === q) return;
    const timer = setTimeout(() => update({ q: trimmed }), 350);
    searchTimer.current = timer;
    return () => clearTimeout(timer);
  }, [search, q, update]);

  const hasFilters = Boolean(category || city || q || search);
  function clearFilters() {
    clearTimeout(searchTimer.current);
    setSearch("");
    update({ category: "", city: "", q: "" });
  }

  const options =
    filters.state.status === "success" ? filters.state.result.data : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events, e.g. “night”"
            aria-label="Search events"
            className="h-10 pl-9"
            maxLength={100}
          />
        </div>
        <Select
          value={category || ALL}
          onValueChange={(value) =>
            update({ category: value === ALL ? "" : value })
          }
        >
          <SelectTrigger
            className="w-full data-[size=default]:h-10"
            aria-label="Category"
          >
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {options?.categories.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={city || ALL}
          onValueChange={(value) => update({ city: value === ALL ? "" : value })}
        >
          <SelectTrigger
            className="w-full data-[size=default]:h-10"
            aria-label="City"
          >
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All cities</SelectItem>
            {/* Keep a city chosen from a shared link even if it has no events now. */}
            {city && !options?.cities.includes(city) && (
              <SelectItem value={city}>{city}</SelectItem>
            )}
            {options?.cities.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" className="h-10" onClick={clearFilters}>
            <X /> Clear
          </Button>
        )}
      </div>

      {state.status === "loading" && <EventGridSkeleton />}
      {state.status === "error" && (
        <ErrorState message={state.message} onRetry={retry} />
      )}
      {state.status === "success" &&
        (state.result.data.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={hasFilters ? "No events match" : "No upcoming events yet"}
            description={
              hasFilters
                ? "Try another category, city or search word."
                : "New events are added regularly. Check back soon."
            }
            action={
              hasFilters && (
                <Button size="lg" onClick={clearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {state.result.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {state.result.metaData && (
              <Pagination
                meta={state.result.metaData}
                onPageChange={(next) => {
                  update({ page: String(next) });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </>
        ))}
    </div>
  );
}
