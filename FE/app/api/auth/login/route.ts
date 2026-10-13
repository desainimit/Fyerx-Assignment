import { authenticate } from "@/lib/auth-route";

// POST /api/auth/login (visitors) or /api/auth/login?as=admin (admin pages).
export async function POST(request: Request) {
  const asAdmin = new URL(request.url).searchParams.get("as") === "admin";
  return authenticate(request, "auth/login", asAdmin ? "admin" : undefined);
}
