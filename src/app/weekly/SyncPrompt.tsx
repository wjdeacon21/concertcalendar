"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function SyncPrompt() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(false);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setError(false);
    try {
      const res = await fetch("/api/sync-artists", { method: "POST" });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error("sync_failed");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSyncing(false);
    }
  }, [router]);

  if (syncing) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
        <div className="relative h-16 w-16">
          <div
            className="h-full w-full rounded-full border-4 border-charcoal/20 bg-charcoal"
            style={{ animation: "spin 3s linear infinite" }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-cream" />
            </div>
          </div>
        </div>
        <p className="font-serif text-xl text-charcoal/70">
          Flipping through your record collection…
        </p>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-serif text-xl text-charcoal/70">
          Hmm, Spotify&apos;s being quiet right now. Let&apos;s try again.
        </p>
        <button
          onClick={runSync}
          className="rounded-full bg-pine px-6 py-3 font-sans text-sm font-medium text-cream
            transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="font-serif text-4xl font-medium leading-tight text-charcoal">
        Let&apos;s find out who&apos;s playing near you.
      </h1>
      <p className="max-w-sm text-base text-charcoal/70">
        We&apos;ll scan your Spotify library and match your artists to upcoming concerts.
      </p>
      <button
        onClick={runSync}
        className="rounded-full bg-pine px-6 py-3 font-sans text-sm font-medium text-cream
          transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        Sync my Spotify library
      </button>
    </div>
  );
}
