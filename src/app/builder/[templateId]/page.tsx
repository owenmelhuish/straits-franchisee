import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTemplateBySlug, getTemplateById } from "@/lib/supabase/db";
import { templateRowToConfig } from "@/types/database";
import { BuilderView } from "@/components/builder/builder-view";
import {
  getTemplateBySlug as getSeedBySlug,
  getTemplateById as getSeedById,
} from "@/lib/seed/templates";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function BuilderPage({ params }: PageProps) {
  const { templateId } = await params;

  // Try Supabase first, fall back to seed data
  try {
    const supabase = await createClient();
    const row =
      (await getTemplateBySlug(supabase, templateId)) ??
      (await getTemplateById(supabase, templateId).catch(() => null));

    if (row) {
      return <BuilderView template={templateRowToConfig(row)} />;
    }
  } catch {
    // Supabase not configured — fall through to seed
  }

  // Fallback: seed data (keeps Phase 1 working without Supabase)
  const template = getSeedBySlug(templateId) ?? getSeedById(templateId);
  if (!template) {
    notFound();
  }

  return <BuilderView template={template} />;
}
