// SPEC §14: bilingual DE + EN, Default DE. Vollständige Sprachumschaltung → P2.
import type { Localized } from './content';

export type Lang = 'de' | 'en';

export function resolveLang(input: string | null): Lang {
  return input === 'en' ? 'en' : 'de';
}

// Löst einen lokalisierten Wert auf; fällt auf DE zurück (keine erfundenen Übersetzungen).
export function t(value: Localized | undefined, lang: Lang): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.de || value.en || '';
}
