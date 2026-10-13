"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup" | "admin";

const COPY: Record<Mode, { title: string; description: string; submit: string }> = {
  login: {
    title: "Welcome back",
    description: "Log in to see your feed, reminders and card designs.",
    submit: "Log in",
  },
  signup: {
    title: "Create your account",
    description: "Pick your favourite categories next and get a personal feed.",
    submit: "Sign up",
  },
  admin: {
    title: "Admin login",
    description: "Manage events for the community board.",
    submit: "Log in as admin",
  },
};

/** Only same-site paths, so ?next= can't send users to another website. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : null;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[mode];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const url =
        mode === "signup"
          ? "/api/auth/signup"
          : mode === "admin"
            ? "/api/auth/login?as=admin"
            : "/api/auth/login";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!response.ok) {
        setError(json?.message ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success(mode === "signup" ? "Account created" : "Logged in");
      const destination =
        mode === "admin"
          ? "/admin"
          : mode === "signup"
            ? "/favourites?welcome=1"
            : (safeNext(params.get("next")) ?? "/");
      router.push(destination);
      // Re-render the server layout so the header sees the new session.
      router.refresh();
    } catch {
      setError("Can't reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10"
            />
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            )}
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-10 w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {copy.submit}
          </Button>
        </form>
        {mode !== "admin" && (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <Link
              href={mode === "login" ? "/signup" : "/login"}
              className="font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
