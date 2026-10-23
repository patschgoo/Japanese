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
      pot: 22, potmasu: 22, potmasen: 22, potmashita: 22, potmasendeshita: 22, potnai: 22, potnakatta: 22, potta: 22,
      tara: 23, nakattara: 23,
      nagara: 24,
      sou: 27, souna: 27,
      ba: 28, nakereba: 28,
      nakute: 29,
    },
    "adj-i": { neg: 10, kuarimasen: 10, te: 10, adv: 15, past: 18, pastneg: 18, kuarimasendeshita: 18, tara: 23, sou: 27, souna: 27, ba: 28 },
    "adj-na": { na: 10, de: 10, janai: 10, ni: 15, da: 16, datta: 16, janakatta: 18, tara: 23, sou: 27, souna: 27, nara: 28 },
  };

  // Word-by-word glosses: a short meaning, plus what a form adds (飲みました → "drink · past").
  const ROLE = {
    は: "topic", が: "subject", を: "object", に: "to / at", で: "at / by", へ: "toward", と: "and / with", も: "also",
    の: "’s / of", か: "?", ね: "right?", よ: "you know", から: "from / so", まで: "until", より: "than", だけ: "only",
    ぐらい: "about", けど: "but", です: "is", でした: "was", じゃありません: "isn’t", ではありません: "isn’t", じゃないです: "isn’t",
    じゃありませんでした: "wasn’t", じゃなかったです: "wasn’t", だ: "is", だった: "was", じゃない: "isn’t", じゃなかった: "wasn’t",
    んです: "(explains)", たち: "(plural)", お: "(polite)", ご: "(polite)", こと: "thing", ほう: "side", だったら: "if it’s",
    かもしれません: "might", かもしれない: "might", なら: "if it’s", でございます: "is (polite)",
    そうです: "I hear", だそうです: "I hear it’s", によると: "according to",
  };
  const FORM_TAG = {
    masen: "not", mashita: "past", masendeshita: "not · past", mashou: "let’s", tai: "want to", takunai: "don’t want to",
    takatta: "wanted to", takunakatta: "didn’t want to", stemni: "to (do)", nagara: "while", sou: "looks", souna: "looks",
    nai: "not", nakatta: "not · past", naide: "without", nakute: "not", nakereba: "if not", nakattara: "if not", te: "-te",
    ta: "past", tara: "if / when", tari: "and so on", tekudasai: "please", temo: "even if", tewa: "(must not)", teimasu: "-ing",
    teimasen: "not -ing", teimashita: "was -ing", teimasendeshita: "wasn’t -ing", teiru: "-ing", teinai: "not -ing", teita: "was -ing",
    teru: "-ing", tenai: "not -ing", teta: "was -ing", vol: "let’s", ba: "if", pot: "can", potmasu: "can", potmasen: "can’t",
    potmashita: "could", potmasendeshita: "couldn’t", potnai: "can’t", potnakatta: "couldn’t", potta: "could", neg: "not", past: "past",
    pastneg: "not · past", adv: "-ly", kuarimasen: "not", kuarimasendeshita: "not · past", ni: "-ly", de: "and", da: "is",
    datta: "was", janai: "not", janakatta: "not · past", nara: "if",
  };
  // Particle ids for colour-coding (CSS: .tok[data-p="wa"]).
  const PARTICLE_ID = { は: "wa", が: "ga", を: "o", に: "ni", で: "de", へ: "e", と: "to", も: "mo", の: "no", か: "ka", から: "kara", まで: "made", より: "yori", ね: "ne", よ: "yo" };

  function shortMeaning(en) {
    const s = String(en || "").replace(/\s*\(.*?\)/g, "").split(/[;,/]/)[0].trim();
    return s.length > 18 ? s.slice(0, 17) + "…" : s;
  }

  const PUNCT = /^[。、？！「」『』…〜・（）()!?,.:：　ー—]$/;

  // Plain forms that hearsay そうです can follow: 降る, 降った, 寒い, 寒くない, 雨だ …
  const PLAIN = new Set(["dict", "nai", "nakatta", "ta", "teiru", "teinai", "teita", "pot", "potnai", "potta", "potnakatta", "tai", "takunai", "takatta", "takunakatta", "neg", "past", "pastneg", "da", "datta", "janai", "janakatta"]);
  function isPlain(tok) {
    const e = tok && tok.entry;
    if (!e) return false;
    if (e.kind === "word") return NI.conj.isVerb(e.pos) || e.pos === "adj-i" || e.pos === "adj-ix";
    if (e.kind === "form") return PLAIN.has(e.form) && (NI.conj.isVerb(e.pos) || NI.conj.isAdj(e.pos));
    if (e.kind === "grammar") return ["だ", "だった", "じゃない", "じゃなかった", "ない", "なかった"].indexOf(e.s) >= 0;
    return false;
  }
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
        this.add({ key: "g:" + s + (g.tag ? "#" + g.tag : ""), kind: "grammar", unit: g.u, s, r: F.reading(g.s), rs: g.rs, j: g.s, en: g.en, pos: g.kind, start: g.start, after: g.after });
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

    // Short English label for an entry, for word-by-word reading aids.
    gloss(entry) {
      if (!entry) return "";
      if (entry.kind === "number") return entry.s;
      if (entry.kind === "grammar") return ROLE[entry.s] || shortMeaning(entry.en);
      if (entry.kind === "name") return shortMeaning(entry.en);
      let g = shortMeaning(entry.en);
      const tag = entry.kind === "form" ? FORM_TAG[entry.form] : null;
      if (tag) g += " · " + tag;
      return g;
    },
    particleId(entry) {
      return entry && entry.kind === "grammar" && entry.pos === "particle" ? PARTICLE_ID[entry.s] || null : null;
    },
    ROLE,
    FORM_TAG,

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
          // Hearsay そうです needs a plain form in front: 元気そうです is 元気そう + です.
          const misplaced = o.entry && o.entry.after === "plain" && !isPlain(cur.tok);
          const c = { u: cur.u + (o.unknown ? 1 : 0), m: cur.m + (o.mismatch || misplaced ? 1 : 0), w: cur.w + o.w, tok: o, prev: cur };
          if (!best[o.end] || better(c, best[o.end])) best[o.end] = c;
        }
      }
      const out = [];
      for (let c = best[n]; c && c.tok; c = c.prev) out.unshift(c.tok);
      return out;
    },

    /* Splits plain text (no furigana markup, e.g. pasted from elsewhere) into
       words. Matches both written forms and kana readings, so わたしは finds
       私 + は. Fewest unknown characters wins, then fewest words. Returns
       [{ text, entry, unknown, punct }]. */
    readPlain(text) {
      if (!this.readIndex) {
        this.readIndex = new Map();
        this.maxRead = 1;
        for (const e of this.byKey.values()) {
          if (!e.r || e.r === e.s) continue;
          const list = this.readIndex.get(e.r) || [];
          list.push(e);
          this.readIndex.set(e.r, list);
          if (e.r.length > this.maxRead) this.maxRead = e.r.length;
        }
      }
      const chars = Array.from(String(text));
      const n = chars.length;
      const best = new Array(n + 1).fill(null);
      best[0] = { u: 0, t: 0, prev: null, tok: null };
      const better = (x, y) => !y || x.u < y.u || (x.u === y.u && x.t < y.t);
      const maxLen = Math.max(this.maxLen, this.maxRead);
      for (let i = 0; i < n; i++) {
        const cur = best[i];
        if (!cur) continue;
        const ch = chars[i];
        const push = (end, tok, u, t) => {
          const c = { u: cur.u + u, t: cur.t + t, prev: cur, tok: Object.assign({ start: i, end }, tok) };
          if (better(c, best[end])) best[end] = c;
        };
        if (/\s/.test(ch) || PUNCT.test(ch)) {
          push(i + 1, { punct: true }, 0, 0);
          continue;
        }
        if (/[0-9０-９]/.test(ch)) {
          let j = i;
          while (j < n && /[0-9０-９,，]/.test(chars[j])) j++;
          push(j, { number: true }, 0, 1);
          continue;
        }
        if (/[A-Za-z]/.test(ch)) {
          let j = i;
          while (j < n && /[A-Za-z'\-]/.test(chars[j])) j++;
          push(j, { foreign: true }, 0, 1);
          continue;
        }
        push(i + 1, { unknown: true }, 1, 1);
        let s = "";
        for (let j = i; j < n && j - i < maxLen; j++) {
          s += chars[j];
          const byForm = this.index.get(s);
          const byRead = this.readIndex.get(s);
          if (!byForm && !byRead) continue;
          // Sentence-initial words (でも, そうです "that's right") only after a break.
          let forms = byForm;
          if (forms && i > 0 && !(PUNCT.test(chars[i - 1]) || /\s/.test(chars[i - 1]))) forms = forms.filter((c) => !c.start);
          if (forms && !forms.length) forms = null;
          if (!forms && !byRead) continue;
          const entry = this.choose(forms || byRead);
          push(j + 1, { entry, byReading: !forms }, 0, entry.after === "plain" && !isPlain(cur.tok) ? 3 : 1);
        }
      }
      const out = [];
      for (let c = best[n]; c && c.tok; c = c.prev) out.unshift(Object.assign({ text: chars.slice(c.tok.start, c.tok.end).join("") }, c.tok));
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
