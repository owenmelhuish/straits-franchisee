import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplates } from "@/lib/supabase/db";
import { TemplateRow } from "@/types/database";
import { TemplateCard } from "@/components/dashboard/template-card";
import { SEED_TEMPLATES } from "@/lib/seed/templates";
import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("dev-role")?.value;
  const isAdmin = role === "admin";
  const t = await getT();

  let dbTemplates: TemplateRow[] = [];

  try {
    const supabase = createAdminClient();
    const result = await getTemplates(supabase, "active");
    dbTemplates = result.data;
  } catch {
    // Supabase not configured — fall through to seed
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-[16px] font-semibold text-[#1A1A1A]">{t.dashboard.title}</h1>
      <p className="mb-8 text-[13px] text-[#666666]">{t.dashboard.subtitle}</p>

      {dbTemplates.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isAdmin && <CreateNewCard t={t} />}
          {dbTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} isAdmin={isAdmin} />
          ))}
        </div>
      ) : (
        <>
          {/* Fallback to seed templates when no DB templates exist */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isAdmin && <CreateNewCard t={t} />}
            {SEED_TEMPLATES.map((template) => (
              <Link
                key={template.id}
                href={`/builder/${template.slug}`}
                className="group overflow-hidden rounded-3xl bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
              >
                <div className="aspect-video w-full overflow-hidden bg-[#F4F4F4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h2 className="text-[14px] font-medium text-[#1A1A1A]">{template.name}</h2>
                  <p className="mt-1 text-[13px] text-[#666666]">
                    {template.description}
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-[#A5A5A5]">
                    {template.formats.length} {t.dashboard.formatLabel}
                    {template.formats.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreateNewCard({ t }: { t: Dictionary }) {
  return (
    <Link
      href="/template-creator"
      className="group flex flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-[#E0E0E0] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all hover:border-[#1A1A1A] hover:shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F4F4] transition-colors group-hover:bg-[#E0E0E0]">
          <Plus className="h-5 w-5 text-[#1A1A1A]" />
        </div>
        <h2 className="text-[14px] font-medium text-[#1A1A1A]">{t.dashboard.createNew}</h2>
        <p className="mt-1 text-[13px] text-[#666666]">{t.dashboard.createNewDesc}</p>
      </div>
    </Link>
  );
}
