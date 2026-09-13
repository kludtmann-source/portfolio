// Serialisierer für die Agenten-Ausgaben (SPEC §4, P1). Reine Funktionen über der
// Single Source (SPEC §3); URLs werden von den Endpoints hereingereicht, damit dieses
// Modul frei von import.meta.env bleibt. index.md/llms.txt sind Englisch (SPEC §14);
// leere Felder fallen via t() auf DE zurück (SPEC §3, keine erfundenen Übersetzungen).
import { type Profile } from './content';
import { t, type Lang } from './i18n';

export interface OutputUrls {
  home: string;
  indexMd: string;
  profileJson: string;
  sitemap: string;
}

// Leitet die absoluten Ausgabe-URLs aus der Site-Basis (Origin inkl. base-Pfad) ab.
export function outputUrls(base: URL): OutputUrls {
  return {
    home: base.href,
    indexMd: new URL('index.md', base).href,
    profileJson: new URL('profile.json', base).href,
    sitemap: new URL('sitemap.xml', base).href,
  };
}

function linkEntries(profile: Profile): Array<[string, string]> {
  return Object.entries(profile.person.links.all);
}

// JSON-LD Person (SPEC §4). Ohne E-Mail: obfuskiert im HTML, Klartext nur in llms.txt/index.md (SPEC §3).
export function toJsonLd(profile: Profile, lang: Lang, url: string): Record<string, unknown> {
  const person = profile.person;
  const tagline = t(person.tagline, lang);
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: t(person.role, lang),
    url,
    sameAs: person.sameAs,
    address: { '@type': 'PostalAddress', addressLocality: person.location },
  };
  if (tagline) jsonLd.description = tagline;
  return jsonLd;
}

// profile.json (SPEC §4): normalisierte Quelle inkl. generiertem sameAs.
export function toProfileJson(profile: Profile): string {
  return JSON.stringify(profile, null, 2) + '\n';
}

// llms.txt (SPEC §4): Kurzfassung T0+T1 mit Link auf index.md, ≤ 4 KB.
export function toLlmsTxt(profile: Profile, lang: Lang, urls: OutputUrls): string {
  const p = profile.person;
  const role = t(p.role, lang);
  const tagline = t(p.tagline, lang);
  const lines: string[] = [];
  lines.push(`# ${p.name} — ${role}`, '');
  lines.push(`> ${tagline || role}`, '');
  lines.push(`Location: ${p.location}`, '');
  lines.push('## Links');
  for (const [key, href] of linkEntries(profile)) lines.push(`- ${key}: ${href}`);
  lines.push(`- Email: ${profile.contact.email}`, '');
  lines.push('## Skills');
  for (const s of profile.skills) lines.push(`- ${t(s.label, lang)}`);
  lines.push('', '## Projects');
  for (const pr of profile.projects) {
    const one = t(pr.oneliner, lang);
    lines.push(one ? `- ${pr.title} — ${one}` : `- ${pr.title}`);
  }
  lines.push('', '## Machine-readable');
  lines.push(`- Full profile (Markdown): ${urls.indexMd}`);
  lines.push(`- Profile data (JSON): ${urls.profileJson}`);
  lines.push(`- Website: ${urls.home}`, '');
  return lines.join('\n');
}

// index.md (SPEC §4): Markdown-Vollfassung, alle T0/T1(/T2)-Felder.
export function toIndexMd(profile: Profile, lang: Lang, urls: OutputUrls): string {
  const p = profile.person;
  const role = t(p.role, lang);
  const tagline = t(p.tagline, lang);
  const lines: string[] = [];
  lines.push(`# ${p.name}`, '', `**${role}**`, '');
  if (tagline) lines.push(tagline, '');
  lines.push(`Location: ${p.location}`, '');
  lines.push('## Links');
  for (const [key, href] of linkEntries(profile)) lines.push(`- [${key}](${href})`);
  lines.push(`- Email: ${profile.contact.email}`, '');
  lines.push('## Skills');
  for (const s of profile.skills) lines.push(`- ${t(s.label, lang)}`);
  lines.push('', '## Projects');
  for (const pr of profile.projects) {
    lines.push(`### ${pr.title}`);
    const one = t(pr.oneliner, lang);
    const desc = t(pr.description, lang);
    if (one) lines.push('', one);
    if (desc) lines.push('', desc);
    lines.push('');
  }
  lines.push('## Contact', `- Email: ${profile.contact.email}`, '');
  lines.push('---', '');
  lines.push(`Machine-readable profile: ${urls.profileJson} · Website: ${urls.home}`, '');
  return lines.join('\n');
}

// robots.txt (SPEC §4): KI-Crawler ausdrücklich erlauben + Sitemap-Verweis.
const AI_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

export function toRobotsTxt(sitemapUrl: string): string {
  const blocks: string[] = [];
  for (const bot of AI_CRAWLERS) blocks.push(`User-agent: ${bot}\nAllow: /`);
  blocks.push('User-agent: *\nAllow: /');
  return blocks.join('\n\n') + `\n\nSitemap: ${sitemapUrl}\n`;
}

// sitemap.xml (SPEC §4). Bilingual (SPEC §14): hreflang de/en/x-default auf die Startseite.
export function toSitemapXml(urls: OutputUrls): string {
  const en = `${urls.home}?lang=en`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    '  <url>',
    `    <loc>${urls.home}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="de" href="${urls.home}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${urls.home}"/>`,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}
