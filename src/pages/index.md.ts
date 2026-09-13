import type { APIRoute } from 'astro';
import { profile } from '../lib/content';
import { toIndexMd, outputUrls } from '../lib/outputs';

// SPEC §4: index.md — Markdown-Vollfassung für Agenten (Englisch, SPEC §14).
export const GET: APIRoute = ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL, site ?? new URL('http://localhost:4321'));
  return new Response(toIndexMd(profile, 'en', outputUrls(base)), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
};
