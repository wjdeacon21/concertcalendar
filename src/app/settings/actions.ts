"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(cityId: string, digestPreference: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ city_id: cityId, digest_preference: digestPreference })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
