/*
 * Archetyp-Erkennung + Nie-Scroll-Messlauf (SPEC §5).
 * Einzige Quelle der Archetyp-Logik; wird per ?raw in <head> inline eingebettet
 * und läuft vor dem ersten Paint (klassisches Script, keine Module-Syntax).
 * Getestet über die data-*-Attribute am <html> (SPEC §5, §10).
 */
(function () {
  'use strict';

  var root = document.documentElement;

  // SPEC §5: Archetyp aus Aspect Ratio r = w/h und kurzer Seite s = min(w, h).
  // +T2-Schwelle w >= 1400 statt 1100 (Abweichung, ADR-001).
  function classify(w, h) {
    var s = Math.min(w, h);
    var r = w / h;
    if (s < 260) return { archetype: 'micro', tier: 0 };
    if (r < 0.5) return { archetype: 'tall', tier: 1 };
    if (r < 1.2) return { archetype: 'portrait', tier: 1 };
    if (r < 2.2) return { archetype: 'split', tier: h >= 700 && w >= 1400 ? 2 : 1 };
    return { archetype: 'wide', tier: 2 };
  }

  // Seed: 32-bit. Aus ?pose, sonst zufällig (SPEC §6.3).
  function readSeed() {
    try {
      var p = new URLSearchParams(window.location.search).get('pose');
      if (p !== null && /^\d+$/.test(p)) return parseInt(p, 10) >>> 0;
    } catch (e) {
      /* ignore */
    }
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
  }
  var currentSeed = readSeed();

  var TYPO_SCALES = [1, 0.92, 0.85, 0.78];

  function applyClassification() {
    var c = classify(window.innerWidth, window.innerHeight);
    root.dataset.archetype = c.archetype;
    root.dataset.tier = String(c.tier);
    root.dataset.nominalTier = String(c.tier);
    root.dataset.seed = String(currentSeed);
    // data-webgl/clip/pose-time verwaltet die Figur-Insel (SPEC §6, src/client/figure).
    // Degrade-Zustand zurücksetzen.
    root.dataset.typoStep = '0';
    delete root.dataset.figureCrop;
    root.style.removeProperty('--typo-step');
    return c;
  }

  function overflowing() {
    return root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth + 1;
  }

  // SPEC §5: Reihenfolge Stufe (T2→T1→T0) → Typo −1 → Figur-Crop. Deterministisch.
  function degrade() {
    var tier = parseInt(root.dataset.nominalTier || '0', 10);
    while (overflowing() && tier > 0) {
      tier -= 1;
      root.dataset.tier = String(tier);
    }
    var step = 0;
    while (overflowing() && step < TYPO_SCALES.length - 1) {
      step += 1;
      root.dataset.typoStep = String(step);
      root.style.setProperty('--typo-step', String(TYPO_SCALES[step]));
    }
    if (overflowing()) root.dataset.figureCrop = 'true';
  }

  function update() {
    delete root.dataset.settled;
    applyClassification();
    degrade();
    root.dataset.settled = 'true';
  }

  // Frühe Klassifikation im <head>: Layout-Attribute vor dem Paint.
  applyClassification();

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }
  ready(update);

  var raf = 0;
  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  }
  window.addEventListener('resize', schedule);
  // SPEC §5: Orientierungswechsel = neuer Archetyp, Seed bleibt.
  window.addEventListener('orientationchange', schedule);
  if ('ResizeObserver' in window) {
    ready(function () {
      new ResizeObserver(schedule).observe(document.body);
    });
  }
})();
