// Reine Funktionen für Intent-Navigation und Freitext-Mapping (SPEC §2, P2, ADR-004).
// Keine Browser-APIs — testbar in Node.
import type { Lang } from './i18n';

export interface IntentKeywords {
  de: string[];
  en: string[];
}

export interface IntentDef {
  id: string;
  label: string | { de?: string; en?: string };
  clickable: boolean;
  fields: string[];
  keywords: IntentKeywords | string[];
}

/** Mapped Freitext auf eine Intent-ID per Stichwortregeln; null = kein Treffer. */
export function matchIntent(text: string, lang: Lang, intents: IntentDef[]): string | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;
  for (const intent of intents) {
    if (!intent.clickable) continue;
    const kws: string[] = Array.isArray(intent.keywords)
      ? intent.keywords
      : ((intent.keywords as IntentKeywords)[lang] ?? []);
    if (kws.some((kw) => lower.includes(kw.toLowerCase()))) return intent.id;
  }
  return null;
}
