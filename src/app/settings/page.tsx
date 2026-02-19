import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Fetch profile and cities in parallel
  const [{ data: profile }, { data: cities }] = await Promise.all([
    supabase.from("profiles").select("city_id, digest_preference").eq("id", user.id).single(),
    supabase.from("cities").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="font-serif text-4xl font-medium leading-tight text-charcoal">
        Settings
      </h1>

      <div className="mt-10">
        <SettingsForm
          cities={cities ?? []}
          currentCityId={profile?.city_id ?? ""}
          currentDigest={profile?.digest_preference ?? "weekly"}
        />
      </div>
    </div>
  );
}
