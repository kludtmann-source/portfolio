import type { APIRoute } from 'astro';
import { profile } from '../lib/content';
import { toProfileJson } from '../lib/outputs';

// SPEC §4: profile.json — normalisierte Quelle nach Validierung.
export const GET: APIRoute = () =>
  new Response(toProfileJson(profile), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
