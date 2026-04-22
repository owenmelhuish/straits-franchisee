import { TemplateConfig, TemplateFormat, AssetBank } from "@/types/template";

interface SerializeInput {
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  formats: TemplateFormat[];
  assetBanks: AssetBank[];
}

export function serializeToTemplateConfig(input: SerializeInput): TemplateConfig {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    slug: input.slug,
    description: input.description,
    thumbnail: input.thumbnail,
    formats: input.formats.map((f) => ({
      ...f,
      slides: f.slides.map((s) => ({
        ...s,
        layers: s.layers.map((l, i) => ({ ...l, zIndex: i })),
      })),
    })),
    assetBanks: input.assetBanks,
  };
}
