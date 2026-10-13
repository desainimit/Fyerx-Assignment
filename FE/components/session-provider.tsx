"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/types";

const SessionContext = createContext<SessionUser | null>(null);

// The root layout reads the session cookie on the server and passes the
// user down. After login/logout, router.refresh() re-renders the layout.
export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return <SessionContext value={user}>{children}</SessionContext>;
}

export function useSession(): SessionUser | null {
  return useContext(SessionContext);
}
