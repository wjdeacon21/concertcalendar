"use client";

import { useState } from "react";
import Link from "next/link";
import { updateDigestPreference } from "./actions";

interface Props {
  uid: string;
}

const OPTIONS = [
  {
    preference: "weekly" as const,
    label: "Weekly only",
    description: "Just the Monday roundup. Nothing more.",
    confirmation: "Done. You'll hear from us once a week.",
  },
  {
    preference: "none" as const,
    label: "Pause for now",
    description: "No emails for a while. We get it.",
    confirmation: "Got it. We'll give you some space.",
  },
  {
    preference: "none" as const,
    label: "Unsubscribe from all",
    description: "No more emails from us, ever.",
    confirmation: "No hard feelings. You can always come back.",
  },
];

export default function UnsubscribeForm({ uid }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleSelect(option: typeof OPTIONS[number]) {
    setLoading(true);
    setSelected(option.label);
    setError(false);
    try {
      await updateDigestPreference(uid, option.preference);
      setConfirmation(option.confirmation);
    } catch {
      setError(true);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
        <p className="font-serif text-2xl font-medium text-charcoal">{confirmation}</p>
        <p className="font-sans text-sm text-charcoal/55">
          You can update this anytime in{" "}
          <Link href="/settings" className="underline underline-offset-2 hover:text-charcoal">
            Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm">
      <h1 className="font-serif text-3xl font-medium leading-snug text-charcoal">
        Email preferences
      </h1>
      <p className="mt-3 font-sans text-sm leading-relaxed text-charcoal/60">
        Change how often we reach out. No pressure either way.
      </p>

      <div className="mt-8 space-y-3">
        {OPTIONS.map((option) => (
          <button
            key={option.label}
            onClick={() => handleSelect(option)}
            disabled={loading}
            className="group w-full rounded-xl border border-charcoal/10 px-5 py-4 text-left
              transition-all duration-150 hover:border-pine/30 hover:bg-pine/5
              disabled:opacity-50
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
          >
            <p className="font-sans text-sm font-medium text-charcoal group-hover:text-charcoal">
              {loading && selected === option.label ? "Saving…" : option.label}
            </p>
            <p className="mt-0.5 font-sans text-xs text-charcoal/50">{option.description}</p>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 font-sans text-sm text-clay">
          Something went wrong. Try again in a moment.
        </p>
      )}
    </div>
  );
}
