import { TemplateConfig, hydrateFormatSlides } from "./template";

export type UserRole = "admin" | "franchisee";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  // Meta Ads integration
  meta_access_token: string | null;
  meta_token_expires_at: string | null;
  meta_ad_account_id: string | null;
  meta_page_id: string | null;
}

export interface TemplateRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  status: "draft" | "active" | "archived";
  config: {
    formats: TemplateConfig["formats"];
    assetBanks: TemplateConfig["assetBanks"];
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionRow {
  id: string;
  template_id: string;
  user_id: string;
  format_name: string;
  file_url: string;
  // Carousel support: all slide PNGs in order (null for legacy single-image submissions).
  // file_url stays set to slide_file_urls[0] so dashboards/download UIs keep working.
  slide_file_urls: string[] | null;
  selections: Record<string, string>;
  campaign_start: string | null;
  campaign_end: string | null;
  budget: number | null;
  created_at: string;
  // Meta Ads integration
  meta_ad_id: string | null;
  meta_campaign_id: string | null;
  meta_status: string | null;
}

// Convert DB row → TemplateConfig (what the canvas engine expects).
// Legacy rows use `formats[].layers[]`; new rows use `formats[].slides[].layers[]`.
// We normalize to slides here so the rest of the app only sees the new shape.
export function templateRowToConfig(row: TemplateRow): TemplateConfig {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    thumbnail: row.thumbnail_url ?? "",
    formats: row.config.formats.map(hydrateFormatSlides),
    assetBanks: row.config.assetBanks,
  };
}

// Convert TemplateConfig → DB insert payload
export function templateConfigToRow(
  config: TemplateConfig,
  createdBy: string | null,
  status: TemplateRow["status"] = "draft"
): Omit<TemplateRow, "id" | "created_at" | "updated_at"> {
  return {
    name: config.name,
    slug: config.slug,
    description: config.description,
    thumbnail_url: config.thumbnail,
    status,
    config: {
      formats: config.formats,
      assetBanks: config.assetBanks,
    },
    created_by: createdBy,
  };
}
