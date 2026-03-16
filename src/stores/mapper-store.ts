import { create } from "zustand";
import { TemplateLayer, TemplateFormat, AssetBank, AssetBankItem, TemplateConfig } from "@/types/template";
import { STANDARD_FORMATS } from "@/lib/constants";
import { serializeToTemplateConfig } from "@/lib/canvas/serialize";

interface MapperState {
  // Template metadata
  name: string;
  slug: string;
  description: string;
  thumbnail: string;

  // Formats — each has independent layers
  formats: TemplateFormat[];
  activeFormatIndex: number;

  // Asset banks — shared across all formats
  assetBanks: AssetBank[];

  // Selection
  selectedLayerId: string | null;

  // Metadata actions
  setName: (name: string) => void;
  setSlug: (slug: string) => void;
  setDescription: (description: string) => void;
  setThumbnail: (thumbnail: string) => void;

  // Format actions
  setActiveFormatIndex: (index: number) => void;

  // Layer CRUD — operates on formats[activeFormatIndex].layers
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
  removeBankItem: (bankName: string, itemId: string) => void;

  // Helpers
  getActiveLayers: () => TemplateLayer[];
  getActiveFormat: () => TemplateFormat;
  getSelectedLayer: () => TemplateLayer | undefined;
  toTemplateConfig: () => TemplateConfig;
}

function createInitialFormats(): TemplateFormat[] {
  return STANDARD_FORMATS.map((f) => ({
    name: f.name,
    label: f.label,
    width: f.width,
    height: f.height,
    layers: [],
  }));
}

export const useMapperStore = create<MapperState>((set, get) => ({
  name: "",
  slug: "",
  description: "",
  thumbnail: "",
  formats: createInitialFormats(),
  activeFormatIndex: 0,
  assetBanks: [],
  selectedLayerId: null,

  setName: (name) => set({ name }),
  setSlug: (slug) => set({ slug }),
  setDescription: (description) => set({ description }),
  setThumbnail: (thumbnail) => set({ thumbnail }),

  setActiveFormatIndex: (index) => set({ activeFormatIndex: index, selectedLayerId: null }),

  addLayer: (layer) =>
    set((state) => {
      const formats = [...state.formats];
      const format = { ...formats[state.activeFormatIndex] };
      format.layers = [...format.layers, layer];
      formats[state.activeFormatIndex] = format;
      return { formats };
    }),

  updateLayer: (id, updates) =>
    set((state) => {
      const formats = [...state.formats];
      const format = { ...formats[state.activeFormatIndex] };
      format.layers = format.layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );
      formats[state.activeFormatIndex] = format;
      return { formats };
    }),

  removeLayer: (id) =>
    set((state) => {
      const formats = [...state.formats];
      const format = { ...formats[state.activeFormatIndex] };
      format.layers = format.layers.filter((l) => l.id !== id);
      formats[state.activeFormatIndex] = format;
      return {
        formats,
        selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
      };
    }),

  reorderLayers: (fromIndex, toIndex) =>
    set((state) => {
      const formats = [...state.formats];
      const format = { ...formats[state.activeFormatIndex] };
      const layers = [...format.layers];
      const [moved] = layers.splice(fromIndex, 1);
      layers.splice(toIndex, 0, moved);
      format.layers = layers.map((l, i) => ({ ...l, zIndex: i }));
      formats[state.activeFormatIndex] = format;
      return { formats };
    }),

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

  removeBankItem: (bankName, itemId) =>
    set((state) => ({
      assetBanks: state.assetBanks.map((b) =>
        b.name === bankName
          ? { ...b, items: b.items.filter((i) => i.id !== itemId) }
          : b
      ),
    })),

  getActiveLayers: () => {
    const state = get();
    return state.formats[state.activeFormatIndex]?.layers ?? [];
  },

  getActiveFormat: () => {
    const state = get();
    return state.formats[state.activeFormatIndex];
  },

  getSelectedLayer: () => {
    const state = get();
    if (!state.selectedLayerId) return undefined;
    return state.formats[state.activeFormatIndex]?.layers.find(
      (l) => l.id === state.selectedLayerId
    );
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
