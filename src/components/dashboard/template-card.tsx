import Link from "next/link";
import { TemplateRow } from "@/types/database";

interface TemplateCardProps {
  template: TemplateRow;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const formatCount = (template.config as { formats?: unknown[] })?.formats?.length ?? 0;

  return (
    <Link
      href={`/builder/${template.slug}`}
      className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-video w-full overflow-hidden bg-muted">
        {template.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-2xl font-bold text-primary/30">
              {template.name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h2 className="font-semibold">{template.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {template.description || "No description"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatCount} format{formatCount !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
