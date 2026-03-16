import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplates } from "@/lib/supabase/db";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminTemplatesPage() {
  const supabase = createAdminClient();
  const { data: templates } = await getTemplates(supabase);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
      </div>

      <div className="space-y-2">
        {/* Create New card */}
        <Link
          href="/admin/templates/new"
          className="flex items-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-white px-5 py-6 text-muted-foreground hover:border-primary hover:text-primary hover:shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <div>
            <p className="font-medium">Create New Template</p>
            <p className="text-sm">Upload a PSD file to get started</p>
          </div>
        </Link>

        {/* Existing templates */}
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
