import { decodeJwt } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, backendUrl } from "@/lib/session";
import type { Role, SessionUser } from "@/lib/types";

interface BackendAuthResponse {
  status: boolean;
  message: string;
  data?: { token: string; user: SessionUser };
}

/**
 * Sends credentials to the backend. On success the token goes into an
 * httpOnly cookie and only the user is returned to the browser.
 */
export async function authenticate(
  request: Request,
  backendPath: "auth/login" | "auth/signup",
  requiredRole?: Role,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetch(backendUrl(backendPath), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { status: false, message: "The server is unavailable. Try again shortly." },
      { status: 502 },
    );
  }

  const json = (await response.json()) as BackendAuthResponse;
  if (!response.ok || !json.data) {
    return NextResponse.json(
      { status: false, message: json.message },
      { status: response.status },
    );
  }
  const { token, user } = json.data;
  if (requiredRole && user.role !== requiredRole) {
    return NextResponse.json(
      { status: false, message: "This account does not have admin access" },
      { status: 403 },
    );
  }

  const { exp } = decodeJwt(token);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Lax: the cookie is not sent on cross-site POST/PUT requests (CSRF).
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: exp ? Math.max(exp - Math.floor(Date.now() / 1000), 0) : undefined,
  });
  return NextResponse.json({ status: true, message: json.message, data: { user } });
}
