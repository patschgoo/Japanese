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
    return { text, starts, furigana: furiganaIn(block) };
  }

  // The furigana shown in an element (or a copy of a selection): [kanji, reading] pairs.
  function furiganaIn(el) {
    return Array.from(el.querySelectorAll("ruby")).map((rb) => {
      const rt = Array.from(rb.querySelectorAll("rt")).map((x) => x.textContent).join("");
      const base = Array.from(rb.childNodes).filter((x) => !(x.nodeType === 1 && /^(RT|RP)$/.test(x.tagName))).map((x) => x.textContent).join("");
      return [base, rt];
    }).filter(([b, r]) => b && r);
  }

  // How a word is read, from the furigana on screen; null if a kanji has none.
  function readingFrom(word, furigana) {
    let out = word;
    for (const [b, r] of furigana.slice().sort((x, y) => y[0].length - x[0].length)) out = out.split(b).join(r);
    return NI.kana.hasKanji(out) ? null : out;
  }

  // ---------------------------------------------------------------------------
  // Grammar written inside English text, and kana mentioned on their own

  const TERMS = {
    "い-adjective": "An adjective that ends in い and changes its ending: 高い, 高くない, 高かった.",
    "な-adjective": "An adjective that takes な before a noun (静かな 町). It doesn't change itself; です or だ after it does.",
    "て-form": "The verb form that ends in て or で (食べて, 飲んで), for requests, “-ing” and joining actions.",
    "た-form": "The plain past: 食べた, 飲んだ. It's made like the て-form, with た or だ.",
    "ます-form": "The polite verb form: 食べます, 飲みます.",
    "ます-stem": "What's left when ます comes off (食べ, 飲み). 〜たい, 〜ながら and 〜そう attach to it.",
    "ない-form": "The plain negative: 食べない, 飲まない.",
    "ば-form": "The “if” form: 行けば, 高ければ.",
    "あ-row": "The kana that end in a: あ か さ た な は ま や ら わ.",
    "い-row": "The kana that end in i: い き し ち に ひ み り.",
    "う-row": "The kana that end in u: う く す つ ぬ ふ む ゆ る.",
    "え-row": "The kana that end in e: え け せ て ね へ め れ.",
    "お-row": "The kana that end in o: お こ そ と の ほ も よ ろ を.",
    "こ-words": "Words for things near me, the speaker: これ, この, ここ, こちら.",
    "そ-words": "Words for things near you, the listener: それ, その, そこ, そちら.",
    "あ-words": "Words for things away from us both: あれ, あの, あそこ, あちら.",
    "ど-words": "The question words: どれ, どの, どこ, どちら.",
  };
  const BITS = {
    ます: "The polite verb ending, for now and the future: 食べます, I eat or I'll eat.",
    ません: "The polite negative: 食べません, I don't eat.",
    ました: "The polite past: 食べました, I ate.",
    ませんでした: "The polite past negative: 食べませんでした, I didn't eat.",
    ましょう: "Let's: 食べましょう, let's eat.",
    ませんか: "Won't you…? An invitation: 食べませんか.",
    たい: "Want to: 食べたい(です), I want to eat.",
    たら: "If or when: 食べたら, when I eat, if I eat.",
    ば: "If: 行けば, if I go.",
    ない: "Not, in plain speech: 食べない, don't eat.",
    なかった: "Didn't, in plain speech: 食べなかった.",
    た: "The plain past: 食べた, ate.",
    て: "The て-form ending: 食べて (eat and…, please eat…).",
    ている: "“-ing”, or a state that lasts: 食べている, is eating.",
    てる: "Casual ている: 食べてる, is eating.",
    てしまう: "Finish, or end up doing: 忘れてしまった, I went and forgot.",
    ちゃう: "Casual てしまう: 忘れちゃった.",
    じゃう: "Casual でしまう: 飲んじゃった.",
    なければ: "If not: 〜なければいけません, must.",
    なきゃ: "Casual なければ: 帰らなきゃ, I've got to go home.",
    ければ: "If, for い-adjectives: 高ければ, if it's expensive.",
    られる: "Can, for group 2 verbs: 食べられる, can eat. Also the passive.",
    そう: "Looks: おいしそう, looks delicious. After a plain form, そうです means I hear.",
    な: "Links a な-adjective to a noun: 静かな 町.",
    ながら: "While: 聞きながら, while listening.",
    たり: "〜たり〜たりする: doing things like… and….",
    えい: "Usually said as a long e: せんせい is sensē.",
    おう: "Said as a long o: がっこう is gakkō.",
    たくないです: "Don't want to: 行きたくないです, I don't want to go.",
    なさそう: "Looks as if there's none, or looks not…: from ない, as よさそう comes from いい.",
    れば: "If, for group 2 verbs: る becomes れば, 食べる → 食べれば.",
    って: "A て-form ending: verbs with い, ち or り before ます take って (買います → 買って).",
    んで: "A て-form ending: verbs with み, び or に before ます take んで (飲みます → 飲んで).",
    いて: "A て-form ending: verbs with き before ます take いて (書きます → 書いて); 行きます → 行って is the exception.",
    いで: "A て-form ending: verbs with ぎ before ます take いで (泳ぎます → 泳いで).",
    して: "A て-form ending: verbs with し before ます take して (話します → 話して).",
    っ: "Small っ doubles the next consonant: きって is kitte, not kite.",
    ッ: "Small ッ doubles the next consonant: ベッド is beddo.",
    ー: "Makes the vowel before it long: コーヒー is kōhī.",
    ゃ: "Small ゃ joins the kana before it into one sound: き + ゃ = きゃ (kya).",
    ゅ: "Small ゅ joins the kana before it into one sound: き + ゅ = きゅ (kyu).",
    ょ: "Small ょ joins the kana before it into one sound: き + ょ = きょ (kyo).",
    "゛": "Two dots (dakuten) make a sound voiced: か → が, さ → ざ, た → だ, は → ば.",
    "゜": "A small circle (handakuten) turns h into p: は → ぱ, ひ → ぴ.",
  };

  // The grammar points the course teaches, by the patterns written after 〜 in them.
  let PATTERNS = null;
  function patterns() {
    if (PATTERNS) return PATTERNS;
    PATTERNS = new Map();
    const points = NI.course.units.flatMap((u) => (u.grammar || []).map((g) => ({ g, u })));
    // Titles first (“Inviting: 〜ませんか”), then mentions in the explanations.
    for (const where of ["t", "body"])
      for (const { g, u } of points) {
        const text = NI.furi.base(String(g[where] || "").replace(/<[^>]+>|\[\[|\]\]/g, " "));
        for (const p of text.match(/〜[ぁ-ゖァ-ヺー一-鿿々]+/g) || []) {
          if (!PATTERNS.has(p.slice(1))) PATTERNS.set(p.slice(1), { t: p, en: g.t.split(":")[0], ex: g.ex && g.ex[0], unit: u.n });
        }
      }
    return PATTERNS;
  }

  // Japanese that runs on without a break: what a pattern like 〜ませんか is made of.
  const CHUNK = /[ぁ-ゖァ-ヺー一-鿿々〆ヵヶ]/;
  const bit = (s) => (BITS[s] ? { t: (/^[ぁ-ゖ]/.test(s) && s.length > 1 ? "〜" : "") + s, en: BITS[s] } : null);
  // A pattern as the course writes it, or the one it starts like (〜たことがある → 〜たことがあります).
  function pattern(chunk) {
    const P = patterns();
    if (P.has(chunk)) return P.get(chunk);
    let best = null;
    let len = 0;
    for (const [k, v] of P) {
      let n = 0;
      while (n < k.length && n < chunk.length && k[n] === chunk[n]) n++;
      if (n > len) {
        len = n;
        best = v;
      }
    }
    return len >= Math.max(3, Math.ceil(chunk.length * 0.7)) ? best : null;
  }
  const wholeWord = (s) => {
    const t = NI.lex.readPlain(s);
    return t.length === 1 && !!t[0].entry;
  };

  // Grammar notation: い-adjective, the ます form, 〜ませんか.
  function notation(chunk, before, after) {
    const m = /^-([a-z]+)/.exec(after);
    const key = m && chunk + "-" + m[1].replace(/s$/, "");
    if (key && TERMS[key]) return { t: key, en: TERMS[key] };
    if (before === "〜") return pattern(chunk) || bit(chunk);
    // Written on its own inside English: “the ます form”, “add ば”.
    if (!CHUNK.test(before) && !CHUNK.test(after.charAt(0))) return bit(chunk) || (wholeWord(chunk) ? null : patterns().get(chunk) || null);
    return null;
  }

  // A single kana (or one with a small ゃ, ァ…), as in “シ (shi): dots on the left”.
  const isKanaUnit = (w) => /^[ぁ-ゖァ-ヺ][ぁぃぅぇぉゃゅょァィゥェォャュョ]?$/.test(w);

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
    const { text, starts, furigana } = textOf(block);
    if (!starts.has(c.node)) return false;
    const at = Array.from(text.slice(0, starts.get(c.node) + hit.i)).length; // in code points
    const toks = NI.lex.readPlain(text);
    let k = toks.findIndex((x) => at >= x.start && at < x.end);
    if (k < 0) return false;
    const anchor = { getBoundingClientRect: () => hit.rect };
    // Grammar written inside English text first: い-adjective, the ます form, 〜ませんか.
    const chars = Array.from(text);
    let from = at;
    let to = at + 1;
    while (from > 0 && CHUNK.test(chars[from - 1])) from--;
    while (to < chars.length && CHUNK.test(chars[to])) to++;
    const note = CHUNK.test(chars[at]) ? notation(chars.slice(from, to).join(""), chars[from - 1] || "", chars.slice(to, to + 12).join("")) : null;
    if (note) {
      showNote(note, anchor, m);
      return true;
    }
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
    const alone = !CHUNK.test(chars[toks[a].start - 1] || "") && !CHUNK.test(chars[toks[b].end] || "");
    if (isKanaUnit(word) && alone) showKana(word, anchor, m);
    else showText(word, anchor, m, readingFrom(word, furigana));
    return true;
  }

  // ---------------------------------------------------------------------------
  // A pop-up for any text: the words in it, with readings, meanings and audio

  const links = (text) =>
    '<div class="pop-links">' +
    '<a href="https://jisho.org/search/' + encodeURIComponent(text) + '" target="_blank" rel="noopener">Jisho ↗</a>' +
    '<a href="https://translate.google.com/?sl=ja&tl=en&op=translate&text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener">Google Translate ↗</a>' +
    '<a href="https://www.deepl.com/translator#ja/en/' + encodeURIComponent(text) + '" target="_blank" rel="noopener">DeepL ↗</a></div>';

  function wordsHtml(text, furigana) {
    const rows = [];
    let run = "";
    const flush = () => {
      const rd = run && furigana ? readingFrom(run, furigana) : null;
      if (run) rows.push('<li><span lang="ja">' + esc(run) + "</span>" + (rd && rd !== run ? ' <span class="pop-reading" lang="ja">' + esc(rd) + "</span>" : "") + ui.say(rd || run) + '<span class="muted">not in this course yet</span></li>');
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

  // A pop-up for any text. reading and furigana come from what's on screen, when known.
  function showText(text, anchor, m, reading, furigana) {
    const pop = doc.getElementById("pop");
    if (!pop || !text) return;
    const clean = text.replace(/\s+/g, "");
    reading = reading || (furigana && readingFrom(clean, furigana)) || NI.lex.kanaOf(clean);
    const meaning = wordsHtml(clean, furigana) + links(clean);
    pop.innerHTML =
      '<div class="pop-head"><span lang="ja">' + esc(clean.length > 40 ? clean.slice(0, 40) + "…" : clean) + "</span>" + ui.say(clean) + "</div>" +
      (reading && reading !== NI.kana.fold(clean) && NI.kana.hasKanji(clean) ? '<div class="pop-reading" lang="ja">' + esc(reading) + "</div>" : "") +
      (ui.romajiOn() ? '<div class="pop-ro">' + esc(NI.lex.romajiText(clean, reading)) + "</div>" : "") +
      (m ? hiddenNote(m) + '<div class="pop-hidden" hidden>' + meaning + "</div>" : meaning);
    ui.placePop(pop, anchor);
    if (NI.store.settings.tapSpeak !== false) NI.speech.speak(clean);
  }

  // Grammar notation: what it means, with an example and where it's taught.
  function showNote(note, anchor, m) {
    const pop = doc.getElementById("pop");
    if (!pop) return;
    const body =
      '<div class="pop-en">' + esc(note.en) + "</div>" +
      (note.ex ? '<div class="pop-ex">' + ui.jp(note.ex[0], { tokens: false }) + '<span class="muted">' + esc(note.ex[1]) + "</span></div>" : "") +
      '<div class="pop-meta">grammar · ' + (note.unit ? '<a href="#unit-' + note.unit + '">Unit ' + note.unit + "</a> · " : "") + '<a href="#grammar">Grammar list</a></div>';
    pop.innerHTML = '<div class="pop-head"><span lang="ja">' + esc(note.t) + "</span></div>" + (m ? hiddenNote(m) + '<div class="pop-hidden" hidden>' + body + "</div>" : body);
    ui.placePop(pop, anchor);
  }

  // A kana on its own: its sound, and where to see it written.
  function showKana(k, anchor, m) {
    const pop = doc.getElementById("pop");
    if (!pop) return;
    const kata = NI.kana.hasKatakana(k);
    const h = NI.kana.toHiragana(k);
    const body =
      '<div class="pop-en">' + (kata ? "katakana" : "hiragana") + " for <b>" + esc(NI.kanaPractice.toRomaji(k)) + "</b>" + (kata ? ' (<span lang="ja">' + esc(h) + "</span>)" : "") + "</div>" +
      '<div class="pop-meta"><a href="#kana-chart">See it in the kana chart</a></div>';
    pop.innerHTML = '<div class="pop-head"><span lang="ja" class="hand">' + esc(k) + "</span>" + ui.say(h) + "</div>" + (m ? hiddenNote(m) + '<div class="pop-hidden" hidden>' + body + "</div>" : body);
    ui.placePop(pop, anchor);
    if (NI.store.settings.tapSpeak !== false) NI.speech.speak(h);
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
  let selFuri = [];
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
          showText(selText, { getBoundingClientRect: () => selRect }, selMode, null, selFuri);
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
    selFuri = furiganaIn(range.cloneContents());
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

  NI.lookup = { tap, mode, showText, init, wordsHtml, notation, isKanaUnit };
})(typeof window !== "undefined" ? window : globalThis);
