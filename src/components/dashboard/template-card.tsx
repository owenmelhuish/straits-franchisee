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
      className="group overflow-hidden rounded-3xl bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div className="aspect-video w-full overflow-hidden bg-[#F4F4F4]">
        {template.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#F4F4F4]">
            <span className="text-2xl font-semibold text-[#A5A5A5]">
              {template.name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h2 className="text-[14px] font-medium text-[#1A1A1A]">{template.name}</h2>
        <p className="mt-1 text-[13px] text-[#666666]">
          {template.description || "No description"}
        </p>
        <p className="mt-2 text-[11px] font-medium text-[#A5A5A5]">
          {formatCount} format{formatCount !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
