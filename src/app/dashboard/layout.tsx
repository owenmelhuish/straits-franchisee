import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav
        userName={profile?.full_name || profile?.email || user.email || "User"}
        isAdmin={profile?.role === "admin"}
      />
      <main className="flex-1 bg-[#F8F7F7] p-8">{children}</main>
    </div>
  );
}
