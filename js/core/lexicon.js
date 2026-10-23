/* Lexicon and word segmenter.
   Every course word (plus all of its conjugated forms), every grammar word and
   every name is indexed by its written surface. Sentences are split by
   longest match on ruby-atom boundaries; when several entries share a surface
   (人 = ひと / じん / にん) the furigana decides. This powers tap-to-look-up and
   the content checks in tools/validate.js. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});

  // Unit in which each conjugated form is taught.
  const FORM_UNIT = {
    verb: {
      masu: 6, masen: 6, mashita: 7, masendeshita: 7,
      tai: 11, takunai: 11, takatta: 18, takunakatta: 18,
      te: 12, tekudasai: 12,
      teimasu: 13, teimasen: 13, teimashita: 13, teimasendeshita: 13,
      mashou: 14, stemni: 14,
      temo: 15, tewa: 15,
      dict: 16, nai: 16, nakatta: 16, ta: 16, naide: 16, teiru: 16, teinai: 16, teita: 16, teru: 16, tenai: 16, teta: 16, vol: 16,
      tari: 18,
      pot: 22, potmasu: 22, potmasen: 22, potmashita: 22, potmasendeshita: 22, potnai: 22, potnakatta: 22,
      tara: 23, nakattara: 23,
      nagara: 24,
      sou: 27, souna: 27,
      ba: 28, nakereba: 28,
      nakute: 29,
    },
    "adj-i": { neg: 10, kuarimasen: 10, te: 10, adv: 15, past: 18, pastneg: 18, kuarimasendeshita: 18, tara: 23, sou: 27, souna: 27, ba: 28 },
    "adj-na": { na: 10, de: 10, janai: 10, ni: 15, da: 16, datta: 16, janakatta: 18, tara: 23, sou: 27, souna: 27, nara: 28 },
  };

  const PUNCT = /^[。、？！「」『』…〜・（）()!?,.:：　ー—]$/;
  const DIGITS = /^[0-9０-９,，]+$/;
  const KIND_RANK = { word: 0, form: 1, grammar: 2, name: 3 };

  const lex = {
    ready: false,
    index: new Map(),
    byKey: new Map(),
    maxLen: 1,
    FORM_UNIT,

    add(e) {
      this.byKey.set(e.key, e);
      const list = this.index.get(e.s) || [];
      list.push(e);
      this.index.set(e.s, list);
      if (e.s.length > this.maxLen) this.maxLen = e.s.length;
    },

    build() {
      const F = NI.furi;
      this.index = new Map();
      this.byKey = new Map();
      this.maxLen = 1;
      NI.course.init();
      for (const wd of NI.course.words) {
        // A verb's own surface is its dictionary form, which is taught later than ます.
        const isV = NI.conj.isVerb(wd.pos);
        this.add({
          key: wd.id, kind: "word", id: wd.id, form: isV ? "dict" : null,
          unit: isV ? Math.max(wd.unit, FORM_UNIT.verb.dict) : wd.unit,
          s: wd.w, r: wd.r, rs: wd.rs, j: wd.j, en: wd.en, pos: wd.pos, start: wd.start,
        });
        // 勉強する also gives the noun 勉強
        if (wd.pos === "vs" && wd.j !== "する" && wd.j.endsWith("する")) {
          const m = wd.j.slice(0, -2);
          this.add({ key: wd.id + "#noun", kind: "form", id: wd.id, form: "noun", unit: wd.unit, s: F.base(m), r: F.reading(m), j: m, en: wd.en, pos: "n" });
        }
        if (NI.conj.isVerb(wd.pos) || NI.conj.isAdj(wd.pos)) {
          const forms = NI.conj.forms(wd);
          const table = NI.conj.isVerb(wd.pos) ? FORM_UNIT.verb : wd.pos === "adj-na" ? FORM_UNIT["adj-na"] : FORM_UNIT["adj-i"];
          for (const f in forms) {
            if (f === "dict" && !NI.conj.isVerb(wd.pos)) continue;
            const m = forms[f];
            const s = F.base(m);
            if (s === wd.w) continue;
            this.add({
              key: wd.id + "#" + f, kind: "form", id: wd.id, form: f,
              unit: Math.max(wd.unit, table[f] || wd.unit),
              s, r: F.reading(m), j: m, en: wd.en, pos: wd.pos,
            });
          }
        }
      }
      for (const g of NI.data.grammar) {
        const s = F.base(g.s);
        this.add({ key: "g:" + s + (g.tag ? "#" + g.tag : ""), kind: "grammar", unit: g.u, s, r: F.reading(g.s), rs: g.rs, j: g.s, en: g.en, pos: g.kind, start: g.start });
      }
      for (const n of NI.data.names) {
        const s = F.base(n.j);
        this.add({ key: "n:" + s, kind: "name", unit: 0, s, r: F.reading(n.j), j: n.j, en: n.en, pos: "name" });
      }
      this.ready = true;
      return this;
    },

    get(key) {
      return this.byKey.get(key) || null;
    },

    choose(cands) {
      return cands.slice().sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.unit - b.unit)[0];
    },

    // Every way a token can start at atom i.
    options(atoms, i, offs, base) {
      const F = NI.furi;
      const a = atoms[i];
      if (a.r == null && PUNCT.test(a.b)) return [{ start: i, end: i + 1, entry: { kind: "punct", key: "" }, w: 10 }];
      if (DIGITS.test(a.b)) {
        return [{ start: i, end: i + 1, entry: { kind: "number", key: "#" + a.b, s: a.b, r: a.r || a.b, en: a.b }, w: 10 }];
      }
      if (a.r == null && /[A-Za-z]/.test(a.b)) {
        let j = i;
        while (j < atoms.length && atoms[j].r == null && /[A-Za-z'\-]/.test(atoms[j].b)) j++;
        return [{ start: i, end: j, entry: null, foreign: true, w: 10 }];
      }
      const out = [{ start: i, end: i + 1, entry: null, unknown: true, w: 10 }];
      for (let j = i + 1; j <= atoms.length && offs[j] - offs[i] <= this.maxLen; j++) {
        let cands = this.index.get(base.slice(offs[i], offs[j]));
        if (!cands) continue;
        // sentence-initial words (でも, だから) only at the start or after punctuation
        if (i > 0 && !(atoms[i - 1].r == null && PUNCT.test(atoms[i - 1].b))) cands = cands.filter((c) => !c.start);
        if (!cands.length) continue;
        const rd = F.readingOfAtoms(atoms.slice(i, j));
        const exact = cands.filter((c) => c.r === rd || (c.rs && c.rs.indexOf(rd) >= 0));
        const entry = this.choose(exact.length ? exact : cands);
        out.push({ start: i, end: j, entry, mismatch: !exact.length, reading: rd, w: entry.kind === "form" ? 11 : 10 });
      }
      return out;
    },

    /* Splits one tile into tokens. Dynamic programming picks the split with the
       fewest unknown words, then the fewest furigana mismatches, then the
       fewest (and plainest) tokens: 大丈夫です → 大丈夫 + です, not 大丈夫で + す. */
    segment(atoms) {
      const offs = [0];
      let base = "";
      for (const a of atoms) {
        base += a.b;
        offs.push(base.length);
      }
      const n = atoms.length;
      const best = new Array(n + 1).fill(null);
      best[0] = { u: 0, m: 0, w: 0, tok: null, prev: null };
      const better = (x, y) => x.u < y.u || (x.u === y.u && (x.m < y.m || (x.m === y.m && x.w < y.w)));
      for (let i = 0; i < n; i++) {
        const cur = best[i];
        if (!cur) continue;
        for (const o of this.options(atoms, i, offs, base)) {
          const c = { u: cur.u + (o.unknown ? 1 : 0), m: cur.m + (o.mismatch ? 1 : 0), w: cur.w + o.w, tok: o, prev: cur };
          if (!best[o.end] || better(c, best[o.end])) best[o.end] = c;
        }
      }
      const out = [];
      for (let c = best[n]; c && c.tok; c = c.prev) out.unshift(c.tok);
      return out;
    },

    // All tokens of a markup string, flattened across tiles.
    tokens(markup) {
      const tiles = NI.furi.parse(markup);
      const out = [];
      tiles.forEach((atoms, ti) => {
        for (const t of this.segment(atoms)) out.push(Object.assign({ tile: ti, atoms: atoms.slice(t.start, t.end) }, t));
      });
      // After a number, a counter beats its homograph: 3本 is "3 long things", not "3 books".
      for (let i = 1; i < out.length; i++) {
        const t = out[i];
        if (!t.entry || t.entry.pos === "ctr" || !out[i - 1].entry || out[i - 1].entry.kind !== "number") continue;
        const rd = t.reading || t.entry.r;
        const ctr = (this.index.get(t.entry.s) || []).find((e) => e.pos === "ctr" && (e.r === rd || (e.rs && e.rs.indexOf(rd) >= 0)));
        if (ctr) out[i] = Object.assign({}, t, { entry: ctr, mismatch: false });
      }
      return out;
    },
  };

  NI.lex = lex;
})(typeof window !== "undefined" ? window : globalThis);
