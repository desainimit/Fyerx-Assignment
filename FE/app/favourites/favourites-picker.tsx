"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Check,
  Dumbbell,
  Hammer,
  Loader2,
  Music,
  Smile,
  UtensilsCrossed,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  music: Music,
  workshop: Hammer,
  food: UtensilsCrossed,
  sports: Dumbbell,
  kids: Smile,
};

export function FavouritesPicker() {
  const router = useRouter();
  const welcome = useSearchParams().get("welcome") === "1";
  const options = useApi<{ categories: Category[] }>("events/filters");
  const saved = useApi<{ categories: string[] }>("favourites");
  // null until the user changes something; until then show what is saved.
  const [picked, setPicked] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  if (options.state.status === "error" || saved.state.status === "error") {
    const failed = options.state.status === "error" ? options : saved;
    return (
      <ErrorState
        message={failed.state.status === "error" ? failed.state.message : ""}
        onRetry={() => {
          options.retry();
          saved.retry();
        }}
      />
    );
  }
  if (options.state.status !== "success" || saved.state.status !== "success") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const categories = options.state.result.data.categories;
  const selected = picked ?? saved.state.result.data.categories;

  function toggle(code: string) {
    setPicked(
      selected.includes(code)
        ? selected.filter((item) => item !== code)
        : [...selected, code],
    );
  }

  async function save() {
    setSaving(true);
    try {
      await api("favourites", { method: "PUT", body: { categories: selected } });
      toast.success("Favourites saved");
      router.push("/feed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {welcome && (
        <p className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">
          Welcome! Pick the kinds of events you enjoy and we’ll build your feed.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const Icon = ICONS[category.code] ?? Tag;
          const on = selected.includes(category.code);
          return (
            <button
              key={category.code}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(category.code)}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                on && "border-primary bg-accent ring-1 ring-primary",
              )}
            >
              <span
                className={cn(
                  "rounded-lg bg-muted p-2.5 transition-colors",
                  on && "bg-primary text-primary-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="font-medium">{category.name}</span>
              {on && <Check className="ml-auto size-5 text-primary" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.length === 0
            ? "Nothing selected: your feed will be empty."
            : `${selected.length} selected`}
        </p>
        <Button size="lg" className="h-10 sm:w-48" onClick={save} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          Save and see my feed
        </Button>
      </div>
    </div>
  );
}
