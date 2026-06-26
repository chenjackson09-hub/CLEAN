import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const requestUrl = new URL(request.url);
  const redirectTo = requestUrl.searchParams.get("redirectTo") ?? "/login";

  // Only allow same-origin redirects. `new URL(redirectTo, origin)` resolves an
  // absolute ("https://evil.com") or protocol-relative ("//evil.com") value to
  // an off-site URL, so verify the resolved origin matches before trusting it —
  // otherwise this would be an open redirect. Fall back to /login.
  const target = new URL(redirectTo, requestUrl.origin);
  const safePath =
    target.origin === requestUrl.origin ? target.pathname + target.search : "/login";

  return NextResponse.redirect(new URL(safePath, requestUrl.origin));
}
