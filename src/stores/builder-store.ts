import { create } from "zustand";
import { TemplateConfig, TemplateFormat, TemplateLayer, AssetBank } from "@/types/template";
import { LayerSelections } from "@/types/builder";

interface LastSubmission {
  fileUrl: string;
  submissionId: string;
}

interface BuilderState {
  template: TemplateConfig | null;
  activeFormatIndex: number;
  layerSelections: LayerSelections;
  isCanvasReady: boolean;
  isExporting: boolean;
  lastSubmission: LastSubmission | null;

  // Actions
  setTemplate: (template: TemplateConfig) => void;
  setActiveFormat: (index: number) => void;
  setLayerSelection: (layerId: string, value: string) => void;
  resetSelections: () => void;
  setCanvasReady: (ready: boolean) => void;
  setExporting: (exporting: boolean) => void;
  setLastSubmission: (submission: LastSubmission | null) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  template: null,
  activeFormatIndex: 0,
  layerSelections: {},
  isCanvasReady: false,
  isExporting: false,
  lastSubmission: null,

  setTemplate: (template) => {
    // Initialize layerSelections from default layer values
    const selections: LayerSelections = {};
    for (const format of template.formats) {
      for (const layer of format.layers) {
        if (!layer.editable || !layer.linkedBank) continue;
        // Use the layer's default value
        const value = layer.type === "image" ? layer.src : layer.text;
        if (value) selections[layer.id] = value;
      }
    }
    set({ template, layerSelections: selections });
  },

  setActiveFormat: (index) => set({ activeFormatIndex: index, isCanvasReady: false }),

  setLayerSelection: (layerId, value) =>
    set((state) => ({
      layerSelections: { ...state.layerSelections, [layerId]: value },
    })),

  resetSelections: () =>
    set((state) => {
      if (!state.template) return {};
      const selections: LayerSelections = {};
      for (const format of state.template.formats) {
        for (const layer of format.layers) {
          if (!layer.editable || !layer.linkedBank) continue;
          const value = layer.type === "image" ? layer.src : layer.text;
          if (value) selections[layer.id] = value;
        }
      }
      return { layerSelections: selections };
    }),

  setCanvasReady: (ready) => set({ isCanvasReady: ready }),
  setExporting: (exporting) => set({ isExporting: exporting }),
  setLastSubmission: (submission) => set({ lastSubmission: submission }),
}));

// Selectors
export const selectActiveFormat = (state: BuilderState): TemplateFormat | null =>
  state.template?.formats[state.activeFormatIndex] ?? null;

export const selectEditableLayers = (state: BuilderState): TemplateLayer[] => {
  const format = selectActiveFormat(state);
  if (!format) return [];
  return format.layers.filter((l) => l.editable && l.linkedBank);
};

export const selectAssetBank = (bankName: string) => (state: BuilderState): AssetBank | undefined =>
  state.template?.assetBanks.find((b) => b.name === bankName);
