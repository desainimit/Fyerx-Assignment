import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Runs on the server before protected pages render. A missing, expired or
 * forged token, or a visitor token on an admin page, is redirected before
 * any page HTML is sent. The backend separately checks every API call.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return user?.role === "admin"
        ? NextResponse.redirect(new URL("/admin", request.url))
        : NextResponse.next();
    }
    if (user?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // /feed and /favourites need any signed-in user.
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/feed", "/favourites"],
};
