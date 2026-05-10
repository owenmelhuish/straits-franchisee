import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, isLocale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return locale === "fr" ? fr : en;
}

export async function getT(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}
