/* Look up any Japanese on screen. Tap a word to hear it and see what it
   means, or select some text for a bar with Listen, Slowly, Meaning and
   Translate. Tokenised text (.tok) has its own pop-up; this covers the rest:
   headings, inline examples, plain text in English paragraphs, and Japanese
   drawn without tokens.
   During an unanswered question the meaning stays hidden behind a button
   (in lessons it counts as a hint), and in games, exams and kana drills
   look-ups are off, so they never give answers away. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const doc = root.document;

  const JP = /[぀-ヿ㐀-鿿々〆ヵヶ]/;
  // Taps on these do their own thing.
  const INTERACTIVE = "a, button, input, textarea, select, label, canvas, summary, [contenteditable], [data-say], [data-bd], .opt, .tile, .m-cell, .mem-card, #pop, #seltool";
  // Where a look-up would give answers away.
  const CLOSED = ".game-area, .drill-box, .kp-box, .write-box, .kc-pad";
  // Text that isn't part of the Japanese being read.
  const NOT_TEXT = "rt, rp, .sr, .say, .bd-btn, .s-tools, .dlg-tools, .who-en";

  /* null: look up freely. "quiz": a lesson question not yet answered (the
     meaning is a hint). "review": a review card not yet turned over.
     "closed": no look-ups. */
  function mode(el) {
    if (!el || el.closest(CLOSED) || /^#exam-/.test(root.location.hash)) return "closed";
    const rv = el.closest(".rv");
    if (rv) return rv.querySelector(".rv-reveal .rv-back") ? null : "review";
    const card = el.closest(".sess-card");
    if (card) {
      const foot = card.parentElement && card.parentElement.querySelector(".sess-foot");
      const ex = card.querySelector(".ex");
      if (foot && foot.hidden && ex && !/\bex-(intro|dialogue)\b/.test(ex.className)) return "quiz";
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // The word under a tap

  function caretAt(x, y) {
    if (doc.caretPositionFromPoint) {
      const p = doc.caretPositionFromPoint(x, y);
      return p ? { node: p.offsetNode, offset: p.offset } : null;
    }
    if (doc.caretRangeFromPoint) {
      const r = doc.caretRangeFromPoint(x, y);
      return r ? { node: r.startContainer, offset: r.startOffset } : null;
    }
    return null;
  }

  // Index of the character of a text node actually under (x, y), or -1.
  function charUnder(node, offset, x, y) {
    const r = doc.createRange();
    for (const i of [offset, offset - 1]) {
      if (i < 0 || i >= node.length) continue;
      r.setStart(node, i);
      r.setEnd(node, i + 1);
      for (const b of r.getClientRects()) if (x >= b.left - 2 && x <= b.right + 2 && y >= b.top - 3 && y <= b.bottom + 3) return { i, rect: b };
    }
    return null;
  }

  // The readable text of a block, and where each of its text nodes starts.
  function textOf(block) {
    let text = "";
    const starts = new Map();
    const walk = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && n.parentElement.closest(NOT_TEXT) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      starts.set(n, text.length);
      text += n.data;
    }
    return { text, starts };
  }

  const BLOCK = ".jp, p, li, dd, dt, td, th, h1, h2, h3, h4, figcaption, .prompt-word, .word-big, div";

  /* Handles a click on text that isn't a token: finds the word under it and
     shows it. Returns true when it did. */
  function tap(e) {
    const t = e.target;
    if (!t || !t.closest || t.closest(INTERACTIVE) || t.closest(NOT_TEXT)) return false;
    const sel = doc.getSelection && doc.getSelection();
    if (sel && !sel.isCollapsed) return false; // finishing a selection, not a tap
    const m = mode(t);
    if (m === "closed") return false;
    const c = caretAt(e.clientX, e.clientY);
    if (!c || !c.node || c.node.nodeType !== 3 || (c.node.parentElement && c.node.parentElement.closest(NOT_TEXT))) return false;
    const hit = charUnder(c.node, c.offset, e.clientX, e.clientY);
    if (!hit || !JP.test(c.node.data[hit.i])) return false;
    const block = c.node.parentElement.closest(BLOCK) || c.node.parentElement;
    const { text, starts } = textOf(block);
    if (!starts.has(c.node)) return false;
    const at = Array.from(text.slice(0, starts.get(c.node) + hit.i)).length; // in code points
    const toks = NI.lex.readPlain(text);
    let k = toks.findIndex((x) => at >= x.start && at < x.end);
    if (k < 0) return false;
    const anchor = { getBoundingClientRect: () => hit.rect };
    let tk = toks[k];
    if (tk.entry) {
      ui.showWord(tk.entry.key, anchor, m);
      return true;
    }
    // Unknown characters: take the whole run of them as one word.
    let a = k;
    let b = k;
    while (a > 0 && toks[a - 1].unknown) a--;
    while (b < toks.length - 1 && toks[b + 1].unknown) b++;
    const word = toks.slice(a, b + 1).map((x) => x.text).join("");
    showText(word, anchor, m);
    return true;
  }

  // ---------------------------------------------------------------------------
  // A pop-up for any text: the words in it, with readings, meanings and audio

  const links = (text) =>
    '<div class="pop-links">' +
    '<a href="https://jisho.org/search/' + encodeURIComponent(text) + '" target="_blank" rel="noopener">Jisho ↗</a>' +
    '<a href="https://translate.google.com/?sl=ja&tl=en&op=translate&text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener">Google Translate ↗</a>' +
    '<a href="https://www.deepl.com/translator#ja/en/' + encodeURIComponent(text) + '" target="_blank" rel="noopener">DeepL ↗</a></div>';

  function wordsHtml(text) {
    const rows = [];
    let run = "";
    const flush = () => {
      if (run) rows.push('<li><span lang="ja">' + esc(run) + "</span>" + ui.say(run) + '<span class="muted">not in this course yet</span></li>');
      run = "";
    };
    for (const t of NI.lex.readPlain(text)) {
      if (t.unknown) {
        run += t.text;
        continue;
      }
      flush();
      if (!t.entry) continue;
      const e = t.entry;
      const reading = e.r && e.r !== t.text ? ' <span class="pop-reading" lang="ja">' + esc(e.r) + "</span>" : "";
      rows.push('<li><span lang="ja">' + esc(t.text) + "</span>" + reading + ui.say(e.r || t.text) + "<span>" + esc(NI.lex.gloss(e)) + "</span></li>");
    }
    flush();
    return rows.length ? '<ul class="pop-words">' + rows.join("") + "</ul>" : "";
  }

  function hiddenNote(m) {
    return (
      '<div class="pop-peek"><button class="btn small" type="button" data-peek>Show the meaning</button>' +
      (m === "quiz" ? '<span class="small muted">counts as a hint: half XP</span>' : "") + "</div>"
    );
  }

  function showText(text, anchor, m) {
    const pop = doc.getElementById("pop");
    if (!pop || !text) return;
    const clean = text.replace(/\s+/g, "");
    const reading = NI.lex.kanaOf(clean);
    const meaning = wordsHtml(clean) + links(clean);
    pop.innerHTML =
      '<div class="pop-head"><span lang="ja">' + esc(clean.length > 40 ? clean.slice(0, 40) + "…" : clean) + "</span>" + ui.say(clean) + "</div>" +
      (reading && reading !== NI.kana.fold(clean) && NI.kana.hasKanji(clean) ? '<div class="pop-reading" lang="ja">' + esc(reading) + "</div>" : "") +
      (m ? hiddenNote(m) + '<div class="pop-hidden" hidden>' + meaning + "</div>" : meaning);
    ui.placePop(pop, anchor);
    if (NI.store.settings.tapSpeak !== false) NI.speech.speak(clean);
  }

  // "Show the meaning" in a pop-up during a question.
  function bindPeek() {
    const pop = doc.getElementById("pop");
    if (!pop || pop._peek) return;
    pop._peek = true;
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("[data-peek]");
      if (!b) return;
      const hidden = pop.querySelector(".pop-hidden");
      if (hidden) hidden.hidden = false;
      b.parentElement.remove();
      doc.dispatchEvent(new CustomEvent("ni-peek"));
    });
  }

  // ---------------------------------------------------------------------------
  // Selected text: a small bar with Listen, Slowly, Meaning and Translate

  let bar = null;
  let selText = "";
  let selRect = null;
  let selMode = null;
  let timer = null;

  function selectedText(range) {
    const frag = range.cloneContents();
    frag.querySelectorAll(NOT_TEXT).forEach((n) => n.remove());
    return frag.textContent.replace(/\s+/g, " ").trim();
  }

  function hideBar() {
    if (bar) bar.hidden = true;
  }

  function showBar() {
    if (!bar) {
      bar = doc.createElement("div");
      bar.id = "seltool";
      bar.setAttribute("role", "toolbar");
      bar.setAttribute("aria-label", "Selected Japanese");
      doc.body.appendChild(bar);
      // Keep the selection when a button is pressed with a mouse.
      bar.addEventListener("mousedown", (e) => e.preventDefault());
      bar.addEventListener("click", (e) => {
        const b = e.target.closest("[data-sel]");
        if (!b) return;
        const what = b.getAttribute("data-sel");
        const plain = selText.replace(/\s+/g, "");
        if (what === "say") NI.speech.speak(plain);
        else if (what === "slow") NI.speech.speak(plain, { rate: 0.6 });
        else if (what === "mean") {
          hideBar();
          showText(selText, { getBoundingClientRect: () => selRect }, selMode);
        }
      });
    }
    const plain = selText.replace(/\s+/g, "");
    const canSay = NI.speech.supported;
    bar.innerHTML =
      (canSay ? '<button type="button" data-sel="say">' + ui.ICON.speaker + "<span>Listen</span></button>" : "") +
      (canSay ? '<button type="button" data-sel="slow">' + ui.ICON.turtle + "<span>Slowly</span></button>" : "") +
      '<button type="button" data-sel="mean"><span aria-hidden="true">Aa</span><span>Meaning</span></button>' +
      (selMode ? "" : '<a href="https://translate.google.com/?sl=ja&tl=en&op=translate&text=' + encodeURIComponent(plain) + '" target="_blank" rel="noopener"><span>Translate ↗</span></a>');
    bar.hidden = false;
    // Below the selection, where it doesn't cover the phone's own menu.
    const vw = doc.documentElement.clientWidth;
    const w = bar.offsetWidth;
    const h = bar.offsetHeight;
    let left = selRect.left + selRect.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, vw - w - 8));
    let top = selRect.bottom + 10;
    if (top + h > root.innerHeight - 70) top = Math.max(8, selRect.top - h - 10);
    bar.style.left = left + "px";
    bar.style.top = top + "px";
  }

  function onSelection() {
    if (NI.store.settings.selBar === false) return hideBar();
    const sel = doc.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return hideBar();
    const range = sel.getRangeAt(0);
    const host = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    if (!host || host.closest("input, textarea, [contenteditable], #seltool, #pop")) return hideBar();
    const text = selectedText(range);
    selMode = mode(host);
    if (!text || text.length > 300 || !JP.test(text) || selMode === "closed") return hideBar();
    selText = text;
    selRect = range.getBoundingClientRect();
    showBar();
  }

  function init() {
    bindPeek();
    doc.addEventListener("selectionchange", () => {
      clearTimeout(timer);
      timer = setTimeout(onSelection, 280);
    });
    root.addEventListener("scroll", hideBar, { passive: true });
    root.addEventListener("hashchange", hideBar);
    doc.addEventListener("keydown", (e) => e.key === "Escape" && hideBar());
  }

  NI.lookup = { tap, mode, showText, init, wordsHtml };
})(typeof window !== "undefined" ? window : globalThis);
