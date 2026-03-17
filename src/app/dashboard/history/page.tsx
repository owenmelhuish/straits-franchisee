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
      <h1 className="mb-6 text-2xl font-bold">Export History</h1>

      {submissions.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-muted-foreground">No exports yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
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
