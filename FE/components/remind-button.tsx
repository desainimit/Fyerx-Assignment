"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function RemindButton({ eventId }: { eventId: string }) {
  const user = useSession();
  const reminders = useApi<{ eventIds: string[] }>(user ? "reminders" : null);
  // null until the user taps; then this local value wins over the loaded one.
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  // Only the latest tap may roll the button back, so quick double taps
  // can't leave it showing an outdated value.
  const latest = useRef(0);

  if (!user) {
    return (
      <Button asChild variant="outline" size="lg" className="h-10">
        <Link href={`/login?next=/events/${eventId}`}>
          <Bell /> Log in to get a reminder
        </Link>
      </Button>
    );
  }

  const saved =
    reminders.state.status === "success"
      ? reminders.state.result.data.eventIds.includes(eventId)
      : false;
  const on = optimistic ?? saved;
  const loading = reminders.state.status === "loading";

  async function toggle() {
    const previous = on;
    const next = !on;
    const request = ++latest.current;
    setOptimistic(next); // 1. update the screen immediately
    try {
      await api(`reminders/${eventId}`, {
        method: "PUT",
        body: { enabled: next },
      }); // 2. save in the background
    } catch (error) {
      if (request !== latest.current) return;
      setOptimistic(previous); // 3. on failure, go back and explain
      toast.error("Couldn't save your reminder", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  return (
    <Button
      size="lg"
      variant={on ? "default" : "outline"}
      className="h-10 min-w-44"
      aria-pressed={on}
      disabled={loading}
      onClick={toggle}
    >
      {on ? <BellRing /> : <Bell />}
      {on ? "Reminder set" : "Remind me"}
    </Button>
  );
}
