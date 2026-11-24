import Welcome from "@/components/welcome/Welcome";
import { getCurrentUser } from "@/lib/supabase/server";

// The first screen of the website. Everyone sees the Cindy splash first (middleware.ts lets signed-in
// people through to "/" too). A signed-out visitor then gets the welcome / install choice; a signed-in
// one fades on to /login, which sends them to their own home (see components/welcome/Welcome.tsx).
export default async function Home() {
  let signedIn = false;
  try {
    signedIn = !!(await getCurrentUser());
  } catch {
    signedIn = false; // can't tell: treat as signed out, the splash still shows
  }
  return <Welcome signedIn={signedIn} />;
}
