import type { Metadata } from "next";
import { Lora, Nunito } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Concert Calendar",
  description: "Your music. Your city. This week.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${lora.variable} ${nunito.variable} antialiased bg-cream text-charcoal font-sans`}
      >
        <header className="border-b border-charcoal/10">
          <div className="mx-auto flex max-w-[720px] items-center justify-between px-6 py-5 md:px-12">
            <Link
              href="/"
              className="font-serif text-xl font-medium text-pine tracking-tight"
            >
              Concert Calendar
            </Link>

            {user && (() => {
              const name: string =
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                "";
              const avatar: string = user.user_metadata?.avatar_url ?? "";
              const initial = name ? name[0].toUpperCase() : "?";

              return (
                <Link
                  href="/settings"
                  className="group flex items-center gap-2.5"
                  aria-label="Settings"
                >
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={name || "Profile"}
                      width={28}
                      height={28}
                      className="rounded-full object-cover ring-1 ring-charcoal/10"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine/20">
                      <span className="font-sans text-xs font-medium text-pine">{initial}</span>
                    </span>
                  )}
                  {name && (
                    <span className="font-sans text-sm text-charcoal/60 transition-colors group-hover:text-charcoal">
                      {name}
                    </span>
                  )}
                </Link>
              );
            })()}
          </div>
        </header>

        <main className="mx-auto max-w-[720px] px-6 py-12 md:px-12 md:py-16">
          {children}
        </main>
      </body>
    </html>
  );
}
