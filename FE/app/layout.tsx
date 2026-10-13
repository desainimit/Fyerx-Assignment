import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { SessionProvider } from "@/components/session-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Community Events Board",
  description: "Find music nights, workshops, food fairs and more near you.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <html suppressHydrationWarning lang="en" className={`${sans.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <SessionProvider user={user}>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">
            {children}
          </main>
          <Toaster richColors position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
