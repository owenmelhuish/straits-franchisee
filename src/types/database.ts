import { TemplateConfig } from "./template";

export type UserRole = "admin" | "franchisee";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionRow {
  id: string;
  template_id: string;
  user_id: string;
  format_name: string;
  file_url: string;
  selections: Record<string, string>;
  created_at: string;
}

// Convert DB row → TemplateConfig (what the canvas engine expects)
export function templateRowToConfig(row: TemplateRow): TemplateConfig {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    thumbnail: row.thumbnail_url ?? "",
    formats: row.config.formats,
    assetBanks: row.config.assetBanks,
  };
}

// Convert TemplateConfig → DB insert payload
export function templateConfigToRow(
  config: TemplateConfig,
  createdBy: string,
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
