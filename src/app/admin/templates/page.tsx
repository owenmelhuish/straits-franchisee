import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplates } from "@/lib/supabase/db";
import { Plus, Pencil } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export default async function AdminTemplatesPage() {
  const supabase = createAdminClient();
  const { data: templates } = await getTemplates(supabase);
  const t = await getT();

  return (
    <div className="rounded-3xl bg-white p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <div className="mb-6">
        <h1 className="text-[16px] font-semibold text-[#1A1A1A]">{t.adminTemplates.title}</h1>
      </div>

      <div className="space-y-3">
        {/* Create New card */}
        <Link
          href="/template-creator"
          className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-[#E0E0E0] bg-white px-5 py-6 text-[#666666] transition-all hover:border-[#1A1A1A] hover:text-[#1A1A1A] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
        >
          <Plus className="h-5 w-5" />
          <div>
            <p className="text-[14px] font-medium">{t.adminTemplates.createNewTitle}</p>
            <p className="text-[13px]">{t.adminTemplates.createNewDesc}</p>
          </div>
        </Link>

        {/* Existing templates */}
        {templates.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/template-creator?id=${tpl.id}`}
            className="group flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[0px_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
          >
            <div>
              <p className="text-[14px] font-medium text-[#1A1A1A]">{tpl.name}</p>
              <p className="text-[13px] text-[#666666]">
                {tpl.slug} &middot; {(tpl.config as { formats?: unknown[] })?.formats?.length ?? 0} {t.adminTemplates.formatsSuffix}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E0E0E0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#1A1A1A] opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-3.5 w-3.5" /> {t.adminTemplates.edit}
              </span>
              <StatusBadge status={tpl.status} t={t} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: Dictionary }) {
  const colors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
  };

  const labels: Record<string, string> = {
    draft: t.adminTemplates.statusDraft,
    active: t.adminTemplates.statusActive,
    archived: t.adminTemplates.statusArchived,
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? colors.draft}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
