import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, backendUrl } from "@/lib/session";

/**
 * Forwards /api/<path> to the backend JSON API, adding the session token
 * from the httpOnly cookie as a Bearer header. The backend still checks the
 * token and role on every request; this route only attaches it.
 */
async function forward(
  request: NextRequest,
  { params }: RouteContext<"/api/[...path]">,
) {
  const { path } = await params;
  // fetch() resolves "..", which could reach backend paths outside /api/v1.
  if (path.some((segment) => segment === "." || segment === "..")) {
    return NextResponse.json(
      { status: false, message: "Not found" },
      { status: 404 },
    );
  }
  const target =
    backendUrl(path.map(encodeURIComponent).join("/")) +
    request.nextUrl.search;

  const headers = new Headers({ Accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { status: false, message: "The server is unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
};
