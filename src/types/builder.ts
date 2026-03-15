export type LayerSelections = Record<string, string>;

export interface BuilderPageParams {
  params: Promise<{ templateId: string }>;
}
