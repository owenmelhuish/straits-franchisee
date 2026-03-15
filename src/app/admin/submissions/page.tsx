import { createClient } from "@/lib/supabase/server";
import { getSubmissions } from "@/lib/supabase/db";
import { SubmissionRow } from "@/components/dashboard/submission-row";

export default async function AdminSubmissionsPage() {
  const supabase = await createClient();
  const { data: submissions } = await getSubmissions(supabase);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">All Submissions</h1>

      {submissions.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-muted-foreground">No submissions yet.</p>
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
