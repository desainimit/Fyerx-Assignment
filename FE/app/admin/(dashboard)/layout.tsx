import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// proxy.ts already redirects non-admins. Checking again here means admin
// pages stay protected even if the proxy matcher is changed by mistake.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (user?.role !== "admin") redirect("/admin/login");
  return children;
}
