import { createClient } from "@/lib/supabase/server";
import UnsubscribeForm from "./UnsubscribeForm";
import Link from "next/link";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const params = await searchParams;

  // uid from email link query param, or fall back to active session
  let uid: string | null = params.uid ?? null;

  if (!uid) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uid = user?.id ?? null;
  }

  if (!uid) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-serif text-xl text-charcoal/55">
          This link doesn't look right.
        </p>
        <p className="font-sans text-sm text-charcoal/40">
          Sign in and manage your preferences in{" "}
          <Link href="/settings" className="underline underline-offset-2 hover:text-charcoal/70">
            Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  return <UnsubscribeForm uid={uid} />;
}
