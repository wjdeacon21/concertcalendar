import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConnectButton from "@/components/ConnectButton";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 9.2 — authenticated users go straight to their weekly view
  if (user) redirect("/weekly");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-serif text-4xl font-medium leading-tight text-charcoal md:text-5xl">
        Your music.
        <br />
        Your city.
        <br />
        This week.
      </h1>

      <p className="mt-6 max-w-sm text-base leading-relaxed text-charcoal/70">
        Concert Calendar connects your Spotify likes to shows happening near you.
      </p>

      <ConnectButton />

      <div className="mt-16 flex flex-col gap-6 text-left sm:flex-row sm:gap-12">
        {[
          { step: "1", text: "Connect your Spotify account" },
          { step: "2", text: "We find artists in your likes" },
          { step: "3", text: "See their shows this week" },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mustard/30 font-sans text-sm font-medium text-charcoal">
              {step}
            </span>
            <p className="text-sm leading-relaxed text-charcoal/70">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
