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
