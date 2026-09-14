// Figur-Insel (SPEC §6.2–§6.4): wählt per Seed das gebackene Standbild (LCP-
// Fallback), lädt bei Eignung die WebGL-Figur nach und übersetzt die Pose bei
// Archetypwechsel. Setzt die Testschnittstelle data-webgl/clip/pose-time am
// <html> (SPEC §5, §8.3). three.js wird nur bei Bedarf dynamisch nachgeladen.
import {
  selectPose,
  translatePose,
  fallbackIndex,
  type Envelope,
  type NoiseLimits,
  type Pose,
} from '../lib/pose';
import type { FigureWebgl } from './figure-webgl';

interface FigureData {
  base: string;
  glb: string;
  envelopes: Record<string, Envelope>;
  noise: NoiseLimits;
  manifest: Record<string, number>;
}

export function initFigure(): void {
  const dataEl = document.querySelector('[data-figure-data]');
  const host = document.querySelector<HTMLElement>('[data-figure-host]');
  if (!dataEl || !host) return;
  let data: FigureData;
  try {
    data = JSON.parse(dataEl.textContent || '{}') as FigureData;
  } catch {
    return;
  }

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const seed = (): number => {
    const s = parseInt(root.dataset.seed || '0', 10);
    return Number.isFinite(s) ? s >>> 0 : 0;
  };
  const archetype = (): string => root.dataset.archetype || 'portrait';
  const envFor = (a: string): Envelope | undefined => data.envelopes[a];
  const pad = (n: number): string => String(n).padStart(2, '0');

  // SPEC §8.3: aktueller Clip/Zeitpunkt der Figur, live aus data-*.
  const reportPose = (clip: string, time: number): void => {
    root.dataset.clip = clip;
    root.dataset.poseTime = (Math.round(time * 1000) / 1000).toString();
  };

  const hasWebgl = (): boolean => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  };

  let currentArch = archetype();
  let webgl: FigureWebgl | null = null;

  async function showFallback(a: string): Promise<void> {
    const count = data.manifest[a] || 0;
    const env = envFor(a);
    if (count > 0) {
      const idx = fallbackIndex(seed(), count);
      try {
        const res = await fetch(`${data.base}figure/poses/${a}/${pad(idx)}.svg`);
        if (res.ok) {
          host.innerHTML = await res.text();
          const el = host.querySelector('svg');
          reportPose(
            el?.getAttribute('data-clip') || 'idle',
            parseFloat(el?.getAttribute('data-pose-time') || '0'),
          );
          return;
        }
      } catch {
        /* Datei/Netzwerk fehlt → Platzhalterform bleibt */
      }
    }
    if (env) {
      const p = selectPose(seed(), env, data.noise);
      reportPose(p.clip, p.time);
    }
  }

  async function tryWebgl(a: string): Promise<void> {
    const env = envFor(a);
    if (!env || reduceMotion || a === 'micro' || !hasWebgl()) {
      root.dataset.webgl = 'false';
      return;
    }
    try {
      const mod = await import('./figure-webgl');
      const pose = selectPose(seed(), env, data.noise);
      const color = getComputedStyle(root).getPropertyValue('--figure-line').trim();
      webgl = await mod.createFigureWebgl({ host, glb: data.glb, pose, color });
      root.dataset.webgl = 'true';
      reportPose(pose.clip, pose.time);
    } catch (e) {
      root.dataset.webgl = 'false';
      webgl = null;
      console.warn('[figure] WebGL nicht verfügbar, Fallback bleibt:', e);
    }
  }

  async function start(): Promise<void> {
    currentArch = archetype();
    await showFallback(currentArch);
    await tryWebgl(currentArch);
  }

  // SPEC §6.3: Archetypwechsel = Pose in die neue Hülle übersetzen, Seed bleibt.
  new MutationObserver(() => {
    const a = archetype();
    if (a === currentArch) return;
    const from = envFor(currentArch);
    const to = envFor(a);
    currentArch = a;
    if (webgl && from && to) {
      const pose = translatePose(seed(), from, to, data.noise);
      webgl.repose(pose);
      reportPose(pose.clip, pose.time);
    } else {
      void showFallback(a);
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-archetype'] });

  window.addEventListener('resize', () => webgl?.resize());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void start(), { once: true });
  } else {
    void start();
  }
}
