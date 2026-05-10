import { createClient } from "@/lib/supabase/server";
import { getSubmissions } from "@/lib/supabase/db";
import { SubmissionRow } from "@/components/dashboard/submission-row";
import { getT } from "@/lib/i18n/server";

export default async function AdminSubmissionsPage() {
  const supabase = await createClient();
  const { data: submissions } = await getSubmissions(supabase);
  const t = await getT();

  return (
    <div className="rounded-3xl bg-white p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <h1 className="mb-6 text-[16px] font-semibold text-[#1A1A1A]">{t.adminSubmissions.title}</h1>

      {submissions.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <p className="text-[#666666]">{t.adminSubmissions.empty}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => (
            <SubmissionRow key={s.id} submission={s} />
          ))}
        </div>
      )}
    </div>
  );
}
