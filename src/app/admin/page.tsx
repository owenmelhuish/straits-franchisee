import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileImage, History, Upload } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: templateCount }, { count: submissionCount }] =
    await Promise.all([
      supabase.from("templates").select("*", { count: "exact", head: true }),
      supabase.from("submissions").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Templates"
          value={templateCount ?? 0}
          icon={<FileImage className="h-5 w-5 text-muted-foreground" />}
          href="/admin/templates"
        />
        <StatCard
          label="Submissions"
          value={submissionCount ?? 0}
          icon={<History className="h-5 w-5 text-muted-foreground" />}
          href="/admin/submissions"
        />
        <Link
          href="/admin/templates/new"
          className="flex items-center gap-3 rounded-xl border bg-white p-6 shadow-sm hover:shadow-md"
        >
          <Upload className="h-5 w-5 text-primary" />
          <span className="font-medium">Create New</span>
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
      className="flex items-center gap-4 rounded-xl border bg-white p-6 shadow-sm hover:shadow-md"
    >
      {icon}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}
