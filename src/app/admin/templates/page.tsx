import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplates } from "@/lib/supabase/db";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminTemplatesPage() {
  const supabase = createAdminClient();
  const { data: templates } = await getTemplates(supabase);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <div className="mb-6">
        <h1 className="text-[16px] font-semibold text-[#1A1A1A]">Templates</h1>
      </div>

      <div className="space-y-3">
        {/* Create New card */}
        <Link
          href="/template-creator"
          className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-[#E0E0E0] bg-white px-5 py-6 text-[#666666] transition-all hover:border-[#1A1A1A] hover:text-[#1A1A1A] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
        >
          <Plus className="h-5 w-5" />
          <div>
            <p className="text-[14px] font-medium">Create New Template</p>
            <p className="text-[13px]">Upload a PSD file to get started</p>
          </div>
        </Link>

        {/* Existing templates */}
        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/admin/templates/${t.id}/edit`}
            className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[0px_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
          >
            <div>
              <p className="text-[14px] font-medium text-[#1A1A1A]">{t.name}</p>
              <p className="text-[13px] text-[#666666]">
                {t.slug} &middot; {(t.config as { formats?: unknown[] })?.formats?.length ?? 0} formats
              </p>
            </div>
            <StatusBadge status={t.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? colors.draft}`}
    >
      {status}
    </span>
  );
}
