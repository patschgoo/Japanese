#!/usr/bin/env node
/* Content checks and engine tests for Nihongo Ippo. Run: node tools/validate.js
   - every Japanese text segments into known words (no unknown tokens)
   - furigana agrees with the dictionary reading of each word
   - nothing is used before the unit that teaches it (i+1 ordering)
   - digit furigana matches the number reading (incl. counters: 3時 さんじ)
   - particle-blank targets exist, ids are unique, data is well-formed
   - conjugation, number and romaji-input engines give known answers */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const CORE = ["util", "kana", "furigana", "conjugate", "numbers", "course", "lexicon", "srs", "items", "game", "maker"];

function loadContext() {
  const ctx = { console, setTimeout, clearTimeout };
  ctx.window = ctx;
  vm.createContext(ctx);
  const run = (rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), ctx, { filename: rel });
  for (const f of CORE) run("js/core/" + f + ".js");
  ctx.NI.store = { settings: { furigana: "furigana", kataHelp: true, gaps: true, autoplay: false }, item: () => null };
  ctx.NI.speech = { supported: false, canListen: false };
  // Load data files in the order index.html lists them.
  const indexPath = path.join(ROOT, "index.html");
  const order = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8").match(/js\/data\/[\w.-]+\.js/g) || [] : [];
  const files = order.length ? order : fs.readdirSync(path.join(ROOT, "js/data")).sort().map((f) => "js/data/" + f);
  for (const f of files) run(f);
  for (const f of ["ui", "views", "exercises"]) run("js/ui/" + f + ".js");
  return ctx.NI;
}

const errors = [];
const err = (where, msg) => errors.push(where + ": " + msg);

function engineTests(NI) {
  const eq = (name, got, want) => {
    if (got !== want) err("engine", name + " → " + JSON.stringify(got) + ", expected " + JSON.stringify(want));
  };
  const F = NI.furi;
  const form = (j, pos, f) => F.base(NI.conj.forms({ j, pos })[f]);
  const reading = (j, pos, f) => F.reading(NI.conj.forms({ j, pos })[f]);
  const table = [
    ["{飲|の}む", "v5", { masu: "飲みます", te: "飲んで", ta: "飲んだ", nai: "飲まない", vol: "飲もう" }],
    ["{書|か}く", "v5", { te: "書いて", nai: "書かない" }],
    ["{泳|およ}ぐ", "v5", { te: "泳いで", ta: "泳いだ" }],
    ["{話|はな}す", "v5", { te: "話して", masu: "話します" }],
    ["{待|ま}つ", "v5", { te: "待って", nai: "待たない" }],
    ["{遊|あそ}ぶ", "v5", { te: "遊んで" }],
    ["{買|か}う", "v5", { te: "買って", nai: "買わない" }],
    ["{帰|かえ}る", "v5", { te: "帰って", masu: "帰ります" }],
    ["{行|い}く", "v5k-s", { te: "行って", ta: "行った", masu: "行きます" }],
    ["{食|た}べる", "v1", { te: "食べて", nai: "食べない", masu: "食べます", tai: "食べたい" }],
    ["する", "vs", { te: "して", nai: "しない", masu: "します" }],
    ["{勉強|べんきょう}する", "vs", { te: "勉強して", teimasu: "勉強しています" }],
    ["ある", "v5r-i", { nai: "ない", nakatta: "なかった", masu: "あります", ba: "あれば", nakereba: "なければ" }],
    ["{飲|の}む", "v5", { pot: "飲める", potmasu: "飲めます", potnai: "飲めない", tara: "飲んだら", nagara: "飲みながら", ba: "飲めば", nakereba: "飲まなければ", nakute: "飲まなくて", nakattara: "飲まなかったら" }],
    ["{食|た}べる", "v1", { pot: "食べられる", potmasen: "食べられません", ba: "食べれば", tara: "食べたら", sou: "食べそう" }],
    ["{話|はな}す", "v5", { pot: "話せる", ba: "話せば" }],
    ["{待|ま}つ", "v5", { pot: "待てる" }],
    ["{泳|およ}ぐ", "v5", { pot: "泳げる", tara: "泳いだら" }],
    ["{遊|あそ}ぶ", "v5", { pot: "遊べる" }],
    ["{買|か}う", "v5", { pot: "買える", ba: "買えば", nakereba: "買わなければ" }],
    ["{行|い}く", "v5k-s", { pot: "行ける", tara: "行ったら", ba: "行けば" }],
    ["する", "vs", { ba: "すれば", tara: "したら", nakereba: "しなければ" }],
    ["{勉強|べんきょう}する", "vs", { pot: "勉強できる", potmasu: "勉強できます" }],
    ["いらっしゃる", "v5aru", { masu: "いらっしゃいます", te: "いらっしゃって", nai: "いらっしゃらない", ta: "いらっしゃった" }],
  ];
  for (const [j, pos, want] of table) for (const f in want) eq(j + " " + f, form(j, pos, f), want[f]);
  eq("来る nai reading", reading("{来|く}る", "vk", "nai"), "こない");
  eq("来る te reading", reading("{来|く}る", "vk", "te"), "きて");
  eq("来る pot reading", reading("{来|く}る", "vk", "pot"), "こられる");
  eq("来る ba reading", reading("{来|く}る", "vk", "ba"), "くれば");
  eq("来る tara reading", reading("{来|く}る", "vk", "tara"), "きたら");
  eq("する has no potential form (it is できる)", "pot" in NI.conj.forms({ j: "する", pos: "vs" }), false);
  eq("ある has no potential form", "pot" in NI.conj.forms({ j: "ある", pos: "v5r-i" }), false);
  eq("分かる has no potential form", "pot" in NI.conj.forms({ j: "{分|わ}かる", pos: "v5", noDrill: ["tai", "mashou"] }), false);
  const adj = (j, pos, f) => F.base(NI.conj.forms({ j, pos })[f]);
  eq("高い tara", adj("{高|たか}い", "adj-i", "tara"), "高かったら");
  eq("高い ba", adj("{高|たか}い", "adj-i", "ba"), "高ければ");
  eq("高い sou", adj("{高|たか}い", "adj-i", "sou"), "高そう");
  eq("いい sou", adj("いい", "adj-ix", "sou"), "よさそう");
  eq("いい ba", adj("いい", "adj-ix", "ba"), "よければ");
  eq("いい tara", adj("いい", "adj-ix", "tara"), "よかったら");
  eq("静か tara", adj("{静|しず}か", "adj-na", "tara"), "静かだったら");
  eq("静か nara", adj("{静|しず}か", "adj-na", "nara"), "静かなら");
  eq("静か souna", adj("{静|しず}か", "adj-na", "souna"), "静かそうな");
  eq("いい neg", F.base(NI.conj.forms({ j: "いい", pos: "adj-ix" }).neg), "よくない");
  eq("高い past", F.base(NI.conj.forms({ j: "{高|たか}い", pos: "adj-i" }).past), "高かった");
  eq("静か na", F.base(NI.conj.forms({ j: "{静|しず}か", pos: "adj-na" }).na), "静かな");
  const aru = { j: "ある", pos: "v5r-i", noDrill: ["tai"] };
  eq("noDrill skips ありたい", NI.conj.drillAnswers(aru, "tai"), null);
  eq("noDrill keeps other drills", NI.conj.drillAnswers(aru, "nai")[0], "ない");

  const N = NI.num;
  eq("300", N.toKana(300), "さんびゃく");
  eq("600", N.toKana(600), "ろっぴゃく");
  eq("800", N.toKana(800), "はっぴゃく");
  eq("3000", N.toKana(3000), "さんぜん");
  eq("8000", N.toKana(8000), "はっせん");
  eq("10000", N.toKana(10000), "いちまん");
  eq("4時", N.COUNTERS.ji(4), "よじ");
  eq("9時", N.COUNTERS.ji(9), "くじ");
  eq("1分", N.COUNTERS.fun(1), "いっぷん");
  eq("20分", N.COUNTERS.fun(20), "にじゅっぷん");
  eq("1人", N.COUNTERS.nin(1), "ひとり");
  eq("4人", N.COUNTERS.nin(4), "よにん");
  eq("8歳", N.COUNTERS.sai(8), "はっさい");
  eq("1本", N.COUNTERS.hon(1), "いっぽん");
  eq("3本", N.COUNTERS.hon(3), "さんぼん");
  eq("6本", N.COUNTERS.hon(6), "ろっぽん");
  eq("10本", N.COUNTERS.hon(10), "じゅっぽん");
  eq("4枚", N.COUNTERS.mai(4), "よんまい");
  eq("8冊", N.COUNTERS.satsu(8), "はっさつ");
  eq("3匹", N.COUNTERS.hiki(3), "さんびき");
  eq("1回", N.COUNTERS.kai(1), "いっかい");
  eq("3階", N.COUNTERS.floor(3), "さんがい");
  eq("4月", N.COUNTERS.gatsu(4), "しがつ");
  eq("7月", N.COUNTERS.gatsu(7), "しちがつ");
  eq("9月", N.COUNTERS.gatsu(9), "くがつ");
  eq("11月", N.COUNTERS.gatsu(11), "じゅういちがつ");

  const K = NI.kana;
  eq("ime konnichiha", K.romajiToHiragana("konnichiha", true), "こんにちは");
  eq("ime kitte", K.romajiToHiragana("kitte", true), "きって");
  eq("ime kantann", K.romajiToHiragana("kantann", true), "かんたん");
  eq("ime kin'youbi", K.romajiToHiragana("kin'youbi", true), "きんようび");
  eq("ime ko-hi-", K.romajiToHiragana("ko-hi-", true), "こーひー");
  eq("fold", K.fold("コーヒー"), K.fold("こおひい"));

  const S = NI.srs;
  const s1 = S.fresh(0);
  eq("srs fresh stage", s1.st, 1);
  eq("srs good", S.next(s1, 2, 0).st, 2);
  eq("srs easy", S.next(s1, 3, 0).st, 3);
  eq("srs again floor", S.next(s1, 0, 0).st, 1);
}

// Sentence builder: free order before the verb, modifiers stay attached.
function builderTests(NI) {
  const ok = (jp, order, want) => {
    const got = NI.exercises.builderAccepts({ jp }, order);
    if (got !== want) err("builder", NI.furi.base(jp) + " order " + order.join(",") + " → " + got + ", expected " + want);
  };
  ok("{毎朝|まいあさ} コーヒーを {飲|の}みます。", [0, 1, 2], true);
  ok("{毎朝|まいあさ} コーヒーを {飲|の}みます。", [1, 0, 2], true);
  ok("{毎朝|まいあさ} コーヒーを {飲|の}みます。", [2, 0, 1], false);
  ok("{机|つくえ}の {上|うえ}に {猫|ねこ}が います。", [2, 0, 1, 3], true);
  ok("{机|つくえ}の {上|うえ}に {猫|ねこ}が います。", [1, 0, 2, 3], false);
  ok("この おにぎりを {二|ふた}つ ください。", [1, 0, 2, 3], false);
  ok("{古|ふる}くて きれいな {町|まち}です。", [1, 0, 2], false);
  ok("はい、 {兄|あに}が {一人|ひとり} います。", [0, 1, 2, 3], true);
  ok("{富士山|ふじさん}に {登|のぼ}った ことが ありますか。", [1, 2, 0, 3], false);
  ok("{肉|にく}より {魚|さかな}の ほうが {好|す}きです。", [1, 2, 0, 3], true);
  ok("{肉|にく}より {魚|さかな}の ほうが {好|す}きです。", [1, 0, 2, 3], false);
}

// The Sentence Maker: every filler, style, tense, polarity and mood gives known, correctly read Japanese.
function makerTests(NI) {
  const D = NI.data.maker;
  let n = 0;
  const check = (sel) => {
    const r = NI.maker.build(sel);
    n++;
    if (!r || !r.jp || /undefined|null/.test(r.jp + r.en)) return err("maker", JSON.stringify(sel) + " built nothing");
    checkText(NI, r.jp, 0, "maker " + sel.pattern + " “" + NI.furi.base(r.jp) + "”", { ignoreOrder: true });
  };
  const variants = (base, moods) => {
    for (const style of ["polite", "plain"]) for (const tense of ["present", "past"]) for (const pol of ["aff", "neg"]) for (const mood of moods) check(Object.assign({ style, tense, pol, mood }, base));
  };
  const MOODS = NI.maker.MOODS.map((m) => m[0]);
  D.action.verb.forEach((v, vi) => v.obj.forEach((o, oi) => variants({ pattern: "action", verb: vi, obj: oi, time: (vi + oi) % D.action.time.length, place: (vi * 2 + oi) % D.action.place.length, who: oi % 2 === 0 }, MOODS)));
  D.go.verb.forEach((v, vi) => D.go.place.forEach((p, pi) => variants({ pattern: "go", verb: vi, place: pi, how: pi % D.go.how.length, with: (pi + vi) % D.go.with.length }, MOODS)));
  D.is.topic.forEach((t, ti) => D.is.noun.forEach((x, ni) => variants({ pattern: "is", topic: ti, noun: ni }, ["statement"])));
  D.adj.topic.forEach((t, ti) => D.adj.adj.forEach((x, ai) => variants({ pattern: "adj", topic: ti, adj: ai }, ["statement"])));
  D.exist.place.forEach((p, pi) => D.exist.thing.forEach((x, ti) => variants({ pattern: "exist", place: pi, thing: ti }, ["statement"])));
  D.like.thing.forEach((t, ti) => D.like.feel.forEach((x, fi) => variants({ pattern: "like", thing: ti, feel: fi, who: ti % 2 === 0 }, ["statement"])));
  return n;
}

// Every part of every unit builds a lesson whose exercises render.
function lessonTests(NI) {
  for (const u of NI.course.units) {
    for (const p of NI.course.parts(u)) {
      let L;
      try {
        L = NI.exercises.lesson(u, p.key, 42);
      } catch (e) {
        err("lesson " + u.n + "-" + p.key, e.message);
        continue;
      }
      if (!L.exercises.length) err("lesson " + u.n + "-" + p.key, "no exercises");
      for (const ex of L.exercises) {
        try {
          const h = ex.html();
          if (!h || /undefined|NaN/.test(h.replace(/data-[a-z]+="[^"]*"/g, ""))) err("lesson " + u.n + "-" + p.key, ex.type + " renders “undefined” or NaN");
        } catch (e) {
          err("lesson " + u.n + "-" + p.key, ex.type + ": " + e.message);
        }
      }
    }
  }
}

const COUNTER_FN = { 円: "yen", 時: "ji", 分: "fun", 人: "nin", 歳: "sai", 番線: "bansen", 本: "hon", 枚: "mai", 冊: "satsu", 匹: "hiki", 回: "kai", 階: "floor", 月: "gatsu" };

function checkText(NI, markup, unit, where, opts) {
  const o = opts || {};
  let tiles;
  try {
    tiles = NI.furi.parse(markup);
  } catch (e) {
    err(where, e.message);
    return [];
  }
  for (const t of tiles)
    for (const a of t) {
      if (a.r != null && !/^[ぁ-ゖァ-ーー]+$/.test(a.r)) err(where, "reading is not kana: {" + a.b + "|" + a.r + "}");
      if (a.r == null && NI.kana.isKanji(a.b)) err(where, "kanji without furigana: " + a.b + " in " + markup);
    }
  const toks = NI.lex.tokens(markup);
  toks.forEach((t, i) => {
    const text = NI.furi.baseOfAtoms(t.atoms);
    if (t.foreign) return;
    if (!t.entry) {
      if (!o.allowUnknown) err(where, "unknown word “" + text + "” in " + NI.furi.base(markup));
      return;
    }
    if (t.entry.kind === "punct") return;
    if (t.entry.kind === "number") {
      const n = Number(text.replace(/[,，]/g, ""));
      const next = toks[i + 1];
      const nextText = next && next.entry ? NI.furi.baseOfAtoms(next.atoms) : "";
      const fn = COUNTER_FN[nextText];
      const got = t.entry.r + (fn ? NI.furi.readingOfAtoms(next.atoms) : "");
      const want = fn ? NI.num.COUNTERS[fn](n) : NI.num.toKana(n);
      if (got !== want) err(where, "number reading " + text + nextText + " = " + got + ", expected " + want);
      return;
    }
    if (t.mismatch) err(where, "furigana " + t.reading + " doesn't match " + t.entry.s + " (" + t.entry.r + ")");
    if (!o.ignoreOrder && unit && t.entry.unit > unit) {
      err(where, "“" + text + "” is taught in unit " + t.entry.unit + (t.entry.form ? " (" + t.entry.form + ")" : "") + " but used in unit " + unit);
    }
  });
  return toks;
}

// Words that share a surface split by context: そうです "that's right" vs hearsay.
function segmentTests(NI) {
  const key = (markup, surface) => {
    const t = NI.lex.tokens(markup).find((x) => NI.furi.baseOfAtoms(x.atoms) === surface);
    return t && t.entry ? t.entry.key + (t.entry.form ? "@" + t.entry.form : "") : "(none)";
  };
  const eq = (name, got, want) => {
    if (got !== want) err("segmenter", name + " → " + got + ", expected " + want);
  };
  eq("はい、 そうです", key("はい、 そうです。", "そうです"), "v:そうです");
  eq("降るそうです (hearsay)", key("{雨|あめ}が {降|ふ}るそうです。", "そうです"), "g:そうです#hearsay");
  eq("寒いそうです (hearsay)", key("とても {寒|さむ}いそうです。", "そうです"), "g:そうです#hearsay");
  eq("元気そうです (looks)", key("{元気|げんき}そうです。", "元気そう"), "v:元気#sou@sou");
  eq("降りそうです (looks)", key("{雨|あめ}が {降|ふ}りそうです。", "降りそう"), "v:降る#sou@sou");
  const plain = (text, surface) => {
    const t = NI.lex.readPlain(text).find((x) => x.text === surface);
    return t && t.entry ? t.entry.key : "(none)";
  };
  eq("reader: 降るそうです", plain("明日は雨が降るそうです。", "そうです"), "g:そうです#hearsay");
  eq("reader: はい、そうです", plain("はい、そうです。", "そうです"), "v:そうです");
  eq("reader: 元気そうですね", plain("元気そうですね。", "元気そう"), "v:元気#sou");
  eq("no かわいそう for cute", String(NI.conj.forms({ j: "かわいい", pos: "adj-i" }).sou), "undefined");
}

// A picture belongs to one meaning (父 and お父さん may share: same person).
function emojiTests(NI) {
  const by = new Map();
  for (const w of NI.course.words) if (w.em) (by.get(w.em) || by.set(w.em, []).get(w.em)).push(w);
  const head = (en) => String(en).replace(/\(.*?\)/g, "").split(/[;,/]/)[0].trim().toLowerCase();
  for (const [em, ws] of by) if (new Set(ws.map((w) => head(w.en))).size > 1) err("emoji", em + " is used by " + ws.map((w) => w.w + " (" + w.en + ")").join(", "));
}

function main() {
  const NI = loadContext();
  engineTests(NI);
  NI.course.init();
  NI.lex.build();
  segmentTests(NI);
  emojiTests(NI);
  builderTests(NI);
  lessonTests(NI);
  const nMade = makerTests(NI);
  const C = NI.course;
  const posOk = new Set(Object.keys(C.POS_LABEL));
  const seenId = new Map();
  let nWords = 0;
  let nSent = 0;

  for (const u of C.units) {
    const U = "unit " + u.n;
    for (const k of ["ja", "en", "goal"]) if (!u[k]) err(U, "missing " + k);
    if (!C.lineOf(u.n)) err(U, "not on any line");
    for (const w of u.words) {
      nWords++;
      const W = U + " word " + w.w;
      if (!posOk.has(w.pos)) err(W, "unknown pos " + w.pos);
      if (!w.en) err(W, "missing meaning");
      if (seenId.has(w.id)) err(W, "duplicate of unit " + seenId.get(w.id));
      seenId.set(w.id, u.n);
      if (NI.conj.isVerb(w.pos) || NI.conj.isAdj(w.pos)) {
        try {
          NI.conj.forms(w);
        } catch (e) {
          err(W, e.message);
        }
      }
      checkText(NI, w.j, u.n, W, { ignoreOrder: true });
    }
    for (const s of u.sentences) {
      nSent++;
      const S = U + " sentence “" + NI.furi.base(s.jp) + "”";
      if (!s.en) err(S, "missing translation");
      const toks = checkText(NI, s.jp, u.n, S);
      for (const p of [].concat(s.p || [])) {
        if (!toks.some((t) => t.entry && t.entry.kind === "grammar" && t.entry.s === p)) err(S, "particle target " + p + " not found");
      }
      for (const a of s.alt || []) if (!s.p || [].concat(s.p).includes(a)) err(S, "alt particle " + a + " needs a different p");
    }
    (u.grammar || []).forEach((g, gi) => {
      const G = U + " grammar " + (gi + 1);
      if (!g.t || !g.body) err(G, "missing title or body");
      for (const ex of g.ex || []) checkText(NI, ex[0], u.n, G + " example “" + NI.furi.base(ex[0]) + "”");
      const inline = (g.body.match(/\[\[(.+?)\]\]/g) || []).map((m) => m.slice(2, -2));
      for (const m of inline) checkText(NI, m, u.n, G + " inline", { allowUnknown: true, ignoreOrder: true });
    });
    for (const s of u.sit || []) {
      for (const m of [s.a].concat(s.o)) checkText(NI, m, u.n, U + " situation “" + s.q + "”");
      if (s.o.length < 2) err(U, "situation needs options");
    }
    if (u.dialogue) {
      const d = u.dialogue;
      for (const l of d.lines) {
        if (l.who === "*") continue;
        if (!d.cast[l.who]) err(U, "dialogue speaker " + l.who + " not in cast");
        if (!l.en) err(U, "dialogue line missing translation");
        checkText(NI, l.jp, u.n, U + " dialogue “" + NI.furi.base(l.jp) + "”");
      }
      for (const q of d.q || []) {
        for (const m of [q.a].concat(q.o)) if (/[぀-ヿ一-鿿]/.test(m)) checkText(NI, m, u.n, U + " question");
        if (new Set([q.a].concat(q.o)).size !== q.o.length + 1) err(U, "duplicate option in “" + q.q + "”");
      }
    }
  }

  for (const line of C.lines) for (const n of line.units) if (!C.unit(n)) err("line " + line.id, "lists unit " + n + ", which doesn't exist");
  for (const id of Object.keys(NI.data.emoji || {})) if (!C.get(id)) err("emoji", id + " is not a course word");

  const storyIds = new Set();
  let nStoryLines = 0;
  for (const st of C.stories) {
    const T = "story " + st.id;
    if (storyIds.has(st.id)) err(T, "duplicate id");
    storyIds.add(st.id);
    if (!st.title || !st.en) err(T, "missing title or English title");
    if (!C.unit(st.unit)) err(T, "unit " + st.unit + " doesn't exist");
    if (!C.lines.some((l) => l.id === st.line)) err(T, "unknown line " + st.line);
    checkText(NI, st.title, st.unit, T + " title");
    for (const l of st.lines) {
      nStoryLines++;
      if (!l.en) err(T, "line missing translation");
      checkText(NI, l.jp, st.unit, T + " “" + NI.furi.base(l.jp) + "”");
    }
    for (const q of st.q || []) {
      for (const m of [q.a].concat(q.o)) if (/[぀-ヿ一-鿿]/.test(m)) checkText(NI, m, st.unit, T + " question");
      if (new Set([q.a].concat(q.o)).size !== q.o.length + 1) err(T, "duplicate option in “" + q.q + "”");
    }
  }

  for (const ph of NI.data.phrases || []) {
    for (const p of ph.items) {
      if (!p.en) err("phrase " + p.jp, "missing translation");
      checkText(NI, p.jp, 0, "phrase “" + NI.furi.base(p.jp) + "”", { allowUnknown: true, ignoreOrder: true });
    }
  }

  const fmt = (list) => list.map((l) => "  - " + l).join("\n");
  if (errors.length) {
    console.log("Errors (" + errors.length + "):\n" + fmt(errors));
    process.exitCode = 1;
  } else {
    console.log("OK: " + C.units.length + " units, " + nWords + " words, " + nSent + " sentences, " + C.stories.length + " stories (" + nStoryLines + " lines), " + nMade + " Sentence Maker sentences checked.");
  }
}

main();
