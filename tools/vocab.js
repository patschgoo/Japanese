#!/usr/bin/env node
/* Lists what a learner knows by a given unit, for writing new content:
     node tools/vocab.js 20            words, grammar words and forms up to unit 20
     node tools/vocab.js 20 --find 料理  only entries whose word, reading or meaning matches */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const upTo = Number(args.find((a) => /^\d+$/.test(a)) || 999);
const fi = args.indexOf("--find");
const find = fi >= 0 ? args[fi + 1] : null;

const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
const run = (rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), ctx, { filename: rel });
for (const f of ["util", "kana", "furigana", "conjugate", "numbers", "course", "lexicon"]) run("js/core/" + f + ".js");
for (const f of fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/js\/data\/[\w.-]+\.js/g)) run(f);
const NI = ctx.NI;
NI.lex.build();

const match = (...xs) => !find || xs.some((x) => String(x || "").includes(find));
console.log("Words up to unit " + upTo + " (unit · word · reading · pos · meaning):");
for (const w of NI.course.words) {
  if (w.unit > upTo || !match(w.w, w.r, w.en)) continue;
  console.log("  " + String(w.unit).padStart(2) + " · " + w.w + " · " + w.r + " · " + w.pos + " · " + w.en);
}
console.log("\nGrammar words up to unit " + upTo + ":");
for (const g of NI.data.grammar) if (g.u <= upTo && match(g.s, g.en)) console.log("  " + String(g.u).padStart(2) + " · " + NI.furi.base(g.s) + " · " + g.kind + " · " + g.en);
if (!find) {
  console.log("\nForms and the unit that teaches them:");
  for (const [table, forms] of Object.entries(NI.lex.FORM_UNIT)) {
    const known = Object.entries(forms).filter(([, u]) => u <= upTo).map(([f, u]) => f + "(" + u + ")");
    console.log("  " + table + ": " + known.join(", "));
  }
  console.log("\nNames (always allowed): " + NI.data.names.map((n) => NI.furi.base(n.j)).join("、"));
}
