import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LayoutDashboard, FileImage, History } from "lucide-react";

export default async function AdminLayout({
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r bg-white px-4 py-6">
        <h2 className="mb-6 text-lg font-bold tracking-tight">Admin</h2>
        <nav className="space-y-1">
          <SideLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
            Dashboard
          </SideLink>
          <SideLink href="/admin/templates" icon={<FileImage className="h-4 w-4" />}>
            Templates
          </SideLink>
          <SideLink href="/admin/submissions" icon={<History className="h-4 w-4" />}>
            Submissions
          </SideLink>
        </nav>
        <div className="mt-auto">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to app
          </Link>
        </div>
      </aside>
      <main className="flex-1 bg-[#F8F7F7] p-8">{children}</main>
    </div>
  );
}

function SideLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
