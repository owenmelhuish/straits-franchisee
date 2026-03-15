import Link from "next/link";
import { SEED_TEMPLATES } from "@/lib/seed/templates";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#F8F7F7] px-6 py-16">
      <div className="w-full max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Creative Builder
        </h1>
        <p className="mb-10 text-muted-foreground">
          Select a template to start customizing your creative asset.
        </p>

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
                  {template.formats.length} format{template.formats.length !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
