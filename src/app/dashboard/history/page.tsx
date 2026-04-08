import { createAdminClient } from "@/lib/supabase/admin";
import { getSubmissions } from "@/lib/supabase/db";
import { getDevUser } from "@/lib/dev-auth";
import { SubmissionRow } from "@/components/dashboard/submission-row";

export default async function HistoryPage() {
  const supabase = createAdminClient();
  const devUser = await getDevUser();

  // getSubmissions already joins templates; the meta_* columns come from the submissions table automatically
  const { data: submissions } = devUser
    ? await getSubmissions(supabase, { userId: devUser.id })
    : { data: [] };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-[16px] font-semibold text-[#1A1A1A]">Export History</h1>

      {submissions.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <p className="text-[#666666]">No exports yet.</p>
          <p className="mt-1 text-[13px] text-[#A5A5A5]">
            Your exported creatives will appear here.
          </p>
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
