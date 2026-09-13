import type { APIRoute } from 'astro';
import { toSitemapXml, outputUrls } from '../lib/outputs';

// SPEC §4: sitemap.xml — Startseite mit hreflang-Alternates (SPEC §14).
export const GET: APIRoute = ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL, site ?? new URL('http://localhost:4321'));
  return new Response(toSitemapXml(outputUrls(base)), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
