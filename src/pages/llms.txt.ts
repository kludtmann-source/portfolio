import type { APIRoute } from 'astro';
import { profile } from '../lib/content';
import { toLlmsTxt, outputUrls } from '../lib/outputs';

// SPEC §4: llms.txt — Kurzfassung für Agenten (Englisch, SPEC §14).
export const GET: APIRoute = ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL, site ?? new URL('http://localhost:4321'));
  return new Response(toLlmsTxt(profile, 'en', outputUrls(base)), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
