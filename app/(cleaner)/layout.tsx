import { Suspense } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "../(auth)/actions";
import { declineExpiredRequests } from "@/lib/expireRequests";
import NavLinks from "./NavLinks";
import { StatusBadge } from "./StatusBadge";

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

  const [{ data: profile }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single<{ full_name: string | null; role: string | null }>(),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("cleaner_id", user.id)
      .eq("status", "pending")
      .gt("response_deadline", now),
  ]);

  if (!profile || profile.role !== "cleaner") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <NavLinks
        signOut={signOut}
        userName={profile.full_name ?? user.email ?? ""}
        pendingCount={pendingCount ?? 0}
        statusBadge={
          <Suspense>
            <StatusBadge userId={user.id} />
          </Suspense>
        }
      />
      <main className="relative p-8 pt-16">
        {children}
      </main>
    </div>
  );
}
