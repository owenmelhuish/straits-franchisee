import { SupabaseClient } from "@supabase/supabase-js";
import { TemplateRow, SubmissionRow } from "@/types/database";

// --- Templates ---

export async function getTemplates(
  supabase: SupabaseClient,
  status?: TemplateRow["status"],
  pagination?: { limit?: number; offset?: number }
) {
  let query = supabase
    .from("templates")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const limit = pagination?.limit ?? 50;
  const offset = pagination?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as TemplateRow[], count: count ?? 0 };
}

export async function getTemplateById(
  supabase: SupabaseClient,
  id: string
) {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as TemplateRow;
}

export async function getTemplateBySlug(
  supabase: SupabaseClient,
  slug: string
) {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as TemplateRow;
}

export async function createTemplate(
  supabase: SupabaseClient,
  template: Omit<TemplateRow, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("templates")
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data as TemplateRow;
}

export async function updateTemplate(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<TemplateRow, "name" | "slug" | "description" | "thumbnail_url" | "status" | "config">>
) {
  const { data, error } = await supabase
    .from("templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TemplateRow;
}

export async function deleteTemplate(
  supabase: SupabaseClient,
  id: string
) {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw error;
}

// --- Submissions ---

export async function getSubmissions(
  supabase: SupabaseClient,
  filters?: {
    userId?: string;
    templateId?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from("submissions")
    .select("*, templates(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters?.templateId) {
    query = query.eq("template_id", filters.templateId);
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    data: data as (SubmissionRow & { templates: { name: string; slug: string } | null })[],
    count: count ?? 0,
  };
}

export async function getSubmissionById(
  supabase: SupabaseClient,
  id: string
) {
  const { data, error } = await supabase
    .from("submissions")
    .select("*, templates(name, slug)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as SubmissionRow & { templates: { name: string; slug: string } | null };
}

export async function createSubmission(
  supabase: SupabaseClient,
  submission: Omit<SubmissionRow, "id" | "created_at">
) {
  const { data, error } = await supabase
    .from("submissions")
    .insert(submission)
    .select()
    .single();

  if (error) throw error;
  return data as SubmissionRow;
}
