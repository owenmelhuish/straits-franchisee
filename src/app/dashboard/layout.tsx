import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("dev-role")?.value;

  if (!role) redirect("/login");

  const isAdmin = role === "admin";
  const userName = isAdmin ? "Admin User" : "Franchisee User";

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userName={userName} isAdmin={isAdmin} />
      <main className="flex-1 bg-[#F8F7F7] p-8">{children}</main>
    </div>
  );
}
