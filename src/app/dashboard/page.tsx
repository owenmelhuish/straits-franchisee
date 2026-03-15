import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTemplates } from "@/lib/supabase/db";
import { TemplateRow } from "@/types/database";
import { TemplateCard } from "@/components/dashboard/template-card";
import { SEED_TEMPLATES } from "@/lib/seed/templates";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("dev-role")?.value;
  const isAdmin = role === "admin";

  let dbTemplates: TemplateRow[] = [];

  try {
    const supabase = await createClient();
    const result = await getTemplates(supabase, "active");
    dbTemplates = result.data;
  } catch {
    // Supabase not configured — fall through to seed
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold">Templates</h1>
      <p className="mb-8 text-muted-foreground">
        Select a template to start customizing your creative asset.
      </p>

      {dbTemplates.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isAdmin && <CreateNewCard />}
          {dbTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <>
          {/* Fallback to seed templates when no DB templates exist */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isAdmin && <CreateNewCard />}
            {SEED_TEMPLATES.map((template) => (
              <Link
                key={template.id}
                href={`/builder/${template.slug}`}
                className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h2 className="font-semibold">{template.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {template.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {template.formats.length} format
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

function CreateNewCard() {
  return (
    <Link
      href="/admin/templates/new"
      className="group flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-white shadow-sm transition-all hover:border-primary hover:shadow-md"
    >
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-semibold">Create New</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a PSD template
        </p>
      </div>
    </Link>
  );
}
