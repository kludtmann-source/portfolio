import type { APIRoute } from 'astro';
import { toRobotsTxt, outputUrls } from '../lib/outputs';

// SPEC §4: robots.txt — KI-Crawler erlauben, Sitemap verweisen.
export const GET: APIRoute = ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL, site ?? new URL('http://localhost:4321'));
  return new Response(toRobotsTxt(outputUrls(base).sitemap), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
