export const CANVAS_DEFAULTS = {
  SELECTION: false,
  BACKGROUND_COLOR: "#ffffff",
} as const;

export const EXPORT_SETTINGS = {
  FORMAT: "png" as const,
  QUALITY: 1.0,
  MULTIPLIER: 1,
};

export const LAYOUT = {
  LEFT_PANEL_WIDTH: 280,
  RIGHT_PANEL_WIDTH: 320,
} as const;

export const STANDARD_FORMATS = [
  { name: "story", label: "Story (9:16)", width: 1080, height: 1920 },
  { name: "feed", label: "Feed (4:5)", width: 1080, height: 1350 },
  { name: "square", label: "Square (1:1)", width: 1080, height: 1080 },
  { name: "landscape", label: "Landscape (16:9)", width: 1920, height: 1080 },
] as const;
