/* Nihongo Ippo — small shared helpers.
   Every script attaches to one global namespace, NI, so the site runs from
   file:// as well as from a web server (no modules, no build step). */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});

  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Small deterministic PRNG (mulberry32) so tests can reproduce exercise order.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, random) {
    const r = random || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function sample(arr, n, random) {
    return shuffle(arr, random).slice(0, n);
  }

  function pick(arr, random) {
    const r = random || Math.random;
    return arr[Math.floor(r() * arr.length)];
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  // FNV-1a string hash, used for stable per-item choices.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  // Local calendar day, e.g. "2026-10-23" — streaks follow the learner's clock.
  function dayKey(ts) {
    const d = new Date(ts == null ? Date.now() : ts);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function formatInterval(ms) {
    if (ms < HOUR) return Math.max(1, Math.round(ms / 60000)) + " min";
    if (ms < DAY) return Math.round(ms / HOUR) + " h";
    const d = Math.round(ms / DAY);
    if (d < 30) return d + " d";
    if (d < 365) return Math.round(d / 30) + " mo";
    return (d / 365).toFixed(1).replace(/\.0$/, "") + " y";
  }

  function plural(n, one, many) {
    return n + " " + (n === 1 ? one : many || one + "s");
  }

  NI.util = {
    HOUR,
    DAY,
    escapeHtml,
    rng,
    shuffle,
    sample,
    pick,
    uniq,
    clamp,
    hash,
    dayKey,
    formatInterval,
    plural,
  };
})(typeof window !== "undefined" ? window : globalThis);
