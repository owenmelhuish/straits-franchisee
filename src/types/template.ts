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

export interface TemplateFormat {
  name: string;
  label: string;
  width: number;
  height: number;
  layers: TemplateLayer[];
}

export interface AssetBankItem {
  id: string;
  label: string;
  value: string; // URL for images, text content for text banks
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
