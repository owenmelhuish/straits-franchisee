import { create } from "zustand";
import {
  TemplateLayer,
  TemplateFormat,
  TemplateSlide,
  AssetBank,
  AssetBankItem,
  TemplateConfig,
  createSlide,
} from "@/types/template";
import { STANDARD_FORMATS } from "@/lib/constants";
import { serializeToTemplateConfig } from "@/lib/canvas/serialize";

interface MapperState {
  // Template metadata
  name: string;
  slug: string;
  description: string;
  thumbnail: string;

  // Formats — each has independent slides (each slide has independent layers)
  formats: TemplateFormat[];
  activeFormatIndex: number;
  activeSlideIndex: number;

  // Asset banks — shared across all formats
  assetBanks: AssetBank[];

  // Selection
  selectedLayerId: string | null;

  // Bank item preview — which bank item is currently shown on canvas for a given layer
  previewingBankItemId: string | null; // the bank item currently visible on canvas
  previewingLayerId: string | null; // which layer it belongs to

  // Metadata actions
  setName: (name: string) => void;
  setSlug: (slug: string) => void;
  setDescription: (description: string) => void;
  setThumbnail: (thumbnail: string) => void;

  // Format actions
  setActiveFormatIndex: (index: number) => void;

  // Slide actions
  setActiveSlideIndex: (index: number) => void;
  addSlide: (formatIndex?: number) => void;
  removeSlide: (formatIndex: number, slideIndex: number) => void;
  reorderSlides: (formatIndex: number, from: number, to: number) => void;
  duplicateSlide: (formatIndex: number, slideIndex: number) => void;
  renameSlide: (formatIndex: number, slideIndex: number, label: string) => void;

  // Layer CRUD — operates on formats[activeFormatIndex].slides[activeSlideIndex].layers
  addLayer: (layer: TemplateLayer) => void;
  updateLayer: (id: string, updates: Partial<TemplateLayer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Selection
  setSelectedLayerId: (id: string | null) => void;

  // Banks
  setAssetBanks: (banks: AssetBank[]) => void;
  addAssetBank: (bank: AssetBank) => void;
  addBankItem: (bankName: string, item: AssetBankItem) => void;
  updateBankItem: (bankName: string, itemId: string, updates: Partial<AssetBankItem>) => void;
  removeBankItem: (bankName: string, itemId: string) => void;

  // Bank preview
  setPreviewingBankItem: (layerId: string | null, itemId: string | null) => void;

  // Helpers
  getActiveLayers: () => TemplateLayer[];
  getActiveFormat: () => TemplateFormat;
  getActiveSlide: () => TemplateSlide | undefined;
  getSelectedLayer: () => TemplateLayer | undefined;
  toTemplateConfig: () => TemplateConfig;
}

function createInitialFormats(): TemplateFormat[] {
  return STANDARD_FORMATS.map((f) => ({
    name: f.name,
    label: f.label,
    width: f.width,
    height: f.height,
    slides: [createSlide()],
  }));
}

function updateFormatAt(
  formats: TemplateFormat[],
  index: number,
  mutate: (f: TemplateFormat) => TemplateFormat
): TemplateFormat[] {
  const next = [...formats];
  const f = next[index];
  if (!f) return next;
  next[index] = mutate(f);
  return next;
}

function updateSlideAt(
  formats: TemplateFormat[],
  formatIndex: number,
  slideIndex: number,
  mutate: (s: TemplateSlide) => TemplateSlide
): TemplateFormat[] {
  return updateFormatAt(formats, formatIndex, (f) => {
    const slides = [...f.slides];
    const s = slides[slideIndex];
    if (!s) return f;
    slides[slideIndex] = mutate(s);
    return { ...f, slides };
  });
}

export const useMapperStore = create<MapperState>((set, get) => ({
  name: "",
  slug: "",
  description: "",
  thumbnail: "",
  formats: createInitialFormats(),
  activeFormatIndex: 0,
  activeSlideIndex: 0,
  assetBanks: [],
  selectedLayerId: null,
  previewingBankItemId: null,
  previewingLayerId: null,

  setName: (name) => set({ name }),
  setSlug: (slug) => set({ slug }),
  setDescription: (description) => set({ description }),
  setThumbnail: (thumbnail) => set({ thumbnail }),

  setActiveFormatIndex: (index) =>
    set({ activeFormatIndex: index, activeSlideIndex: 0, selectedLayerId: null }),

  setActiveSlideIndex: (index) => set({ activeSlideIndex: index, selectedLayerId: null }),

  addSlide: (formatIndex) =>
    set((state) => {
      const fIdx = formatIndex ?? state.activeFormatIndex;
      const formats = updateFormatAt(state.formats, fIdx, (f) => ({
        ...f,
        slides: [...f.slides, createSlide()],
      }));
      const newSlideIndex = formats[fIdx]!.slides.length - 1;
      return {
        formats,
        activeFormatIndex: fIdx,
        activeSlideIndex: newSlideIndex,
        selectedLayerId: null,
      };
    }),

  removeSlide: (formatIndex, slideIndex) =>
    set((state) => {
      const format = state.formats[formatIndex];
      if (!format) return {};
      if (format.slides.length <= 1) return {}; // block removing last slide
      const formats = updateFormatAt(state.formats, formatIndex, (f) => ({
        ...f,
        slides: f.slides.filter((_, i) => i !== slideIndex),
      }));
      const nextSlides = formats[formatIndex]!.slides;
      // Clamp active slide index
      let activeSlideIndex = state.activeSlideIndex;
      if (formatIndex === state.activeFormatIndex) {
        if (state.activeSlideIndex >= nextSlides.length) {
          activeSlideIndex = nextSlides.length - 1;
        } else if (state.activeSlideIndex > slideIndex) {
          activeSlideIndex = state.activeSlideIndex - 1;
        }
      }
      return { formats, activeSlideIndex, selectedLayerId: null };
    }),

  reorderSlides: (formatIndex, from, to) =>
    set((state) => {
      const formats = updateFormatAt(state.formats, formatIndex, (f) => {
        const slides = [...f.slides];
        const [moved] = slides.splice(from, 1);
        slides.splice(to, 0, moved);
        return { ...f, slides };
      });
      // Keep active slide pointing at the same slide after reorder
      let activeSlideIndex = state.activeSlideIndex;
      if (formatIndex === state.activeFormatIndex) {
        if (state.activeSlideIndex === from) activeSlideIndex = to;
        else if (from < state.activeSlideIndex && to >= state.activeSlideIndex) {
          activeSlideIndex = state.activeSlideIndex - 1;
        } else if (from > state.activeSlideIndex && to <= state.activeSlideIndex) {
          activeSlideIndex = state.activeSlideIndex + 1;
        }
      }
      return { formats, activeSlideIndex };
    }),

  duplicateSlide: (formatIndex, slideIndex) =>
    set((state) => {
      const format = state.formats[formatIndex];
      const slide = format?.slides[slideIndex];
      if (!slide) return {};
      const cloned = createSlide(
        // Give layers fresh ids so selections/refs don't collide
        slide.layers.map((l) => ({ ...l, id: crypto.randomUUID() })),
        slide.label ? `${slide.label} (copy)` : undefined
      );
      const formats = updateFormatAt(state.formats, formatIndex, (f) => {
        const slides = [...f.slides];
        slides.splice(slideIndex + 1, 0, cloned);
        return { ...f, slides };
      });
      const activeSlideIndex =
        formatIndex === state.activeFormatIndex ? slideIndex + 1 : state.activeSlideIndex;
      return { formats, activeSlideIndex };
    }),

  renameSlide: (formatIndex, slideIndex, label) =>
    set((state) => ({
      formats: updateSlideAt(state.formats, formatIndex, slideIndex, (s) => ({ ...s, label })),
    })),

  addLayer: (layer) =>
    set((state) =>
      ({
        formats: updateSlideAt(
          state.formats,
          state.activeFormatIndex,
          state.activeSlideIndex,
          (s) => ({ ...s, layers: [...s.layers, layer] })
        ),
      })
    ),

  updateLayer: (id, updates) =>
    set((state) =>
      ({
        formats: updateSlideAt(
          state.formats,
          state.activeFormatIndex,
          state.activeSlideIndex,
          (s) => ({
            ...s,
            layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
          })
        ),
      })
    ),

  removeLayer: (id) =>
    set((state) => ({
      formats: updateSlideAt(
        state.formats,
        state.activeFormatIndex,
        state.activeSlideIndex,
        (s) => ({ ...s, layers: s.layers.filter((l) => l.id !== id) })
      ),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    })),

  reorderLayers: (fromIndex, toIndex) =>
    set((state) => ({
      formats: updateSlideAt(
        state.formats,
        state.activeFormatIndex,
        state.activeSlideIndex,
        (s) => {
          const layers = [...s.layers];
          const [moved] = layers.splice(fromIndex, 1);
          layers.splice(toIndex, 0, moved);
          return { ...s, layers: layers.map((l, i) => ({ ...l, zIndex: i })) };
        }
      ),
    })),

  setSelectedLayerId: (id) => set({ selectedLayerId: id }),

  setAssetBanks: (banks) => set({ assetBanks: banks }),

  addAssetBank: (bank) =>
    set((state) => ({ assetBanks: [...state.assetBanks, bank] })),

  addBankItem: (bankName, item) =>
    set((state) => ({
      assetBanks: state.assetBanks.map((b) =>
        b.name === bankName ? { ...b, items: [...b.items, item] } : b
      ),
    })),

  updateBankItem: (bankName, itemId, updates) =>
    set((state) => ({
      assetBanks: state.assetBanks.map((b) =>
        b.name === bankName
          ? { ...b, items: b.items.map((i) => i.id === itemId ? { ...i, ...updates } : i) }
          : b
      ),
    })),

  removeBankItem: (bankName, itemId) =>
    set((state) => ({
      assetBanks: state.assetBanks.map((b) =>
        b.name === bankName
          ? { ...b, items: b.items.filter((i) => i.id !== itemId) }
          : b
      ),
    })),

  setPreviewingBankItem: (layerId, itemId) =>
    set({ previewingLayerId: layerId, previewingBankItemId: itemId }),

  getActiveLayers: () => {
    const state = get();
    const slide = state.formats[state.activeFormatIndex]?.slides[state.activeSlideIndex];
    return slide?.layers ?? [];
  },

  getActiveFormat: () => {
    const state = get();
    return state.formats[state.activeFormatIndex];
  },

  getActiveSlide: () => {
    const state = get();
    return state.formats[state.activeFormatIndex]?.slides[state.activeSlideIndex];
  },

  getSelectedLayer: () => {
    const state = get();
    if (!state.selectedLayerId) return undefined;
    const slide = state.formats[state.activeFormatIndex]?.slides[state.activeSlideIndex];
    return slide?.layers.find((l) => l.id === state.selectedLayerId);
  },

  toTemplateConfig: () => {
    const state = get();
    return serializeToTemplateConfig({
      name: state.name,
      slug: state.slug,
      description: state.description,
      thumbnail: state.thumbnail,
      formats: state.formats,
      assetBanks: state.assetBanks,
    });
  },
}));
