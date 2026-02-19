"use client";

import { createClient } from "@/lib/supabase/client";

export default function ConnectButton() {
  async function handleConnect() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "spotify",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "user-library-read",
      },
    });
  }

  return (
    <button
      onClick={handleConnect}
      className="mt-10 rounded-full bg-pine px-8 py-4 font-sans text-base font-medium text-cream
        transition-transform duration-200 ease-in-out
        hover:-translate-y-0.5 hover:shadow-md
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
    >
      Connect Spotify
    </button>
  );
}
