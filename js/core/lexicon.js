/* Lexicon and word segmenter.
   Every course word (plus all of its conjugated forms), every grammar word and
   every name is indexed by its written surface, and so is the Japanese the
   site shows outside the lessons (kind "extra": glossed, never taught). Sentences are split by
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
      chau: 26, chatta: 26,
    },
    "adj-i": { neg: 10, kuarimasen: 10, te: 10, adv: 15, past: 18, pastneg: 18, kuarimasendeshita: 18, tara: 23, sou: 27, souna: 27, ba: 28 },
    "adj-na": { na: 10, de: 10, janai: 10, ni: 15, da: 16, datta: 16, janakatta: 18, tara: 23, sou: 27, souna: 27, nara: 28 },
  };

  // Word-by-word glosses: a short meaning, plus what a form adds (飲みました → "drink · past").
  const ROLE = {
    は: "topic", が: "subject", を: "object", に: "to / at", で: "at / by", へ: "towards", と: "and / with", も: "also",
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
    datta: "was", janai: "not", janakatta: "not · past", nara: "if", chau: "end up", chatta: "went and",
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
  const KIND_RANK = { word: 0, form: 1, grammar: 2, name: 3, extra: 4 };
  // Romaji for particles as they're said: は is wa, へ is e, を is o.
  const FUNC = { は: "wa", へ: "e", を: "o", では: "dewa", には: "niwa", とは: "towa" };
  /* Where a set phrase breaks into words: a polite ending or a particle at the
     end (ohayō gozaimasu, sō desu ka), or a word at the start (ja arimasen).
     Each rule is (start)(end); both parts are split again. */
  const PHRASE = [
    /^(.+(?:です|でした|でしょう|ます|ました|ません|ましょう))([かねよが])$/,
    /^(.{2,}|ん|で)(です|でした|でしょう)$/,
    /^(.{2,}|で)(ございます|ございました|ございません)$/,
    /^(.{2,})(なさい|ください)$/,
    /^(.{2,})(します|しました|しません|しましょう)$/,
    /^(じゃ)(あり.+)$/,
    /^(じゃあ)(.+)$/,
    /^(じゃ)([^あ].*)$/,
    /^(では)(あ.+)$/,
    /^(から)(き.+)$/,
    /^(かも)(しれ.+)$/,
    /^(どう)((?:いた|し).+)$/,
    /^(また)(.{2,})$/,
    /^(よろしく)(お.+)$/,
    /^(だ)(そう)$/,
    /^(な)(ので)$/,
    /^(まで)(に)$/,
    /^(に)(よると)$/,
    /^(よる)(と)$/,
    /^(どの)(ぐらい|くらい)$/,
    /^(.{3,})(もの)$/,
    /^(.{2,})(なし)$/,
    /^(.{2,})([でに])$/,
  ];
  function phrase(s) {
    for (const re of PHRASE) {
      const m = re.exec(s);
      if (m) return phrase(m[1]).concat(phrase(m[2]));
    }
    return [s];
  }
  // Honorifics join the name with a hyphen: Tanaka-san.
  const SUFFIX = new Set(["さん", "さま", "様", "ちゃん", "くん"]);
  // Countries are capitalised in romaji too (Nihon, Igirisu); filled in build().
  const PROPER = new Set(["日本"]);
  const PUNCT_RO = { "、": ",", "。": ".", "？": "?", "！": "!", "・": " ", "〜": "~", "「": "“", "」": "”", "…": "…", "（": "(", "）": ")" };

  /* Words in romaji joined into a line: spaces between words, none before
     punctuation or a hyphenated honorific, and a capital to start a sentence. */
  function joinRomaji(items) {
    let out = "";
    let prev = null;
    for (const t of items) {
      let w = t.punct ? (PUNCT_RO[t.text] != null ? PUNCT_RO[t.text] : t.w) : t.w;
      // 先生 after a name is a title (Tanaka-sensei), and a counter joins its number (9-ji).
      if (t.entry && t.entry.s === "先生" && prev && prev.kind === "name") w = "-" + w;
      if (t.entry && t.entry.pos === "ctr" && prev && prev.kind === "number" && w) w = "-" + w;
      prev = t.punct ? null : t.entry || null;
      if (w == null || w === "" || /^\s+$/.test(t.text || "")) {
        if (out && !/ $/.test(out)) out += " ";
        continue;
      }
      if (t.punct && /^[“(]$/.test(w)) out += (out && !/ $/.test(out) ? " " : "") + w;
      else if (t.punct) out = out.replace(/ $/, "") + w + (/[,.?!”)…]$/.test(w) ? " " : "");
      else out += (out && !/[ “(]$/.test(out) && !w.startsWith("-") ? " " : "") + w;
    }
    out = out.trim().replace(/ {2,}/g, " ").replace(/([.?!] )(\S)/g, (m, a, b) => a + b.toUpperCase());
    return /[.?!]$/.test(out) ? out.replace(/^([“(]?)(\S)/, (m, a, b) => a + b.toUpperCase()) : out;
  }
  // Na-adjective forms written as two words: shizuka na, shizuka ja nai.
  const NA_APART = /^(na|ni|de|da|datta|janai|janakatta|nara|tara)$/;
  const KANA = /[ぁ-ゖァ-ヺ]/;
  // Symbols in plain text that are never part of a word: い-adjective, です/ます, 飲む → 飲まない.
  const SYMBOL = /[\-\/+=→←↔*&%#|"“”‘’[\]{}<>]/;

  /* Japanese the site shows outside the lessons, with what it means: the
     glossary (js/data/glossary.js) plus the line names, review stages,
     level titles, fortunes, loanwords and self-introduction words kept
     elsewhere, and numbers read with counters (いっぽん is 1本). */
  function extras() {
    const D = NI.data || {};
    const out = (D.glossary || []).slice();
    const add = (j, en, more) => out.push(Object.assign({ j, en, pos: "n" }, more));
    // Line names are written like real ones in romaji: はじめ線 is Hajime-sen.
    const lineRo = (kana) => {
      const r = NI.kana.romaji(kana.replace(/せん$/, ""));
      return r.charAt(0).toUpperCase() + r.slice(1) + "-sen";
    };
    for (const l of D.lines || []) add(l.ja, l.en, { ro: lineRo(l.kana), parts: l.parts });
    if (NI.srs) for (const t of NI.srs.TIERS) add("{" + t.ja + "|" + t.kana + "}", t.en + " (a train; also a review stage here)", { parts: t.parts });
    if (NI.game && NI.game.TITLES) for (const t of NI.game.TITLES) add(t[1], t[2] + " (a level title)", { parts: t[3] });
    if (D.omikuji) for (const o of D.omikuji.levels) add(o[0], o[1] + " (an omikuji fortune)", { parts: o[4] });
    if (D.kana) for (const w of D.kana.LOANWORDS) add(w.k, w.en);
    if (D.builder) for (const w of D.builder.COUNTRIES.concat(D.builder.JOBS, D.builder.HOBBIES)) add(w.j, w.en);
    if (D.builder) for (const c of D.builder.COUNTRIES) PROPER.add(NI.furi.base(c.j));
    if (NI.num) {
      const N = NI.num;
      const what = (c) => {
        const e = (lex.index.get(c) || []).find((x) => x.pos === "ctr");
        return e ? shortMeaning(e.en) : c;
      };
      for (const c in N.COUNTER_FN) {
        const fn = N.COUNTERS[N.COUNTER_FN[c]];
        const top = c === "月" ? 12 : c === "時" ? 12 : 10;
        for (let n = 1; n <= top; n++) out.push({ s: n + c, r: fn(n), en: n + " · " + what(c), pos: "num" });
      }
      for (let n = 1; n <= 9; n++) for (const m of [100, 1000]) out.push({ s: String(n * m), r: N.toKana(n * m), en: String(n * m), pos: "num" });
    }
    return out;
  }

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
      for (const x of extras()) this.addExtra(x);
      this.readIndex = null;
      this.ready = true;
      return this;
    },

    // A glossary word, with its forms if it's a verb or adjective. The course's own entry wins.
    addExtra(x) {
      const F = NI.furi;
      const s = x.s || F.base(x.j);
      const r = x.r || F.reading(x.j);
      const key = "x:" + s;
      if (this.byKey.has(key) || (this.index.get(s) || []).some((e) => e.r === r)) return;
      this.add({ key, kind: "extra", unit: 0, s, r, j: x.j || s, en: x.en, pos: x.pos || "n", ro: x.ro, parts: x.parts });
      if (!NI.conj.isVerb(x.pos) && !NI.conj.isAdj(x.pos)) return;
      const forms = NI.conj.forms({ j: x.j, pos: x.pos });
      for (const f in forms) {
        const fs = F.base(forms[f]);
        if (fs === s || this.byKey.has(key + "#" + f)) continue;
        this.add({ key: key + "#" + f, kind: "extra", unit: 0, s: fs, r: F.reading(forms[f]), j: forms[f], en: x.en, pos: x.pos, form: f, base: x.j });
      }
    },

    get(key) {
      return this.byKey.get(key) || null;
    },

    /* An entry in romaji, as it's said: particles は へ を are wa, e, o (and so
       is the は that ends こんにちは), names are capitalised, honorifics hang on
       with a hyphen (-san), set phrases are split into their words (arigatō
       gozaimasu) and set names keep their own spelling (Hajime-sen). */
    romajiOf(e, reading) {
      const K = NI.kana;
      const rd = reading || (e && e.r) || "";
      if (!e) return K.romaji(rd);
      if (e.ro) return e.ro;
      if (e.kind === "grammar" && FUNC[rd]) return FUNC[rd];
      const words = this.romajiWords(e, rd);
      const verb = NI.conj.isVerb(e.pos) && (!e.form || e.form === "dict");
      let r = words
        .map((w, i) => {
          if (FUNC[w] && (words.length > 1 || e.kind === "grammar")) return FUNC[w];
          const one = K.romaji(w, { verb: verb && i === words.length - 1 });
          return /は$/.test(w) && (e.kind === "grammar" || /^(exp|int|conj)$/.test(e.pos)) ? one.replace(/ha$/, "wa") : one;
        })
        .join(" ")
        .replace(/masendeshita$/, "masen deshita");
      if (e.kind === "name" || PROPER.has(e.s)) r = r.charAt(0).toUpperCase() + r.slice(1);
      if (SUFFIX.has(e.s) || e.pos === "suffix") r = "-" + r;
      return r;
    },

    // The words an entry is written as in romaji: お願いします is onegai shimasu.
    romajiWords(e, rd) {
      const base = e.kind === "form" && e.id ? this.byKey.get(e.id) : null;
      let words = [rd];
      // する verbs are a noun and する: benkyō suru, benkyō shimasu.
      const br = (base || e).r || "";
      if (e.pos === "vs" && br.length > 2 && /する$/.test(br) && rd.startsWith(br.slice(0, -2)) && rd.length > br.length - 2) words = [br.slice(0, -2), rd.slice(br.length - 2)];
      // Na-adjectives stand apart from what follows: shizuka na, shizuka ja nai.
      else if (e.pos === "adj-na" && base && NA_APART.test(e.form) && rd.startsWith(base.r) && rd.length > base.r.length) {
        const rest = rd.slice(base.r.length);
        words = [base.r].concat(phrase(rest));
      } else if (e.kind !== "form" && (/^(exp|int)$/.test(e.pos) || (e.kind === "grammar" && /^(copula|ending|expression|question|particle)$/.test(e.pos)))) {
        words = phrase(rd);
      }
      // Endings that are words of their own: tabete imasu, tabete kudasai, takaku arimasen.
      if (e.kind === "form") {
        const last = words.pop();
        const f = e.form;
        let m;
        if (/^tei/.test(f) && (m = /^(.*[てで])(い.*)$/.exec(last))) words.push(m[1], m[2]);
        else if (f === "tekudasai" && /ください$/.test(last)) words.push(last.slice(0, -4), "ください");
        else if ((f === "temo" || f === "tewa") && last.length > 2) words.push(last.slice(0, -1), last.slice(-1));
        else if (f === "stemni" && last.length > 1) words.push(last.slice(0, -1), "に");
        else if (f === "souna" && last.length > 2) words.push(last.slice(0, -1), "な");
        else if (/^kuarimasen/.test(f) && (m = /^(.*く)(ありません.*)$/.exec(last))) words.push(m[1], m[2]);
        else words.push(last);
      }
      return words.filter(Boolean);
    },

    // Romaji for a phrase or sentence in plain text: one word at a time, as above.
    romajiText(text, reading) {
      return joinRomaji(
        this.readPlain(reading || text).map((t) => ({
          text: t.text,
          punct: t.punct,
          entry: t.entry,
          w: t.punct ? null : t.number ? t.text : t.entry ? this.romajiOf(t.entry, t.byReading ? t.text : null) : NI.kana.romaji(t.text),
        }))
      );
    },

    // The same for course markup, reading its furigana: {何|なん}ですか is nan desu ka.
    romajiMarkup(markup) {
      const F = NI.furi;
      return joinRomaji(
        this.tokens(markup).map((t) => {
          const text = F.baseOfAtoms(t.atoms);
          const rd = F.readingOfAtoms(t.atoms);
          const e = t.entry;
          if (!e || e.kind === "punct") return { text, punct: !e || /^[\s、。？！・〜「」…（）]+$/.test(text), w: e ? null : NI.kana.romaji(rd) };
          return { text, entry: e, w: e.kind === "number" ? text : this.romajiOf(e, rd) };
        })
      );
    },

    // Short English label for an entry, for word-by-word reading aids.
    gloss(entry) {
      if (!entry) return "";
      if (entry.kind === "number") return entry.s;
      if (entry.kind === "grammar") return ROLE[entry.s] || shortMeaning(entry.en);
      if (entry.kind === "name") return shortMeaning(entry.en);
      let g = shortMeaning(entry.en);
      const tag = entry.kind === "form" || entry.kind === "extra" ? FORM_TAG[entry.form] : null;
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

    // Kana readings to entries (わたし → 私), built on first use.
    readIdx() {
      if (this.readIndex) return this.readIndex;
      const K = NI.kana;
      this.readIndex = new Map();
      this.maxRead = 1;
      for (const e of this.byKey.values()) {
        // Other readings count too (七 しち), and katakana words in hiragana (ごみ for ゴミ).
        const reads = new Set([e.r].concat(e.rs || []));
        if (K.hasKatakana(e.s)) reads.add(K.toHiragana(e.s));
        for (const r of reads) {
          if (!r || r === e.s) continue;
          const list = this.readIndex.get(r) || [];
          if (list.indexOf(e) < 0) list.push(e);
          this.readIndex.set(r, list);
          if (r.length > this.maxRead) this.maxRead = r.length;
        }
      }
      return this.readIndex;
    },

    /* Splits plain text (no furigana markup, e.g. pasted from elsewhere) into
       words. Matches both written forms and kana readings, so わたしは finds
       私 + は. Fewest unknown characters wins, then fewest words. Returns
       [{ text, entry, unknown, punct }]. */
    readPlain(text) {
      const K = NI.kana;
      this.readIdx();
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
        // ー after kana lengthens it (コーヒー): part of the word, not punctuation.
        if (/\s/.test(ch) || SYMBOL.test(ch) || (PUNCT.test(ch) && !(ch === "ー" && i > 0 && KANA.test(chars[i - 1])))) {
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
          // Katakana words are found in hiragana too (ダメ for だめ), but not single letters (ノ isn't の).
          const hira = j > i && K.hasKatakana(s) ? K.toHiragana(s) : null;
          const byForm = this.index.get(s) || (hira && this.index.get(hira));
          let byRead = this.readIndex.get(s) || (hira && this.readIndex.get(hira));
          // A lone kana inside a kana word isn't a kanji's reading: はじめ is not は + 時 + 目.
          if (byRead && j === i && KANA.test(ch) && (KANA.test(chars[i - 1] || "") || KANA.test(chars[i + 1] || ""))) byRead = null;
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

    /* What a speech recogniser heard, as hiragana: known words give their
       reading (私 → わたし), digits their number reading, kana stays. */
    kanaOf(text) {
      let out = "";
      for (const t of this.readPlain(String(text).normalize ? String(text).normalize("NFKC") : String(text))) {
        if (t.punct) continue;
        if (t.number) out += NI.num.toKana(Number(t.text.replace(/[,，]/g, "")));
        else if (t.entry && NI.kana.hasKanji(t.text)) out += t.entry.r;
        else out += t.text;
      }
      return NI.kana.fold(out);
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
