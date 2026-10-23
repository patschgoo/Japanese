/* Shared UI pieces: Japanese text rendering, audio buttons, the word pop-up,
   toasts and an in-page confirm dialog. Pages are rendered as HTML strings;
   clicks are handled by delegation (see app.js). */
(function (root) {
  "use strict";
  const NI = root.NI;
  const esc = (s) => NI.util.escapeHtml(s);
  const doc = root.document;

  const ICON = {
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.6 7.6 0 0 1-1.8 1l-.3 2h-3.6l-.3-2a7.6 7.6 0 0 1-1.8-1l-1.9.7-1.8-3.1 1.6-1.2a7.4 7.4 0 0 1 0-2.1L3.8 9.3l1.8-3.1 1.9.7a7.6 7.6 0 0 1 1.8-1l.3-2h3.6l.3 2a7.6 7.6 0 0 1 1.8 1l1.9-.7 1.8 3.1-1.6 1.2a7.4 7.4 0 0 1 0 2.1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    train: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 10h14" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="13.5" r="1.1" fill="currentColor"/><circle cx="15" cy="13.5" r="1.1" fill="currentColor"/><path d="M8 20l2-3M16 20l-2-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    split: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M8 10.5h5M10.5 8v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    turtle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M19 13.5l2.2-1.2M7 15.5l-1 2.5M16 15.5l1 2.5M8.5 9.8l2 5.7M14.5 9.8l-2 5.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.5A6.5 6.5 0 0 1 17 7l1.5 1.5M19 14.5A6.5 6.5 0 0 1 7 17l-1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18.5 4v4.5H14M5.5 20v-4.5H10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function furiOpts() {
    const s = NI.store.settings;
    return { mode: s.furigana === "kana" ? "kana" : "furigana", kataHelp: !!s.kataHelp, gaps: !!s.gaps };
  }

  // Japanese text with furigana and tappable words.
  function jp(markup, opts) {
    return '<span class="jp" lang="ja">' + NI.furi.render(markup, Object.assign(furiOpts(), opts || {})) + "</span>";
  }

  // HTML that may contain [[markup]] for inline Japanese.
  function rich(html) {
    return String(html).replace(/\[\[(.+?)\]\]/g, (m, x) => jp(x, { gaps: false, tokens: false }));
  }

  // What the speech engine should read: kanji text for sentences (better
  // phrasing), the kana reading for single words (no reading ambiguity).
  const sentenceAudio = (markup) => NI.furi.base(markup).replace(/[「」]/g, "");
  const wordAudio = (word) => NI.furi.reading(word.head || word.j);

  function say(text, label, cls) {
    if (!NI.speech.supported) return "";
    return '<button class="say' + (cls ? " " + cls : "") + '" type="button" data-say="' + esc(text) + '" aria-label="Play audio' + (label ? ": " + esc(label) : "") + '" title="Play audio">' + ICON.speaker + "</button>";
  }

  // Opens the word-by-word breakdown of a sentence (handled in app.js).
  function breakdownBtn(markup, en) {
    return '<button class="bd-btn" type="button" data-bd="' + esc(markup) + '"' + (en ? ' data-en="' + esc(en) + '"' : "") + ' aria-label="Break this sentence down" title="Break it down: word by word">' + ICON.split + "</button>";
  }

  const em = (w) => (w && w.em ? '<span class="em" aria-hidden="true">' + w.em + "</span>" : "");

  function posTag(word) {
    return '<span class="pos">' + esc(NI.course.posLabel(word.pos)) + "</span>";
  }

  // Headword for a course word: ます form for verbs, with the dictionary form below.
  function wordHead(word, opts) {
    let h = jp(word.head, opts);
    if (word.dict) h += '<span class="dict">dictionary form ' + jp(word.dict, { tokens: false }) + "</span>";
    else if (word.pos === "adj-na") h += '<span class="dict">' + jp("〜な", { tokens: false }) + " before a noun</span>";
    return h;
  }

  function stationCode(n, cls) {
    const line = NI.course.lineOf(n);
    return '<span class="code ' + (cls || "") + ' line-' + (line ? line.color : "h") + '" aria-label="Unit ' + n + '">' + esc(NI.course.code(n)) + "</span>";
  }

  // ---------------------------------------------------------------------------
  // Word pop-up for tapped tokens
  let popAnchor = null;

  function describe(entry) {
    if (!entry) return null;
    const out = { title: entry.j, reading: entry.r, en: entry.en, form: null, unit: null, audio: entry.r };
    if (entry.kind === "form" || (entry.kind === "word" && entry.form === "dict")) {
      const w = NI.course.get(entry.id);
      if (w) {
        out.base = w.head;
        out.form = entry.form === "dict" && entry.kind === "word" ? NI.conj.LABELS.dict : NI.conj.LABELS[entry.form] || entry.form;
        out.unit = w.unit;
        out.pos = w.pos;
        out.em = w.em;
      }
    } else if (entry.kind === "word") {
      const w = NI.course.get(entry.id);
      if (w) {
        out.unit = w.unit;
        out.pos = w.pos;
        out.em = w.em;
      }
    } else if (entry.kind === "grammar") {
      out.kindLabel = entry.pos;
      out.unit = entry.unit;
    } else if (entry.kind === "name") {
      out.kindLabel = "name";
    }
    return out;
  }

  function showWord(key, anchor) {
    const pop = doc.getElementById("pop");
    const entry = NI.lex.get(key);
    const d = describe(entry);
    if (!d || !pop) return;
    let html = '<div class="pop-head">' + (d.em ? '<span class="em" aria-hidden="true">' + d.em + "</span>" : "") + jp(d.title, { tokens: false, gaps: false }) + say(d.audio, d.reading) + "</div>";
    if (d.reading !== NI.furi.base(d.title)) html += '<div class="pop-reading" lang="ja">' + esc(d.reading) + "</div>";
    html += '<div class="pop-en">' + esc(d.en) + "</div>";
    if (d.form) html += '<div class="pop-form">' + esc(d.form) + (d.base ? " of " + jp(d.base, { tokens: false, gaps: false }) : "") + "</div>";
    const meta = [];
    if (d.pos) meta.push(esc(NI.course.posLabel(d.pos)));
    if (d.kindLabel) meta.push(esc(d.kindLabel));
    if (d.unit) meta.push('<a href="#unit-' + d.unit + '">Unit ' + d.unit + "</a>");
    if (meta.length) html += '<div class="pop-meta">' + meta.join(" · ") + "</div>";
    if (entry.kind === "word" || entry.kind === "form") html += '<div class="pop-meta"><a href="https://jisho.org/search/' + encodeURIComponent(NI.furi.base(d.base || d.title)) + '" target="_blank" rel="noopener">More on Jisho ↗</a></div>';
    pop.innerHTML = html;
    pop.hidden = false;
    popAnchor = anchor;
    place(pop, anchor);
    if (NI.store.settings.autoplay) NI.speech.speak(d.audio);
  }

  function place(pop, anchor) {
    const r = anchor.getBoundingClientRect();
    const vw = doc.documentElement.clientWidth;
    pop.style.left = "0px";
    pop.style.top = "0px";
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let left = r.left + r.width / 2 - w / 2 + root.scrollX;
    left = Math.max(root.scrollX + 12, Math.min(left, root.scrollX + vw - w - 12));
    let top = r.bottom + root.scrollY + 8;
    if (r.bottom + h + 16 > root.innerHeight && r.top - h - 8 > 0) top = r.top + root.scrollY - h - 8;
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  function hidePop() {
    const pop = doc.getElementById("pop");
    if (pop && !pop.hidden) {
      pop.hidden = true;
      popAnchor = null;
    }
  }

  // ---------------------------------------------------------------------------
  let toastTimer = null;
  function toast(msg) {
    const t = doc.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // In-page confirmation (window.confirm is unavailable in some embeds).
  function confirmBox(opts) {
    return new Promise((resolve) => {
      const m = doc.getElementById("modal");
      m.innerHTML =
        '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<h2 id="modal-title">' + esc(opts.title) + "</h2>" +
        (opts.body ? "<p>" + esc(opts.body) + "</p>" : "") +
        '<div class="row end">' +
        '<button class="btn ghost" type="button" data-m="no">' + esc(opts.cancel || "Cancel") + "</button>" +
        '<button class="btn ' + (opts.danger ? "danger" : "primary") + '" type="button" data-m="yes">' + esc(opts.ok || "OK") + "</button>" +
        "</div></div>";
      m.hidden = false;
      const done = (v) => {
        m.hidden = true;
        m.innerHTML = "";
        doc.removeEventListener("keydown", onKey, true);
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          done(false);
        }
      };
      doc.addEventListener("keydown", onKey, true);
      m.onclick = (e) => {
        const b = e.target.closest("[data-m]");
        if (b) done(b.getAttribute("data-m") === "yes");
        else if (e.target === m) done(false);
      };
      const yes = m.querySelector('[data-m="yes"]');
      if (yes) yes.focus();
    });
  }

  function progressBar(frac, label) {
    const pct = Math.round(NI.util.clamp(frac, 0, 1) * 100);
    return '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"' + (label ? ' aria-label="' + esc(label) + '"' : "") + '><span style="width:' + pct + '%"></span></div>';
  }

  NI.ui = { ICON, esc, jp, rich, say, sentenceAudio, wordAudio, posTag, wordHead, stationCode, showWord, hidePop, toast, confirm: confirmBox, progressBar, furiOpts, breakdownBtn, em, get popAnchor() { return popAnchor; } };
})(typeof window !== "undefined" ? window : globalThis);
