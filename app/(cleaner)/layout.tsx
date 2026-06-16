import { Suspense } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "../(auth)/actions";
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single<{ full_name: string | null; role: string | null }>();

  if (!profile || profile.role !== "cleaner") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <NavLinks
        signOut={signOut}
        userName={profile.full_name ?? user.email ?? ""}
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
