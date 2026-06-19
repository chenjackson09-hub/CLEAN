import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roleHome";
import type { UserRole } from "@/types/database";

// Email-confirmation landing route. The "Confirm signup" email template points
// here with a token_hash; we verify it, which establishes the session, then send
// the user to their role's home page.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let confirmed = false;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    confirmed = !error;
  } else if (code) {
    // PKCE fallback (default {{ .ConfirmationURL }} template)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    confirmed = !error;
  }

  if (!confirmed) {
    return NextResponse.redirect(new URL("/login?error=could_not_confirm", origin));
  }

  const { data: { user } } = await supabase.auth.getUser();
  let home = "/login";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    home = profile?.role ? (ROLE_HOME[profile.role as UserRole] ?? "/login") : "/login";
  }

  return NextResponse.redirect(new URL(home, origin));
}
