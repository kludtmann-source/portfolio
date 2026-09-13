import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

// SPEC §4/§8: build.json — Commit-SHA, Zeitstempel, Spec-Version, Provenienz-Verweis.

// Commit-SHA: CI-Env zuerst, dann git, sonst 'dev'.
function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

// Spec-Version aus dem SPEC.md-Kopf ("Version X.Y").
function specVersion(): string {
  try {
    const spec = fs.readFileSync(path.resolve(process.cwd(), 'SPEC.md'), 'utf8');
    return spec.match(/Version\s+([\d.]+)/)?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export const GET: APIRoute = () => {
  const body = {
    commit: commitSha(),
    builtAt: new Date().toISOString(),
    specVersion: specVersion(),
    provenance: 'assets/PROVENANCE.md',
  };
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
