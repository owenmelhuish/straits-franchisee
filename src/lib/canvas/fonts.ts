// Custom web fonts that need to be warm-loaded before Fabric renders text with them.
// Keep this list in sync with the font pickers in layer-properties-form.tsx and text-bank-editor.tsx.
export const CUSTOM_FONTS = [
  { family: "Bebas Neue", weight: "400" },
];

let preloadPromise: Promise<void> | null = null;

/**
 * Ensure all custom @font-face fonts are loaded in the browser before we render them
 * onto a canvas. Fabric uses the browser's 2D context, which silently substitutes a
 * fallback font if the requested family isn't yet loaded — and won't redraw when it
 * arrives. Call this once on editor mount; it deduplicates across calls.
 */
export function preloadCustomFonts(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (preloadPromise) return preloadPromise;
  preloadPromise = Promise.all(
    CUSTOM_FONTS.map((f) =>
      document.fonts.load(`${f.weight} 16px "${f.family}"`).catch(() => undefined)
    )
  ).then(() => undefined);
  return preloadPromise;
}
