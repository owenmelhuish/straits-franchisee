export interface TemplateLayer {
  id: string;
  name: string;
  type: "image" | "text" | "rect";
  left: number;
  top: number;
  width: number;
  height: number;
  // Image-specific
  src?: string;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
  textAlign?: string;
  lineHeight?: number;
  // Rect-specific
  backgroundColor?: string;
  opacity?: number;
  // Bank linkage — the key bridge between layer and controls
  linkedBank?: string;
  editable?: boolean;
  zIndex: number;
}

export interface TemplateSlide {
  id: string;
  label?: string;
  layers: TemplateLayer[];
}

export interface TemplateFormat {
  name: string;
  label: string;
  width: number;
  height: number;
  slides: TemplateSlide[];
}

export interface AssetBankItem {
  id: string;
  label: string;
  value: string; // URL for images, text content for text banks
  // Per-item positioning — allows each variant to have its own size/position
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  // Per-item text styling (text banks only)
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
  textAlign?: string;
}

export interface AssetBank {
  id: string;
  name: string;
  type: "image" | "text";
  items: AssetBankItem[];
}

export interface TemplateConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  formats: TemplateFormat[];
  assetBanks: AssetBank[];
}

/**
 * Create a new empty slide with a stable id.
 */
export function createSlide(layers: TemplateLayer[] = [], label?: string): TemplateSlide {
  return {
    id: crypto.randomUUID(),
    label,
    layers,
  };
}

/**
 * Normalize a possibly-legacy format object (which may have `layers` instead of `slides`)
 * into the new shape. Safe to call on already-normalized formats.
 */
export function hydrateFormatSlides(fmt: unknown): TemplateFormat {
  const f = fmt as Partial<TemplateFormat> & { layers?: TemplateLayer[] };
  if (Array.isArray(f.slides) && f.slides.length > 0) {
    return {
      name: f.name!,
      label: f.label!,
      width: f.width!,
      height: f.height!,
      slides: f.slides,
    };
  }
  return {
    name: f.name!,
    label: f.label!,
    width: f.width!,
    height: f.height!,
    slides: [createSlide(f.layers ?? [])],
  };
}
