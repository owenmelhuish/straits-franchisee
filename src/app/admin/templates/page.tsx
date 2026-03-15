import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTemplates } from "@/lib/supabase/db";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminTemplatesPage() {
  const supabase = await createClient();
  const templates = await getTemplates(supabase);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Link href="/admin/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Upload PSD
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-muted-foreground">No templates yet.</p>
          <Link href="/admin/templates/new" className="mt-2 inline-block text-sm text-primary hover:underline">
            Upload your first PSD
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/admin/templates/${t.id}/edit`}
              className="flex items-center justify-between rounded-lg border bg-white px-5 py-4 hover:shadow-sm"
            >
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.slug} &middot; {(t.config as { formats?: unknown[] })?.formats?.length ?? 0} formats
                </p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
      )}
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
