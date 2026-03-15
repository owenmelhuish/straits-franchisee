import { createClient } from "@/lib/supabase/server";
import { getTemplates } from "@/lib/supabase/db";
import { TemplateCard } from "@/components/dashboard/template-card";
import { SEED_TEMPLATES } from "@/lib/seed/templates";
import Link from "next/link";

export default async function DashboardPage() {
  let dbTemplates: Awaited<ReturnType<typeof getTemplates>> = [];

  try {
    const supabase = await createClient();
    dbTemplates = await getTemplates(supabase, "active");
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
          {dbTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <>
          {/* Fallback to seed templates when no DB templates exist */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
