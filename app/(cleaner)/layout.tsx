import { Suspense } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "../(auth)/actions";
import { declineExpiredRequests } from "@/lib/expireRequests";
import { sendReminders } from "@/lib/reminders";
import NavLinks from "./NavLinks";
import { StatusBadge } from "./StatusBadge";
import HelpWidget from "@/components/HelpWidget";
import FinishProfileBanner from "@/components/FinishProfileBanner";
import { isOwnSignupUnfinished } from "@/lib/onboarding/unfinished";

export default async function CleanerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Resolve any requests that expired without a response before counting.
  await declineExpiredRequests(user.id);
  await sendReminders(user.id, "cleaner");

  const [{ data: profile }, { count: pendingCount }, signupUnfinished] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, avatar_url")
      .eq("id", user.id)
      .single<{ full_name: string | null; role: string | null; avatar_url: string | null }>(),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("cleaner_id", user.id)
      .eq("status", "pending")
      .gt("response_deadline", now),
    isOwnSignupUnfinished(supabase, user.id),
  ]);

  if (!profile || profile.role !== "cleaner") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <NavLinks
        signOut={signOut}
        userId={user.id}
        userName={profile.full_name ?? user.email ?? ""}
        avatarUrl={profile.avatar_url}
        pendingCount={pendingCount ?? 0}
        statusBadge={
          <Suspense>
            <StatusBadge userId={user.id} />
          </Suspense>
        }
      />
      <main className="relative p-3 pt-28">
        {signupUnfinished && <FinishProfileBanner href="/register/cleaner" />}
        {children}
      </main>
      <HelpWidget />
    </div>
  );
}
