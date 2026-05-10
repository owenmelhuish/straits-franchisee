import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileImage, History, Upload } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const t = await getT();

  const [{ count: templateCount }, { count: submissionCount }] =
    await Promise.all([
      supabase.from("templates").select("*", { count: "exact", head: true }),
      supabase.from("submissions").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <h1 className="mb-6 text-[16px] font-semibold text-[#1A1A1A]">{t.adminDashboard.title}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t.adminDashboard.templates}
          value={templateCount ?? 0}
          icon={<FileImage className="h-5 w-5 text-[#A5A5A5]" />}
          href="/admin/templates"
        />
        <StatCard
          label={t.adminDashboard.submissions}
          value={submissionCount ?? 0}
          icon={<History className="h-5 w-5 text-[#A5A5A5]" />}
          href="/admin/submissions"
        />
        <Link
          href="/template-creator"
          className="flex items-center gap-3 rounded-2xl bg-[#F4F4F4] p-6 transition-all hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
        >
          <Upload className="h-5 w-5 text-[#1A1A1A]" />
          <span className="text-[14px] font-medium text-[#1A1A1A]">{t.adminDashboard.createNew}</span>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl bg-[#F4F4F4] p-6 transition-all hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
    >
      {icon}
      <div>
        <p className="text-2xl font-semibold text-[#1A1A1A]">{value}</p>
        <p className="text-[13px] text-[#666666]">{label}</p>
      </div>
    </Link>
  );
}
