import { jwtVerify } from "jose";
import type { Role, SessionUser } from "@/lib/types";

// The JWT issued by the backend is kept in this httpOnly cookie, so page
// scripts can never read it. Only Next.js server code sees it.
export const SESSION_COOKIE = "ceb_session";

// Must match the backend's JWT settings (BE/src/constants/auth.constants.ts).
const ISSUER = "community-events-board";
const AUDIENCE = "community-events-board-api";

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set in FE/.env.local");
  return new TextEncoder().encode(value);
}

/** Verifies signature, expiry, issuer and audience. Returns null if invalid. */
export async function verifySession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      (payload.role !== "user" && payload.role !== "admin")
    ) {
      return null;
    }
    return {
      id: payload.sub,
      role: payload.role as Role,
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}

export function backendUrl(path: string): string {
  const base = process.env.BACKEND_URL ?? "http://localhost:3001/api/v1";
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
