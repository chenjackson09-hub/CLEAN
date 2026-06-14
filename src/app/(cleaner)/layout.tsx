import { createClient, getCurrentUser, getCleanerStatus } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import NavLinks from "./NavLinks";

export default async function CleanerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: profile }, status] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single<{ full_name: string | null; role: string | null }>(),
    getCleanerStatus(user.id),
  ]);

  if (!profile || profile.role !== "cleaner") redirect("/login");

  const statusColor: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <NavLinks
        signOut={signOut}
        userName={profile.full_name ?? user.email ?? ""}
        status={status}
        statusColor={statusColor[status ?? ""] ?? "bg-gray-100 text-gray-600"}
      />
      {/* pt-14 on mobile to clear the fixed top bar */}
      <main className="relative flex-1 p-8 pt-20 lg:pt-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
