"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarHeart, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links =
    user?.role === "admin"
      ? [
          { href: "/", label: "Events" },
          { href: "/admin", label: "Admin" },
        ]
      : user
        ? [
            { href: "/", label: "Events" },
            { href: "/feed", label: "My Feed" },
            { href: "/favourites", label: "Favourites" },
          ]
        : [{ href: "/", label: "Events" }];

  async function logout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const nav = (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setOpen(false)}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
            isActive(link.href) && "bg-accent text-accent-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CalendarHeart className="size-6 text-primary" aria-hidden />
          <span>Community Events</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">{nav}</nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="max-w-48 truncate text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut /> Log out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open && (
        <div className="border-t px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">{nav}</nav>
          <div className="mt-3 flex flex-col gap-2 border-t pt-3">
            {user ? (
              <>
                <span className="truncate px-3 text-sm text-muted-foreground">
                  {user.email}
                </span>
                <Button variant="outline" onClick={logout}>
                  <LogOut /> Log out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    Sign up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
