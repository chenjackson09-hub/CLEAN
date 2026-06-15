import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import CustomerNav from "./CustomerNav";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Single query — role check + display name in one round-trip
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "customer") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav signOut={signOut} userName={profile.full_name ?? user.email ?? ""} />
      <main className="p-8 pt-16">
        {children}
      </main>
    </div>
  );
}
