import { create } from "zustand";
import { TemplateConfig, TemplateFormat, TemplateLayer, TemplateSlide, AssetBank } from "@/types/template";
import { LayerSelections } from "@/types/builder";

interface LastSubmission {
  fileUrl: string;
  submissionId: string;
  // Present when the submission was a carousel
  slideFileUrls?: string[];
}

interface BuilderState {
  template: TemplateConfig | null;
  activeFormatIndex: number;
  activeSlideIndex: number;
  layerSelections: LayerSelections;
  // Per-slide readiness. Derived boolean `allSlidesReady` replaces the old single `isCanvasReady`.
  canvasReady: Record<string, boolean>;
  isExporting: boolean;
  lastSubmission: LastSubmission | null;

  // Actions
  setTemplate: (template: TemplateConfig) => void;
  setActiveFormat: (index: number) => void;
  setActiveSlideIndex: (index: number) => void;
  setLayerSelection: (layerId: string, value: string) => void;
  resetSelections: () => void;
  markSlideReady: (slideId: string, ready: boolean) => void;
  resetCanvasReady: () => void;
  setExporting: (exporting: boolean) => void;
  setLastSubmission: (submission: LastSubmission | null) => void;
}

function initialSelectionsFor(template: TemplateConfig): LayerSelections {
  const selections: LayerSelections = {};
  for (const format of template.formats) {
    for (const slide of format.slides) {
      for (const layer of slide.layers) {
        if (!layer.editable || !layer.linkedBank) continue;
        const value = layer.type === "image" ? layer.src : layer.text;
        if (value) selections[layer.id] = value;
      }
    }
  }
  return selections;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  template: null,
  activeFormatIndex: 0,
  activeSlideIndex: 0,
  layerSelections: {},
  canvasReady: {},
  isExporting: false,
  lastSubmission: null,

  setTemplate: (template) => {
    set({
      template,
      layerSelections: initialSelectionsFor(template),
      activeSlideIndex: 0,
      canvasReady: {},
    });
  },

  setActiveFormat: (index) =>
    set({ activeFormatIndex: index, activeSlideIndex: 0, canvasReady: {} }),

  setActiveSlideIndex: (index) => set({ activeSlideIndex: index }),

  setLayerSelection: (layerId, value) =>
    set((state) => ({
      layerSelections: { ...state.layerSelections, [layerId]: value },
    })),

  resetSelections: () =>
    set((state) => {
      if (!state.template) return {};
      return { layerSelections: initialSelectionsFor(state.template) };
    }),

  markSlideReady: (slideId, ready) =>
    set((state) => ({ canvasReady: { ...state.canvasReady, [slideId]: ready } })),

  resetCanvasReady: () => set({ canvasReady: {} }),

  setExporting: (exporting) => set({ isExporting: exporting }),
  setLastSubmission: (submission) => set({ lastSubmission: submission }),
}));

// Selectors
export const selectActiveFormat = (state: BuilderState): TemplateFormat | null =>
  state.template?.formats[state.activeFormatIndex] ?? null;

export const selectActiveSlide = (state: BuilderState): TemplateSlide | null => {
  const format = selectActiveFormat(state);
  if (!format) return null;
  return format.slides[state.activeSlideIndex] ?? null;
};

export const selectAllSlides = (state: BuilderState): TemplateSlide[] =>
  selectActiveFormat(state)?.slides ?? [];

export const selectEditableLayers = (state: BuilderState): TemplateLayer[] => {
  const slide = selectActiveSlide(state);
  if (!slide) return [];
  return slide.layers.filter((l) => l.editable && l.linkedBank);
};

export const selectAllSlidesReady = (state: BuilderState): boolean => {
  const slides = selectAllSlides(state);
  if (slides.length === 0) return false;
  return slides.every((s) => state.canvasReady[s.id]);
};

export const selectAssetBank = (bankName: string) => (state: BuilderState): AssetBank | undefined =>
  state.template?.assetBanks.find((b) => b.name === bankName);
