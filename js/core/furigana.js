/* Furigana markup.
   Course text is written as  {私|わたし}は {学生|がくせい}です。
   - {base|reading} is a kanji group with its reading (rendered as <ruby>)
   - a space separates phrases ("tiles"); tiles are shown with a small gap for
     beginners and become the pieces of the sentence-builder exercise.
   Every other character is its own atom, so word boundaries can fall anywhere
   outside a ruby group. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  const esc = (s) => NI.util.escapeHtml(s);
  const cache = new Map();

  function parse(markup) {
    const src = String(markup);
    if (cache.has(src)) return cache.get(src);
    const tiles = [];
    let tile = [];
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === " ") {
        if (tile.length) tiles.push(tile);
        tile = [];
      } else if (ch === "{") {
        const close = src.indexOf("}", i);
        const bar = src.indexOf("|", i);
        if (close < 0 || bar < 0 || bar > close) throw new Error("Bad furigana markup: " + src);
        tile.push({ b: src.slice(i + 1, bar), r: src.slice(bar + 1, close) });
        i = close;
      } else {
        tile.push({ b: ch, r: null });
      }
    }
    if (tile.length) tiles.push(tile);
    cache.set(src, tiles);
    return tiles;
  }

  const atomsOf = (markup) => [].concat(...parse(markup));
  const baseOfAtoms = (atoms) => atoms.map((a) => a.b).join("");
  const readingOfAtoms = (atoms) => atoms.map((a) => (a.r == null ? a.b : a.r)).join("");
  const base = (markup) => baseOfAtoms(atomsOf(markup));
  const reading = (markup) => readingOfAtoms(atomsOf(markup));
  const tileTexts = (markup) => parse(markup).map(baseOfAtoms);
  // Markup of each tile, e.g. for rendering sentence-builder pieces.
  const tileMarkups = (markup) =>
    parse(markup).map((t) => t.map((a) => (a.r == null ? a.b : "{" + a.b + "|" + a.r + "}")).join(""));

  const defaults = { mode: "furigana", kataHelp: true, gaps: true, tokens: true };

  // Renders a run of atoms; consecutive katakana get a hiragana reading when
  // katakana help is on.
  function atomsHtml(atoms, o) {
    let html = "";
    let kata = "";
    const flushKata = () => {
      if (!kata) return;
      if (o.kataHelp && /[ァ-ヺ]/.test(kata)) {
        html += "<ruby class=\"kh\">" + esc(kata) + "<rt>" + esc(NI.kana.toHiragana(kata)) + "</rt></ruby>";
      } else {
        html += esc(kata);
      }
      kata = "";
    };
    for (const a of atoms) {
      if (a.r == null && NI.kana.isKatakana(a.b)) {
        kata += a.b;
        continue;
      }
      flushKata();
      if (a.r == null) html += esc(a.b);
      else if (o.mode === "kana") html += esc(a.r);
      else html += "<ruby>" + esc(a.b) + "<rt>" + esc(a.r) + "</rt></ruby>";
    }
    flushKata();
    return html;
  }

  /* Renders markup to HTML. Known words become tappable spans (data-k is the
     lexicon key) when the lexicon is loaded. opts.onToken may replace a token,
     which is how exercises blank out a particle. */
  function render(markup, opts) {
    const o = Object.assign({}, defaults, opts || {});
    const tiles = parse(markup);
    const parts = [];
    tiles.forEach((atoms, ti) => {
      let inner = "";
      const toks = o.tokens && NI.lex && NI.lex.ready ? NI.lex.segment(atoms) : [{ start: 0, end: atoms.length, entry: null }];
      toks.forEach((tok, ki) => {
        const slice = atoms.slice(tok.start, tok.end);
        let h = atomsHtml(slice, o);
        if (tok.entry && tok.entry.kind !== "punct") {
          h = "<span class=\"tok\" data-k=\"" + esc(tok.entry.key) + "\">" + h + "</span>";
        }
        if (o.onToken) {
          const r = o.onToken(tok, h, ti, ki, slice);
          if (r != null) h = r;
        }
        inner += h;
      });
      parts.push("<span class=\"tl\">" + inner + "</span>");
    });
    return parts.join(o.gaps ? "<span class=\"gp\"> </span>" : "");
  }

  NI.furi = {
    parse,
    atomsOf,
    baseOfAtoms,
    readingOfAtoms,
    base,
    reading,
    tileTexts,
    tileMarkups,
    atomsHtml,
    render,
    defaults,
  };
})(typeof window !== "undefined" ? window : globalThis);
