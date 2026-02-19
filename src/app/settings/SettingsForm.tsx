"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";

interface City {
  id: string;
  name: string;
}

interface Props {
  cities: City[];
  currentCityId: string;
  currentDigest: string;
}

const DIGEST_OPTIONS = [
  { value: "daily",  label: "Daily",  description: "Every morning" },
  { value: "weekly", label: "Weekly", description: "Every Monday" },
  { value: "none",   label: "None",   description: "Just the app" },
] as const;

export default function SettingsForm({ cities, currentCityId, currentDigest }: Props) {
  const router = useRouter();

  const [cityId, setCityId] = useState(currentCityId);
  const [digest, setDigest] = useState(currentDigest || "weekly");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [syncState, setSyncState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Save preferences ───────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    try {
      await updateProfile(cityId, digest);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [cityId, digest]);

  const isDirty = cityId !== currentCityId || digest !== (currentDigest || "weekly");

  // ── Spotify sync ──────────────────────────────────────────────────────────

  const handleSync = useCallback(async () => {
    setSyncState("loading");
    try {
      const res = await fetch("/api/sync-artists", { method: "POST" });
      if (!res.ok) throw new Error("sync_failed");
      setSyncState("success");
    } catch {
      setSyncState("error");
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }, [router]);

  return (
    <div className="space-y-12">

      {/* ── Your city ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl font-medium text-charcoal">Your city</h2>
        <p className="mt-1 font-sans text-sm text-charcoal/60">
          We'll show you concerts happening here.
        </p>
        <select
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
          className="mt-4 w-full max-w-xs rounded-lg border border-charcoal/15 bg-cream px-4 py-3
            font-sans text-sm text-charcoal shadow-sm
            focus:outline-none focus:ring-2 focus:ring-pine/40"
        >
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </section>

      {/* ── Email digest ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl font-medium text-charcoal">Email digest</h2>
        <p className="mt-1 font-sans text-sm text-charcoal/60">
          How often should we send your upcoming shows?
        </p>
        <fieldset className="mt-4 space-y-3" aria-label="Email digest frequency">
          {DIGEST_OPTIONS.map(({ value, label, description }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-4 rounded-xl border border-charcoal/10 px-5 py-4
                transition-colors hover:border-pine/30 hover:bg-pine/5 has-[:checked]:border-pine/40 has-[:checked]:bg-pine/5"
            >
              <input
                type="radio"
                name="digest"
                value={value}
                checked={digest === value}
                onChange={() => setDigest(value)}
                className="h-4 w-4 accent-pine"
              />
              <span className="flex flex-col">
                <span className="font-sans text-sm font-medium text-charcoal">{label}</span>
                <span className="font-sans text-xs text-charcoal/50">{description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      {/* ── Save button ────────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={handleSave}
          disabled={saveState === "saving" || (!isDirty && saveState === "idle")}
          className="rounded-full bg-pine px-7 py-3 font-sans text-sm font-medium text-cream
            transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
            disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save preferences"}
        </button>
        {saveState === "error" && (
          <p className="mt-2 font-sans text-sm text-clay">Something went wrong. Try again in a moment.</p>
        )}
      </div>

      <hr className="border-charcoal/10" />

      {/* ── Spotify library ────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl font-medium text-charcoal">Spotify library</h2>
        <p className="mt-1 font-sans text-sm text-charcoal/60">
          Sync your liked songs to catch any new artists you've added.
        </p>
        <div className="mt-4">
          {syncState === "idle" && (
            <button
              onClick={handleSync}
              className="rounded-full bg-pine px-6 py-3 font-sans text-sm font-medium text-cream
                transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
            >
              Refresh my library
            </button>
          )}
          {syncState === "loading" && (
            <p className="font-sans text-sm italic text-charcoal/60">Updating your collection…</p>
          )}
          {syncState === "success" && (
            <p className="font-sans text-sm text-charcoal/70">
              Done — your library is up to date.{" "}
              <button onClick={() => setSyncState("idle")} className="underline underline-offset-2 hover:text-charcoal">
                Refresh again
              </button>
            </p>
          )}
          {syncState === "error" && (
            <div className="flex flex-col gap-3">
              <p className="font-sans text-sm text-charcoal/70">
                Hmm, Spotify's being quiet right now. Let's try again.
              </p>
              <button
                onClick={handleSync}
                className="w-fit rounded-full bg-pine px-6 py-3 font-sans text-sm font-medium text-cream
                  transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </section>

      <hr className="border-charcoal/10" />

      {/* ── Privacy note ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl font-medium text-charcoal">Privacy</h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-charcoal/60">
          We only read your liked songs. Nothing else. We never share your data
          or store anything beyond what's needed to show you concerts.
        </p>
      </section>

      <hr className="border-charcoal/10" />

      {/* ── Disconnect ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl font-medium text-charcoal">Take a break</h2>
        <p className="mt-1 font-sans text-sm text-charcoal/60">
          Sign out whenever you like. Your preferences will be here when you return.
        </p>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="mt-4 rounded-full border border-charcoal/20 px-6 py-3 font-sans text-sm font-medium text-charcoal/70
            transition-all duration-200 hover:border-charcoal/40 hover:text-charcoal
            disabled:opacity-40
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          {disconnecting ? "Signing out…" : "Sign out"}
        </button>
      </section>

    </div>
  );
}
