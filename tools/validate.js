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
const CORE = ["util", "kana", "furigana", "conjugate", "numbers", "course", "lexicon", "srs", "items"];

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
const warnings = [];
const err = (where, msg) => errors.push(where + ": " + msg);
const warn = (where, msg) => warnings.push(where + ": " + msg);

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
    ["ある", "v5r-i", { nai: "ない", nakatta: "なかった", masu: "あります" }],
  ];
  for (const [j, pos, want] of table) for (const f in want) eq(j + " " + f, form(j, pos, f), want[f]);
  eq("来る nai reading", reading("{来|く}る", "vk", "nai"), "こない");
  eq("来る te reading", reading("{来|く}る", "vk", "te"), "きて");
  eq("いい neg", F.base(NI.conj.forms({ j: "いい", pos: "adj-ix" }).neg), "よくない");
  eq("高い past", F.base(NI.conj.forms({ j: "{高|たか}い", pos: "adj-i" }).past), "高かった");
  eq("静か na", F.base(NI.conj.forms({ j: "{静|しず}か", pos: "adj-na" }).na), "静かな");

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

const COUNTER_FN = { 円: "yen", 時: "ji", 分: "fun", 人: "nin", 歳: "sai", 番線: "bansen" };

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

function main() {
  const NI = loadContext();
  engineTests(NI);
  NI.course.init();
  NI.lex.build();
  builderTests(NI);
  lessonTests(NI);
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

  for (const ph of NI.data.phrases || []) {
    for (const p of ph.items) {
      if (!p.en) err("phrase " + p.jp, "missing translation");
      checkText(NI, p.jp, 0, "phrase “" + NI.furi.base(p.jp) + "”", { allowUnknown: true, ignoreOrder: true });
    }
  }

  const fmt = (list) => list.map((l) => "  - " + l).join("\n");
  if (warnings.length) console.log("Warnings (" + warnings.length + "):\n" + fmt(warnings));
  if (errors.length) {
    console.log("Errors (" + errors.length + "):\n" + fmt(errors));
    process.exitCode = 1;
  } else {
    console.log("OK: " + C.units.length + " units, " + nWords + " words, " + nSent + " sentences checked.");
  }
}

main();
