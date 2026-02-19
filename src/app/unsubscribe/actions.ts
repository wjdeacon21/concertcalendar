"use server";

import { createClient } from "@supabase/supabase-js";

export async function updateDigestPreference(
  uid: string,
  preference: "daily" | "weekly" | "none"
) {
  if (!uid) throw new Error("missing_uid");

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await serviceClient
    .from("profiles")
    .update({ digest_preference: preference })
    .eq("id", uid);

  if (error) throw new Error(error.message);
}
