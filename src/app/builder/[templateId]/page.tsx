import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplateBySlug, getTemplateById } from "@/lib/supabase/db";
import { templateRowToConfig } from "@/types/database";
import { FranchiseeBuilder } from "@/components/builder/franchisee-builder";
import { BuilderErrorBoundary } from "@/components/builder/builder-error-boundary";
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
    const supabase = createAdminClient();
    const row =
      (await getTemplateBySlug(supabase, templateId)) ??
      (await getTemplateById(supabase, templateId).catch(() => null));

    if (row) {
      return (
        <BuilderErrorBoundary>
          <FranchiseeBuilder template={templateRowToConfig(row)} />
        </BuilderErrorBoundary>
      );
    }
  } catch {
    // Supabase not configured — fall through to seed
  }

  // Fallback: seed data
  const template = getSeedBySlug(templateId) ?? getSeedById(templateId);
  if (!template) {
    notFound();
  }

  return (
    <BuilderErrorBoundary>
      <FranchiseeBuilder template={template} />
    </BuilderErrorBoundary>
  );
}
