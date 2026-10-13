"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Check, Loader2, Lock, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/session-provider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import {
  CARD_THEMES,
  MAX_STICKERS,
  STICKERS,
  type CardDesign,
  type CardTheme,
  type EventItem,
  type StickerId,
} from "@/lib/types";

const THEMES: Record<CardTheme, { label: string; gradient: string }> = {
  sunset: {
    label: "Sunset",
    gradient: "bg-linear-to-br from-amber-400 via-rose-500 to-fuchsia-700",
  },
  ocean: {
    label: "Ocean",
    gradient: "bg-linear-to-br from-sky-400 via-cyan-600 to-blue-800",
  },
  forest: {
    label: "Forest",
    gradient: "bg-linear-to-br from-lime-400 via-emerald-600 to-teal-800",
  },
};

const STICKER_NAMES: Record<StickerId, string> = {
  star: "Star",
  heart: "Heart",
  "music-note": "Music note",
  sparkles: "Sparkles",
  party: "Party popper",
};

// Where each of the (up to) three stickers sits on the card.
const SLOTS = [
  { top: "8%", right: "6%", rotate: -12 },
  { top: "30%", right: "22%", rotate: 10 },
  { top: "10%", right: "38%", rotate: 6 },
];

// A sticker can be added more than once, so each placed one gets its own
// key. That lets the right sticker animate out when one is removed.
type Placed = { key: number; id: StickerId };
type Draft = { theme: CardTheme; stickers: Placed[] };
type SaveStatus = "idle" | "saving" | "saved" | "error";

export function CardDesigner({ event }: { event: EventItem }) {
  const user = useSession();
  const saved = useApi<CardDesign>(user ? `card-design/${event.id}` : null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const nextKey = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<Draft | null>(null);
  const latest = useRef(0);

  const loaded: Draft | null =
    saved.state.status === "success"
      ? {
          theme: saved.state.result.data.theme,
          stickers: saved.state.result.data.stickers.map((id, index) => ({
            key: -(index + 1),
            id,
          })),
        }
      : null;
  const design: Draft = draft ?? loaded ?? { theme: "sunset", stickers: [] };

  async function persist(value: Draft) {
    pending.current = null;
    const request = ++latest.current;
    try {
      await api(`card-design/${event.id}`, {
        method: "PUT",
        body: {
          theme: value.theme,
          stickers: value.stickers.map((sticker) => sticker.id),
        },
      });
      if (request === latest.current) setStatus("saved");
    } catch (error) {
      if (request !== latest.current) return;
      setStatus("error");
      toast.error("Couldn't save your card design", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  // The card updates instantly; saving waits until taps pause briefly.
  function change(next: Draft) {
    setDraft(next);
    setStatus("saving");
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(next), 500);
  }

  // Leaving the page within that pause still saves the last change.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current) void persist(pending.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function addSticker(id: StickerId) {
    if (design.stickers.length >= MAX_STICKERS) {
      toast.info(`You can add up to ${MAX_STICKERS} stickers`);
      return;
    }
    change({
      ...design,
      stickers: [...design.stickers, { key: nextKey.current++, id }],
    });
  }

  function removeSticker(key: number) {
    // A sticker stays on screen while its exit animation plays; a tap on it
    // then has nothing left to remove and shouldn't trigger a save.
    if (!design.stickers.some((sticker) => sticker.key === key)) return;
    change({
      ...design,
      stickers: design.stickers.filter((sticker) => sticker.key !== key),
    });
  }

  const locked = !user;
  const loading = Boolean(user) && saved.state.status === "loading";
  const full = design.stickers.length >= MAX_STICKERS;

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {loading ? (
          <Skeleton className="aspect-4/3 rounded-2xl sm:aspect-16/10" />
        ) : (
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl text-white shadow-lg sm:aspect-16/10">
            {/* All three backgrounds are stacked; switching cross-fades them. */}
            {CARD_THEMES.map((theme) => (
              <motion.div
                key={theme}
                aria-hidden
                className={cn("absolute inset-0", THEMES[theme].gradient)}
                initial={false}
                animate={{ opacity: design.theme === theme ? 1 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            ))}
            <div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/5 to-transparent" />

            <div className="relative flex h-full flex-col justify-end gap-1 p-5 sm:p-7">
              <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
                {event.category.name}
              </span>
              <p className="mt-2 line-clamp-2 text-xl font-bold leading-tight sm:text-3xl">
                {event.title}
              </p>
              <p className="text-sm text-white/90 sm:text-base">
                {formatDate(event.startsAt)} · {event.city}
              </p>
            </div>

            <AnimatePresence>
              {design.stickers.map((sticker, index) => (
                <motion.button
                  key={sticker.key}
                  type="button"
                  layout
                  disabled={locked}
                  onClick={() => removeSticker(sticker.key)}
                  aria-label={`Remove ${STICKER_NAMES[sticker.id]} sticker`}
                  title="Tap to remove"
                  className="absolute text-4xl drop-shadow-md select-none sm:text-6xl"
                  style={{ top: SLOTS[index].top, right: SLOTS[index].right }}
                  initial={{ scale: 0, opacity: 0, rotate: -40 }}
                  animate={{ scale: 1, opacity: 1, rotate: SLOTS[index].rotate }}
                  exit={{ scale: 0, opacity: 0, rotate: 40 }}
                  whileHover={locked ? undefined : { scale: 1.12 }}
                  whileTap={locked ? undefined : { scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                >
                  {STICKERS[sticker.id]}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="relative space-y-6 rounded-2xl border bg-card p-5">
          <fieldset disabled={locked || loading} className="space-y-6 disabled:opacity-50">
            <div>
              <legend className="mb-3 text-sm font-semibold">Background</legend>
              <div className="flex gap-3">
                {CARD_THEMES.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    aria-pressed={design.theme === theme}
                    onClick={() =>
                      design.theme !== theme && change({ ...design, theme })
                    }
                    className="group flex flex-col items-center gap-1.5 text-xs font-medium"
                  >
                    <span
                      className={cn(
                        "flex size-12 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-all group-focus-visible:ring-3 group-focus-visible:ring-ring",
                        THEMES[theme].gradient,
                        design.theme === theme && "ring-2 ring-primary",
                      )}
                    >
                      {design.theme === theme && (
                        <Check className="size-5 text-white" aria-hidden />
                      )}
                    </span>
                    {THEMES[theme].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-sm font-semibold">Stickers</p>
                <span className="text-xs text-muted-foreground">
                  {design.stickers.length}/{MAX_STICKERS}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(STICKERS) as StickerId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => addSticker(id)}
                    aria-label={`Add ${STICKER_NAMES[id]} sticker`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-xl border bg-background text-2xl transition-all hover:-translate-y-0.5 hover:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95",
                      full && "opacity-40 hover:translate-y-0",
                    )}
                  >
                    {STICKERS[id]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {full
                  ? "That's the maximum. Tap a sticker on the card to remove it."
                  : "Tap to add. Tap a sticker on the card to remove it."}
              </p>
            </div>
          </fieldset>

          {!locked && (
            <div className="flex min-h-8 items-center gap-2 text-sm" aria-live="polite">
              {status === "saving" && (
                <>
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving…</span>
                </>
              )}
              {status === "saved" && (
                <>
                  <Check className="size-4 text-emerald-600" />
                  <span className="text-muted-foreground">Saved</span>
                </>
              )}
              {status === "error" && (
                <>
                  <span className="text-destructive">Not saved.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatus("saving");
                      void persist(design);
                    }}
                  >
                    <RotateCw /> Retry
                  </Button>
                </>
              )}
            </div>
          )}

          {saved.state.status === "error" && (
            <p className="text-sm text-destructive">
              Couldn’t load your saved design. {saved.state.message}
            </p>
          )}

          {locked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card/85 p-6 text-center backdrop-blur-[2px]">
              <Lock className="size-6 text-primary" aria-hidden />
              <p className="text-sm font-medium">
                Log in to design your card and keep it for this event.
              </p>
              <Button asChild size="lg">
                <Link href={`/login?next=/events/${event.id}`}>Log in</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
