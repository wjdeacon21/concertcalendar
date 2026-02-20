import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Behind Railway's reverse proxy, request.url contains the internal hostname.
  // x-forwarded-host/proto give us the real public origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const publicOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  if (error || !code) {
    return NextResponse.redirect(`${publicOrigin}/?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError) {
    return NextResponse.redirect(`${publicOrigin}/?error=auth_failed`);
  }

  return NextResponse.redirect(`${publicOrigin}/weekly`);
}
