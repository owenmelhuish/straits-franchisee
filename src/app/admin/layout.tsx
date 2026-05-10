import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, FileImage, History, BarChart3 } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { LocaleToggle } from "@/components/locale-toggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("dev-role")?.value;

  if (!role) redirect("/login");
  if (role !== "admin") redirect("/dashboard");

  const t = await getT();

  return (
    <div className="flex min-h-screen bg-[#F4F4F4] p-3 gap-3">
      <aside className="flex w-56 shrink-0 flex-col rounded-3xl bg-white px-4 py-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <h2 className="mb-6 text-[16px] font-semibold tracking-tight text-[#1A1A1A]">{t.adminLayout.title}</h2>
        <nav className="space-y-1">
          <SideLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
            {t.adminLayout.dashboard}
          </SideLink>
          <SideLink href="/admin/templates" icon={<FileImage className="h-4 w-4" />}>
            {t.adminLayout.templates}
          </SideLink>
          <SideLink href="/admin/submissions" icon={<History className="h-4 w-4" />}>
            {t.adminLayout.submissions}
          </SideLink>
          <SideLink href="/admin/analytics" icon={<BarChart3 className="h-4 w-4" />}>
            {t.adminLayout.analytics}
          </SideLink>
        </nav>
        <div className="mt-auto space-y-3">
          <LocaleToggle className="w-full justify-center" />
          <Link
            href="/dashboard"
            className="block text-[13px] text-[#666666] transition-colors hover:text-[#1A1A1A]"
          >
            &larr; {t.adminLayout.backToApp}
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4">{children}</main>
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
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-[#666666] transition-colors hover:bg-[#F4F4F4] hover:text-[#1A1A1A]"
    >
      {icon}
      {children}
    </Link>
  );
}
