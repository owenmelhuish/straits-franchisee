export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "fr";
}

export function htmlLang(locale: Locale): string {
  return locale === "fr" ? "fr-CA" : "en";
}
