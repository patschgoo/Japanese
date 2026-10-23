/* Kana practice: choose exactly which kana to work on, or let the trainer
   choose them as you improve; choose the kinds of question; then either
   train with no set end, moving up a stage whenever you're ready, or take a
   test with a score. The stages run from recognising a kana to writing it
   from memory. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const K = NI.kana;

  // ---------------------------------------------------------------------------
  // Readings in romaji, from the kana tables

  let ROMA = null;
  function table() {
    if (ROMA) return ROMA;
    const D = NI.data.kana;
    ROMA = new Map();
    for (const g of [D.ROWS, D.DAKUTEN, D.YOON]) for (const r of g) for (const c of r.cells) if (c) ROMA.set(c[0], c[1]);
    for (const r of D.EXTENDED) for (const c of r.cells) if (c) ROMA.set(K.toHiragana(c[0]), c[1]);
    const small = { ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o", ゃ: "ya", ゅ: "yu", ょ: "yo", ゎ: "wa" };
    for (const k in small) if (!ROMA.has(k)) ROMA.set(k, small[k]);
    ROMA.set("ぢ", "ji");
    ROMA.set("づ", "zu");
    return ROMA;
  }

  // Hepburn-style romaji: 東京 is written とうきょう → toukyou, コーヒー → koohii.
  function toRomaji(kana) {
    const T = table();
    const s = Array.from(K.toHiragana(kana));
    let out = "";
    let double = false;
    for (let i = 0; i < s.length; i++) {
      const two = s[i] + (s[i + 1] || "");
      let r = T.get(two);
      if (r) i++;
      else if (s[i] === "っ") {
        double = true;
        continue;
      } else if (s[i] === "ー") {
        out += out.slice(-1);
        continue;
      } else if (s[i] === "ん") r = /^[aiueoy]/.test(T.get(s[i + 1]) || "") ? "n'" : "n";
      else r = T.get(s[i]) || s[i];
      if (double) {
        out += r.startsWith("ch") ? "t" : r[0];
        double = false;
      }
      out += r;
    }
    return out;
  }

  // Kana that sound the same are the same answer: を/お, ぢ/じ, づ/ず.
  const sound = (kana) => K.fold(kana).replace(/を/g, "お").replace(/ぢ/g, "じ").replace(/づ/g, "ず");
  const norm = (text) => String(text).toLowerCase().replace(/[\s']/g, "");

  // Typed romaji, as kana to compare: m before b/p/m counts as ん (shimbun).
  function typedKana(text) {
    return sound(K.romajiToHiragana(norm(text).replace(/m(?=[bpm])/g, "n"), true));
  }

  /* Whether typed romaji reads as hira: by the keyboard's rules, or as the
     Hepburn spelling (ti, di, tu, du for ティ, ディ, トゥ, ドゥ; fyu, tsi…). */
  function accepts(text, hira) {
    const want = sound(hira);
    if (typedKana(text) === want) return true;
    if (norm(text).replace(/-/g, "") === toRomaji(hira).replace(/'/g, "")) return true;
    const hep = norm(text).replace(/([td])([iu])/g, (m, c, v) => c + (v === "i" ? "hi" : "wu"));
    return typedKana(hep) === want;
  }

  // Whether typed romaji is a whole kana already (so a wrong one can be marked at once).
  const whole = (text) => !!norm(text) && !/[a-z]/.test(K.romajiToHiragana(norm(text), false));

  // ---------------------------------------------------------------------------
  // What to practise: rows of the chart, look-alikes, and the ones you miss

  const HIRA_ALIKE = ["あお", "ぬめ", "ねれわ", "るろ", "はほま", "さちき", "いり", "うら"];
  const KATA_ALIKE = ["シツソンノ", "ウワフ", "クケタ", "ヌスメ", "コロユ", "アマ", "チテ", "ルレ"];
  const SMALL = /[ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]/;

  // A kana as a question: { k: "シ", h: "し", r: "shi", kata: true }.
  const unit = (k) => ({ k, h: K.toHiragana(k), r: toRomaji(k), kata: K.hasKatakana(k) });
  const inScript = (h, kata) => (kata ? K.toKatakana(h) : K.toHiragana(h));

  // A word split into kana units (きゃ is one); っ and ー come along for free.
  function units(word) {
    const out = [];
    for (const ch of word) {
      if (SMALL.test(ch) && out.length) out[out.length - 1] += ch;
      else if (!/[っッー]/.test(ch)) out.push(ch);
    }
    return out;
  }

  let GROUPS = null;
  function groups() {
    if (GROUPS) return GROUPS;
    const D = NI.data.kana;
    const cells = (r) => r.cells.filter(Boolean).map((c) => c[0]);
    const card = (script, id, list) => {
      const kana = list.map((k) => inScript(k, script === "kata"));
      return { id: script[0] + ":" + id, script, kana, rom: kana.map(toRomaji).join(" ") };
    };
    GROUPS = {};
    for (const script of ["hira", "kata"]) {
      const g = [
        { id: "basic", t: "Basic", d: "The 46 basic " + (script === "kata" ? "katakana" : "hiragana"), cards: D.ROWS.filter((r) => r.id !== "n").map((r) => card(script, r.id, r.id === "wa" ? cells(r).concat("ん") : cells(r))) },
        { id: "voiced", t: "Voiced and combined", d: "With ゛ and ゜, and with small ゃ ゅ ょ", cards: D.DAKUTEN.concat(D.YOON).map((r) => card(script, r.id, cells(r))) },
      ];
      if (script === "kata") g.push({ id: "extra", t: "Extra katakana", d: "Sounds from other languages: ファ, ティ, ヴ…", cards: D.EXTENDED.map((r) => ({ id: "k:" + r.id, script, kana: cells(r), rom: cells(r).map(toRomaji).join(" ") })) });
      g.push({ id: "alike", t: "Look-alikes", d: "Kana that are easy to mix up", cards: (script === "kata" ? KATA_ALIKE : HIRA_ALIKE).map((s, i) => card(script, "alike" + i, Array.from(s))) });
      GROUPS[script] = g;
    }
    return GROUPS;
  }
  const allCards = () => groups().hira.concat(groups().kata).flatMap((g) => g.cards);
  const cardById = (id) => allCards().find((c) => c.id === id);
  // The order new kana come in automatic mode: the chart, row by row.
  const autoOrder = (script) => groups()[script].filter((g) => g.id !== "alike").flatMap((g) => g.cards);

  // How well each kana is known, from the answers so far.
  const stat = (k) => NI.store.state.kana[k];
  const run = (k) => {
    const s = stat(k);
    if (!s) return 0;
    return s.length > 2 ? s[2] : s[1] ? 0 : Math.min(s[0], 3);
  };
  function level(k) {
    const s = stat(k);
    if (!s || s[0] + s[1] === 0) return "new";
    if (run(k) >= 3) return "known";
    return s[1] > 0 && run(k) === 0 ? "weak" : "learning";
  }
  // Share of a script's chart (basic, voiced, combined) known.
  function mastery(script) {
    const ks = groups()[script].filter((g) => g.id === "basic" || g.id === "voiced").flatMap((g) => g.cards.flatMap((c) => c.kana));
    return Math.round((ks.filter((k) => level(k) === "known").length / ks.length) * 100);
  }
  // The kana you miss most: wrong at least once and not yet put right.
  function missedOften() {
    return Object.keys(NI.store.state.kana)
      .filter((k) => level(k) === "weak" || (stat(k)[1] >= 2 && stat(k)[1] * 2 >= stat(k)[0]))
      .sort((a, b) => stat(b)[1] / (stat(b)[0] + 1) - stat(a)[1] / (stat(a)[0] + 1))
      .slice(0, 10);
  }

  // Words for the word stages, in one script, with what they mean.
  function wordList(kata) {
    const seen = new Set();
    const out = [];
    const add = (k, en) => {
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ k, en });
    };
    if (kata) {
      for (const w of NI.data.kana.LOANWORDS) add(w.k, w.en);
      for (const w of NI.course.words) if (/^[ァ-ヶー]+$/.test(NI.furi.base(w.head))) add(NI.furi.base(w.head), w.en);
    } else {
      for (const w of NI.course.words) {
        const n = Array.from(w.r).length;
        if (n >= 2 && n <= 6 && /^[ぁ-ゖー]+$/.test(w.r)) add(w.r, w.en);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Stages: the kinds of question, from recognising a kana to writing it

  const STAGES = [
    { id: "read", n: "Kana → sound", d: "See a kana, pick its sound" },
    { id: "find", n: "Sound → kana", d: "See a sound, pick its kana" },
    { id: "pairs", n: "Find the pairs", d: "Match sounds to their kana" },
    { id: "type", n: "Type the sound", d: "See a kana, type it in romaji" },
    { id: "word", n: "Type a word", d: "Read a whole word, type it in romaji" },
    { id: "line", n: "Read a line", d: "Type a row of kana, one after another" },
    { id: "listen", n: "Listen", d: "Hear a sound, pick its kana", voice: true },
    { id: "trace", n: "Trace", d: "Trace each stroke, in the right order", hand: true },
    { id: "draw", n: "Write from memory", d: "Write it yourself; every stroke is checked", hand: true },
  ];
  const usable = (s) => (!s.voice || NI.speech.canListen) && (!s.hand || !!NI.strokes);

  const PROMPT = {
    read: "Which sound is this?",
    find: "Which kana is this sound?",
    pairs: "Find the pairs",
    type: "Type its sound in romaji",
    word: "Read the word: type it in romaji",
    line: "Read the line: type each kana in turn",
    listen: "Which kana do you hear?",
    trace: "Trace it, stroke by stroke",
    draw: "Write it from memory",
  };
  const TIME = { read: 8, find: 8, listen: 10, type: 10, word: 20, line: 8, pairs: 45 };

  // Small icons for the quick settings, drawn like the others.
  const svg = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON = {
    lock: svg("M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13z"),
    off: svg("M6 6l12 12M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z"),
    timer: svg("M12 8.5V13l3 2M9.5 2.5h5M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"),
    sound: svg("M4 9.5h3.5L12 5v14l-4.5-4.5H4zM15.5 8.5a5 5 0 0 1 0 7"),
    prev: svg("M14.5 6l-6 6 6 6"),
    next: svg("M9.5 6l6 6-6 6"),
  };

  // ---------------------------------------------------------------------------
  // Settings, presets and the setup screen (a tab of the Kana trainer)

  const KEY = "kanaPractice";
  const defaults = () => ({
    pick: "auto",
    auto: NI.store.settings.kataHelp ? "kata" : "both",
    from: "",
    cards: ["h:a", "h:ka", "h:sa", "h:ta", "h:na"],
    stages: STAGES.filter(usable).map((s) => s.id),
    mode: "train",
    length: 20,
    kataAs: "hira",
    stage: "read",
    qs: { timer: false, auto: true, meanings: true, quiet: false, lock: false },
  });
  function config() {
    const saved = NI.store.state.intro[KEY] || {};
    const c = Object.assign(defaults(), saved);
    c.qs = Object.assign(defaults().qs, saved.qs || {});
    return c;
  }

  const hiraAll = () => groups().hira.filter((g) => g.id !== "alike").flatMap((g) => g.cards.map((c) => c.id));
  const PRESETS = {
    hira: { t: "Hiragana check", d: "20 questions on all of hiragana, about 2 minutes", set: { pick: "manual", cards: hiraAll(), stages: ["read", "type", "word"], mode: "test", length: 20 } },
    kata: { t: "Learn katakana", d: "Starts with ア イ ウ エ オ and adds a row when you're ready", set: { pick: "auto", auto: "kata", from: "", mode: "train" } },
    mixed: { t: "Kana test", d: "Hiragana and katakana, single kana and words", set: { pick: "manual", cards: hiraAll().concat(hiraAll().map((id) => "k" + id.slice(1))), stages: ["read", "find", "type", "word", "listen"], mode: "test", length: 20 } },
  };
  let pending = null; // a preset to show, from a link such as #kana-hira
  let active = null; // the session on screen, so leaving the page can end it

  // Fills the setup screen from a preset's name or with given settings.
  function preset(p) {
    const set = typeof p === "string" ? PRESETS[p] && PRESETS[p].set : p;
    if (!set) return;
    pending = Object.assign(config(), set);
    pending.stages = pending.stages.filter((id) => usable(STAGES.find((s) => s.id === id)));
  }

  function body() {
    const c = pending || config();
    pending = null;
    const radio = (name, v, cur, label, sub) =>
      '<label class="radio"><input type="radio" name="kp-' + name + '" value="' + v + '"' + (String(cur) === String(v) ? " checked" : "") + "><span><b>" + label + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span></label>";
    const chosen = new Set(c.cards);
    const cardHtml = (cd) =>
      '<label class="kp-card"><input type="checkbox" name="kp-card" value="' + esc(cd.id) + '"' + (chosen.has(cd.id) ? " checked" : "") + '><span><b>' + esc(cd.rom) + '</b><span lang="ja">' + esc(cd.kana.join(" ")) + "</span></span></label>";
    const head = (cls, title, sub, open) =>
      '<div class="kp-head ' + cls + '"><button class="kp-fold" type="button" aria-expanded="' + open + '">' + ICON.next.replace("<svg", '<svg class="kp-chev"') + "<span><b>" + title + "</b><small>" + sub + "</small></span></button>" +
      '<span class="kp-n"><span><span data-n>0</span> chosen</span><span class="kp-allnone"><button type="button" data-all>All</button> · <button type="button" data-none>None</button></span></span></div>';
    const script = (s) => {
      const name = s === "kata" ? "Katakana" : "Hiragana";
      const open = groups()[s].some((g) => g.cards.some((cd) => chosen.has(cd.id)));
      return (
        '<div class="kp-script" data-script="' + s + '">' + head("kp-top", name, '<span lang="ja">' + (s === "kata" ? "カタカナ" : "ひらがな") + "</span> · " + mastery(s) + "% known", open) +
        '<div class="kp-body"' + (open ? "" : " hidden") + ">" +
        groups()[s]
          .map((g, i) => '<div class="kp-group">' + head("", esc(g.t), esc(g.d), open && i === 0) + '<div class="kp-body kp-cards"' + (open && i === 0 ? "" : " hidden") + ">" + g.cards.map(cardHtml).join("") + "</div></div>")
          .join("") +
        "</div></div>"
      );
    };
    const often = missedOften();
    const autoRows = (s) => autoOrder(s).map((cd) => '<option value="' + esc(cd.id) + '"' + (c.from === cd.id ? " selected" : "") + ">" + esc(cd.kana.join(" ")) + "</option>").join("");
    const tests = NI.store.state.intro.kanaTests || [];
    return (
      "<p>Practise exactly the kana you choose, or let the trainer choose them as you improve. Each stage asks in a new way, from recognising a kana to writing it from memory.</p>" +
      '<div class="kp-quick"><b>Quick start</b>' + Object.keys(PRESETS).map((k) => '<button class="chip-btn" type="button" data-preset="' + k + '"><b>' + esc(PRESETS[k].t) + "</b><small>" + esc(PRESETS[k].d) + "</small></button>").join("") + "</div>" +
      '<div class="kp-setup">' +
      '<section class="kp-sec"><h2>1. Which kana?</h2>' +
      '<div class="kp-seg" role="radiogroup" aria-label="How to choose the kana">' +
      '<label><input type="radio" name="kp-pick" value="auto"' + (c.pick === "auto" ? " checked" : "") + "><span>Automatic</span></label>" +
      '<label><input type="radio" name="kp-pick" value="manual"' + (c.pick === "manual" ? " checked" : "") + "><span>Choose</span></label></div>" +
      '<div class="kp-auto"' + (c.pick === "auto" ? "" : " hidden") + ">" +
      "<p>Starts with a few kana and adds the next row as soon as you know them, a kana at a time: right three times in a row and it counts as known.</p>" +
      '<fieldset><legend>Script</legend><div class="seg-row">' + radio("auto", "hira", c.auto, "Hiragana") + radio("auto", "kata", c.auto, "Katakana") + radio("auto", "both", c.auto, "Both") + "</div></fieldset>" +
      '<label class="kp-from">Start from <select id="kp-from"><option value="">the first row you don’t know yet</option>' +
      '<optgroup label="Hiragana">' + autoRows("hira") + '</optgroup><optgroup label="Katakana">' + autoRows("kata") + "</optgroup></select></label>" +
      '<p class="small muted">Hiragana: ' + mastery("hira") + "% known · Katakana: " + mastery("kata") + "% known</p></div>" +
      '<div class="kp-manual"' + (c.pick === "manual" ? "" : " hidden") + ">" + script("hira") + script("kata") +
      (often.length
        ? '<label class="kp-card kp-often"><input type="checkbox" name="kp-card" value="often"' + (chosen.has("often") ? " checked" : "") + '><span><b>The ones you often miss</b><span lang="ja">' + esc(often.join(" ")) + "</span></span></label>"
        : "") +
      "</div></section>" +
      '<section class="kp-sec"><h2>2. Which stages?</h2><p class="small muted">Training moves up to the next stage once you get 9 of the last 10 right.</p><div class="kp-stages-pick">' +
      STAGES.map((s, i) =>
        '<label class="kp-card kp-stage' + (usable(s) ? "" : " off") + '"><input type="checkbox" name="kp-stage" value="' + s.id + '"' + (usable(s) && c.stages.indexOf(s.id) >= 0 ? " checked" : "") + (usable(s) ? "" : " disabled") + "><span><b>" + (i + 1) + " · " + esc(s.n) + "</b><span>" + esc(usable(s) ? s.d : "Needs a Japanese voice on this device") + "</span></span></label>"
      ).join("") +
      "</div>" +
      '<fieldset class="kp-kata-as"><legend>For katakana, show the sound as</legend><div class="seg-row">' + radio("kataAs", "hira", c.kataAs, 'hiragana (<i lang="ja">か</i>)') + radio("kataAs", "rom", c.kataAs, "romaji (ka)") + "</div></fieldset></section>" +
      '<section class="kp-sec"><h2>3. Train or test?</h2>' +
      radio("mode", "train", c.mode, "Train", "No set end: it moves up a stage whenever you’re ready. Stop any time.") +
      radio("mode", "test", c.mode, "Test", "A set number of questions from your stages, with a score at the end.") +
      '<fieldset class="kp-len"' + (c.mode === "test" ? "" : " hidden") + '><legend>Questions</legend><div class="seg-row">' + radio("length", 10, c.length, "10") + radio("length", 20, c.length, "20") + radio("length", 40, c.length, "40") + "</div></fieldset></section>" +
      (tests.length
        ? '<section class="kp-sec kp-past"><h2>Your recent tests</h2><ul>' + tests.slice(-5).reverse().map((t) => "<li><b>" + t.pct + "%</b> " + esc(t.what) + ' <span class="muted">· ' + esc(new Date(t.at).toLocaleDateString()) + "</span></li>").join("") + "</ul></section>"
        : "") +
      '<div class="kp-go"><span class="kp-sum small" aria-live="polite"></span><button class="btn primary" type="button" data-kp-start>Start ' + ICON.next + "</button></div>" +
      "</div>" +
      '<div class="kp-box session" hidden></div>'
    );
  }

  // Reads the setup screen into a config.
  function read(el) {
    const c = config();
    const val = (name) => {
      const x = el.querySelector('input[name="kp-' + name + '"]:checked');
      return x ? x.value : null;
    };
    c.pick = val("pick");
    c.auto = val("auto");
    c.from = el.querySelector("#kp-from").value;
    c.cards = Array.from(el.querySelectorAll('input[name="kp-card"]:checked')).map((x) => x.value);
    c.stages = Array.from(el.querySelectorAll('input[name="kp-stage"]:checked')).map((x) => x.value);
    c.mode = val("mode");
    c.length = Number(val("length"));
    c.kataAs = val("kataAs");
    return c;
  }

  // The kana a config asks about.
  function poolOf(c) {
    if (c.pick === "auto") return null;
    const ks = new Set();
    for (const id of c.cards) {
      if (id === "often") missedOften().forEach((k) => ks.add(k));
      else if (cardById(id)) cardById(id).kana.forEach((k) => ks.add(k));
    }
    return Array.from(ks);
  }

  function mount(el) {
    const start = el.querySelector("[data-kp-start]");
    if (!start) return;
    const setup = el.querySelector(".kp-setup");
    const quick = el.querySelector(".kp-quick");
    const box = el.querySelector(".kp-box");
    const intro = el.querySelector(".kana-body > p");
    const sum = el.querySelector(".kp-sum");

    const update = () => {
      const c = read(el);
      el.querySelector(".kp-auto").hidden = c.pick !== "auto";
      el.querySelector(".kp-manual").hidden = c.pick !== "manual";
      el.querySelector(".kp-len").hidden = c.mode !== "test";
      el.querySelectorAll(".kp-script, .kp-group").forEach((g) => {
        const n = g.querySelectorAll('input[name="kp-card"]:checked').length;
        const tot = g.querySelectorAll('input[name="kp-card"]').length;
        const span = g.querySelector("[data-n]");
        if (span) span.textContent = tot === n && n ? "All " + n : String(n);
      });
      const pool = poolOf(c);
      const kinds = U.plural(c.stages.length, "stage");
      sum.textContent = c.pick === "auto" ? "Automatic · " + kinds : U.plural(pool.length, "kana", "kana") + " · " + kinds;
      start.disabled = !c.stages.length || (pool && !pool.length);
    };
    el.querySelectorAll(".kp-fold").forEach((b) =>
      b.addEventListener("click", () => {
        const body = b.closest(".kp-head").nextElementSibling;
        const open = b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", String(open));
        body.hidden = !open;
      })
    );
    el.querySelectorAll("[data-all], [data-none]").forEach((b) =>
      b.addEventListener("click", () => {
        const scope = b.closest(".kp-group, .kp-script");
        scope.querySelectorAll('input[name="kp-card"]').forEach((x) => (x.checked = b.hasAttribute("data-all")));
        update();
      })
    );
    setup.addEventListener("change", update);
    update();

    const go = (c, save) => {
      if (save) NI.store.setIntro(KEY, c);
      setup.hidden = true;
      quick.hidden = true;
      if (intro) intro.hidden = true;
      box.hidden = false;
      session(box, c, () => {
        NI.session.setKeys(null);
        NI.app.render();
      });
      box.scrollIntoView({ block: "start" });
    };
    start.addEventListener("click", () => {
      const c = read(el);
      if (!c.stages.length) return ui.toast("Choose at least one stage.");
      if (c.pick === "manual" && !poolOf(c).length) return ui.toast("Choose at least one row of kana.");
      go(c, true);
    });
    el.querySelectorAll("[data-preset]").forEach((b) =>
      b.addEventListener("click", () => {
        const p = PRESETS[b.getAttribute("data-preset")];
        const c = Object.assign(config(), p.set, { save: false });
        c.stages = c.stages.filter((id) => usable(STAGES.find((s) => s.id === id)));
        go(c, false);
      })
    );
  }

  // ---------------------------------------------------------------------------
  // A practice session

  function session(box, cfg, back) {
    const quiet = () => cfg.qs.quiet;
    const voice = () => NI.speech.supported && !quiet();
    const sfx = (name) => !quiet() && NI.fx.play(name);
    let stages = STAGES.filter((s) => cfg.stages.indexOf(s.id) >= 0 && usable(s));
    let si = Math.max(0, stages.findIndex((s) => s.id === cfg.stage));
    const testing = cfg.mode === "test";

    // The kana in play. Automatic mode opens one more row at a time.
    let pool = [];
    let fresh = new Set(); // the newest row, asked more often
    const plans = [];
    const opened = []; // rows opened this session
    const intro = []; // rows to introduce before the next question
    function rebuild() {
      const ks = new Set();
      fresh = new Set();
      if (cfg.pick === "auto") {
        for (const p of plans) {
          p.list.slice(0, p.f + 1).forEach((cd) => cd.kana.forEach((k) => ks.add(k)));
          p.list[p.f].kana.forEach((k) => fresh.add(k));
        }
      } else (cfg.extra || poolOf(cfg)).forEach((k) => ks.add(k));
      pool = Array.from(ks).map(unit);
    }
    if (cfg.pick === "auto") {
      for (const s of cfg.auto === "both" ? ["hira", "kata"] : [cfg.auto]) {
        const list = autoOrder(s);
        let f = Math.max(0, list.findIndex((cd) => cd.id === cfg.from));
        if (!cfg.from || cfg.from[0] !== s[0]) f = 0;
        while (f < list.length - 1 && list[f].kana.every((k) => run(k) >= 2)) f++;
        plans.push({ list, f });
      }
    }
    rebuild();

    // Picking kana: shaky, new and newly added ones more often; tests go through them all.
    let recent = [];
    let deck = [];
    function weight(u) {
      const lv = level(u.k);
      let w = { new: 2.5, weak: 4, learning: 2, known: 0.7 }[lv];
      if (fresh.has(u.k)) w *= 3;
      if (recent.indexOf(u.k) >= 0) w *= 0.04;
      return w;
    }
    function pick(ok) {
      const cands = pool.filter((u) => !ok || ok(u));
      const from = cands.length ? cands : pool;
      let u;
      if (testing) {
        deck = deck.filter((x) => from.indexOf(x) >= 0);
        if (!deck.length) deck = U.shuffle(from.slice());
        u = deck.shift();
      } else {
        let r = Math.random() * from.reduce((a, b) => a + weight(b), 0);
        u = from[from.length - 1];
        for (const x of from) if ((r -= weight(x)) <= 0) {
          u = x;
          break;
        }
      }
      recent = [u.k].concat(recent).slice(0, Math.min(3, Math.max(0, pool.length - 2)));
      return u;
    }
    function pickMany(n, distinct) {
      const out = [];
      for (let t = 0; t < n * 6 && out.length < n; t++) {
        const u = pick();
        if (!out.some((o) => o.k === u.k || (distinct && distinct(o) === distinct(u)))) out.push(u);
      }
      return out;
    }
    const single = (u) => Array.from(u.k).length === 1 && NI.strokes.has(u.k);

    // How a sound is shown: hiragana for katakana if you like, romaji otherwise.
    const asHira = (u) => u.kata && cfg.kataAs === "hira";
    const soundText = (u) => (asHira(u) ? u.h : u.r);
    const soundHtml = (u) => (asHira(u) ? '<span lang="ja" class="kp-hira">' + esc(u.h) + "</span>" : esc(u.r));

    // Wrong options: look-alikes and neighbours first, from the kana in play if possible.
    function decoys(u, n, label) {
      const same = (k) => inScript(k, u.kata);
      const near = neighbours(u.h).map(same);
      const inPlay = U.shuffle(pool.filter((p) => p.kata === u.kata)).sort((a, b) => Math.abs(a.k.length - u.k.length) - Math.abs(b.k.length - u.k.length)).map((p) => p.k);
      const rest = U.shuffle(allCards().filter((cd) => cd.script === (u.kata ? "kata" : "hira")).flatMap((cd) => cd.kana)).filter((k) => k.length === u.k.length);
      const out = [];
      for (const k of near.filter((k) => inPlay.indexOf(k) >= 0).concat(inPlay, near, rest)) {
        if (out.length >= n) break;
        if (k === u.k || out.indexOf(k) >= 0 || label(k) === label(u.k) || out.some((o) => label(o) === label(k))) continue;
        out.push(k);
      }
      return out;
    }

    // Words made only of kana in play, if there are enough; else the closest.
    const wordsCache = {};
    function words(kata) {
      const key = kata + "|" + pool.length;
      if (wordsCache[key]) return wordsCache[key];
      const have = new Set(pool.map((u) => u.k));
      const scored = wordList(kata).map((w) => {
        const us = units(w.k);
        return Object.assign({ score: us.length ? us.filter((x) => have.has(x)).length / us.length : 0 }, w);
      });
      let list = scored.filter((w) => w.score === 1);
      if (list.length < 6) list = scored.filter((w) => w.score >= 0.6);
      if (list.length < 6) list = scored.sort((a, b) => b.score - a.score).slice(0, 30);
      return (wordsCache[key] = list);
    }

    // ---- the session screen
    const sub = testing ? "Test · " + U.plural(cfg.length, "question") : cfg.pick === "auto" ? "Training · new kana as you go" : "Training · " + U.plural(pool.length, "kana", "kana");
    box.innerHTML =
      NI.session.shell("Kana practice", esc(sub)) +
      '<nav class="kp-nav" aria-label="Stages"' + (testing ? " hidden" : "") + '><button class="icon-btn" type="button" data-kp-stage="-1" aria-label="Previous stage">' + ICON.prev + '</button><span class="kp-stage-name" aria-live="polite"></span><button class="icon-btn" type="button" data-kp-stage="1" aria-label="Next stage">' + ICON.next + "</button></nav>" +
      '<details class="kp-qs"><summary>' + ui.ICON.gear + "<span>Quick settings</span></summary><div class=\"kp-qs-grid\">" +
      (testing
        ? ""
        : '<button class="kp-qbtn" type="button" data-qs="lock" aria-pressed="false">' + ICON.lock + "<span>Stay on this stage</span></button>" +
          '<button class="kp-qbtn" type="button" data-qs="off">' + ICON.off + "<span>Turn this stage off</span></button>") +
      '<button class="kp-qbtn" type="button" data-qs="timer" aria-pressed="false">' + ICON.timer + "<span>Timer</span></button>" +
      '<button class="kp-qbtn" type="button" data-qs="quiet" aria-pressed="false">' + ICON.sound + "<span>Sounds</span></button></div>" +
      '<label class="check"><input type="checkbox" data-qs="auto"> Check typed answers without Enter</label>' +
      '<label class="check"><input type="checkbox" data-qs="meanings"> Show what words mean</label></details>';
    const card = box.querySelector(".sess-card");
    const foot = box.querySelector(".sess-foot");
    const bar = box.querySelector(".sess-bar");
    const count = box.querySelector(".sess-count");
    const xpEl = box.querySelector(".sess-xp");
    const nav = box.querySelector(".kp-nav");
    // Quick settings and stage controls sit after the card, before the answer bar.
    card.after(nav, box.querySelector(".kp-qs"));

    const tally = { right: 0, wrong: 0, asked: 0, qn: 0, row: 0, best: 0, ups: 0, missed: new Map() };
    let log = []; // this stage's answers, newest last
    let q = null; // the question on screen
    let ticking = null;
    let ended = false;

    const saveCfg = () => {
      const keep = { qs: cfg.qs };
      if (cfg.save !== false) Object.assign(keep, { stage: stages[si] ? stages[si].id : cfg.stage, stages: cfg.stages });
      NI.store.setIntro(KEY, Object.assign({}, NI.store.state.intro[KEY] || {}, keep));
    };

    // ---- recording answers
    function record(u, ok) {
      NI.store.kanaResult(u.k, ok);
      if (!ok) {
        const m = tally.missed.get(u.k) || { k: u.k, h: u.h, r: u.r, n: 0 };
        m.n++;
        tally.missed.set(u.k, m);
      }
    }
    function answer(ok) {
      tally.asked++;
      if (ok) {
        tally.right++;
        tally.row++;
        tally.best = Math.max(tally.best, tally.row);
      } else {
        tally.wrong++;
        tally.row = 0;
      }
      log.push(ok);
      xpEl.textContent = tally.right * NI.game.XP.gamePoint + " XP";
      xpEl.hidden = false;
      showCount();
      // Automatic mode: open the next row once the newest is known.
      for (const p of plans) {
        if (p.f < p.list.length - 1 && p.list[p.f].kana.every((k) => run(k) >= 2)) {
          p.f++;
          opened.push(p.list[p.f]);
          intro.push(p.list[p.f]);
          rebuild();
        }
      }
    }
    const result = (u, ok) => {
      record(u, ok);
      answer(ok);
    };
    function showCount() {
      if (testing) {
        count.textContent = Math.min(tally.qn + 1, cfg.length) + " / " + cfg.length;
        bar.innerHTML = ui.progressBar(tally.qn / cfg.length, "Test progress");
      } else {
        const last = log.slice(-10);
        const good = last.filter(Boolean).length;
        count.textContent = "✓ " + tally.right + " · ✗ " + tally.wrong;
        bar.innerHTML = ui.progressBar(Math.min(1, good / 9), "Towards the next stage: " + good + " of 9");
      }
    }

    // ---- the timer
    function timer(sec, onOut) {
      stopTimer();
      const t = card.querySelector(".kp-timer");
      if (!cfg.qs.timer || !sec || !t) return;
      t.hidden = false;
      const span = t.firstElementChild;
      span.style.transition = "none";
      span.style.transform = "scaleX(1)";
      void span.offsetWidth;
      span.style.transition = "transform " + sec + "s linear";
      span.style.transform = "scaleX(0)";
      ticking = setTimeout(() => {
        ticking = null;
        if (q && !q.over) onOut();
      }, sec * 1000);
    }
    function stopTimer() {
      if (ticking) clearTimeout(ticking);
      ticking = null;
      const t = card.querySelector(".kp-timer");
      if (t) t.hidden = true;
    }

    // Ends the current question: right ones move on by themselves.
    function end(ok, solution) {
      if (!q || q.over) return;
      q.over = true;
      stopTimer();
      tally.qn++;
      if (ok === true || ok === "auto") {
        const mine = q;
        setTimeout(() => q === mine && !ended && next(), ok === true ? 650 : 1000);
        return;
      }
      foot.innerHTML = NI.session.feedback(false, solution);
      foot.hidden = false;
      const b = foot.querySelector("[data-next]");
      b.addEventListener("click", next);
      setTimeout(() => b.focus({ preventScroll: true }), 0);
    }

    // ---- moving between stages
    function stageName() {
      const s = stages[si];
      box.querySelector(".kp-stage-name").innerHTML = "<b>Stage " + (STAGES.indexOf(s) + 1) + "</b> " + esc(s.n);
      const lock = box.querySelector('[data-qs="lock"]');
      if (lock) lock.setAttribute("aria-pressed", String(!!cfg.qs.lock));
    }
    function goStage(d, why) {
      si = (si + d + stages.length) % stages.length;
      log = [];
      saveCfg();
      stageName();
      if (why) ui.toast(why);
      ask();
    }
    nav.querySelectorAll("[data-kp-stage]").forEach((b) => b.addEventListener("click", () => goStage(Number(b.getAttribute("data-kp-stage")))));

    // ---- quick settings
    const qsEl = box.querySelector(".kp-qs");
    const pressed = () => {
      qsEl.querySelectorAll("button[data-qs]").forEach((b) => {
        const k = b.getAttribute("data-qs");
        if (k === "timer" || k === "lock") b.setAttribute("aria-pressed", String(!!cfg.qs[k]));
        if (k === "quiet") b.setAttribute("aria-pressed", String(!cfg.qs.quiet));
      });
      qsEl.querySelectorAll("input[data-qs]").forEach((x) => (x.checked = !!cfg.qs[x.getAttribute("data-qs")]));
    };
    qsEl.querySelectorAll("button[data-qs]").forEach((b) =>
      b.addEventListener("click", () => {
        const k = b.getAttribute("data-qs");
        if (k === "off") {
          if (stages.length < 2) return ui.toast("This is the only stage left.");
          const gone = stages[si];
          cfg.stages = cfg.stages.filter((id) => id !== gone.id);
          stages = stages.filter((s) => s !== gone);
          si = si % stages.length;
          return goStage(0, "Stage " + (STAGES.indexOf(gone) + 1) + " is off. Turn it back on before you start.");
        }
        cfg.qs[k] = !cfg.qs[k];
        pressed();
        saveCfg();
        if (k === "timer") (cfg.qs.timer ? ui.toast("Timer on: answer before the bar runs out.") : stopTimer());
      })
    );
    qsEl.querySelectorAll("input[data-qs]").forEach((x) =>
      x.addEventListener("change", () => {
        cfg.qs[x.getAttribute("data-qs")] = x.checked;
        saveCfg();
      })
    );
    pressed();

    // ---- asking
    function next() {
      if (ended) return;
      foot.hidden = true;
      if (testing && tally.qn >= cfg.length) return finish();
      // A new row of kana gets a short introduction.
      if (intro.length) return welcome(intro.shift());
      if (!testing && !cfg.qs.lock && stages.length > 1 && log.length >= 10 && log.slice(-10).filter(Boolean).length >= 9) {
        tally.ups++;
        sfx("level");
        return goStage(1, "Stage up! Now: " + stages[(si + 1) % stages.length].n);
      }
      ask();
    }

    function ask() {
      if (ended) return;
      stopTimer();
      foot.hidden = true;
      const st = testing ? U.pick(stages) : stages[si];
      q = MAKE[st.id]();
      q.stage = st.id;
      card.innerHTML =
        '<div class="ex kp-ex kp-s-' + st.id + '"><div class="kp-top-line"><p class="kicker">' + esc(q.kicker || PROMPT[st.id]) + "</p>" +
        (q.peek ? '<button class="icon-btn kp-peek" type="button" data-kp-peek aria-label="Show the answer" title="Show the answer (counts as a miss)">' + ui.ICON.eye + "</button>" : "") +
        "</div>" +
        '<div class="kp-timer" hidden><span></span></div>' + q.html + "</div>";
      const peek = card.querySelector("[data-kp-peek]");
      if (peek) peek.addEventListener("click", () => !q.over && q.peek());
      q.mount(card.querySelector(".kp-ex"));
      if (TIME[st.id] && st.id !== "line") timer(TIME[st.id], () => q.peek(true));
      showCount();
      if (!testing) stageName();
    }

    function welcome(cd) {
      stopTimer();
      card.innerHTML =
        '<div class="ex kp-new"><p class="kicker">New kana</p><h3>' + esc(U.plural(cd.kana.length, "new kana", "new kana")) + " to learn</h3>" +
        '<ul class="kp-new-list">' +
        cd.kana.map((k) => '<li><button class="kp-new-k" type="button" data-say="' + esc(K.toHiragana(k)) + '"><span lang="ja" class="hand">' + esc(k) + "</span><small>" + esc(toRomaji(k)) + (K.hasKatakana(k) ? ' · <span lang="ja">' + esc(K.toHiragana(k)) + "</span>" : "") + "</small></button></li>").join("") +
        "</ul><p class=\"small muted\">Tap each one to hear it. They’ll come up more often for a while.</p>" +
        '<div class="row center"><button class="btn primary" type="button" data-go>Got it</button></div></div>';
      q = { over: true };
      sfx("badge");
      const go = card.querySelector("[data-go]");
      go.addEventListener("click", next);
      go.focus({ preventScroll: true });
    }

    // ---- shared pieces of questions
    const big = (k) => '<div class="kana-prompt hand' + (k.length > 1 ? " word" : "") + '" lang="ja"' + ui.fit(k) + ">" + esc(k) + "</div>";
    const optsHtml = (labels) => '<div class="opts kp-opts">' + labels.map((o, j) => '<button class="opt" type="button" data-i="' + j + '"><span class="key" aria-hidden="true">' + (j + 1) + '</span><span class="opt-body">' + o + "</span></button>").join("") + "</div>";
    const solution = (u, extra) => '<span lang="ja">' + esc(u.k) + "</span> = " + esc(u.r) + (u.kata ? ' <span lang="ja">(' + esc(u.h) + ")</span>" : "") + (extra || "");

    // Multiple choice: right answer at index `ans`.
    function choice(qq, el, ans, u, after) {
      const btns = el.querySelectorAll(".opt");
      const mark = (j) => {
        if (qq.over || btns[0].disabled) return;
        btns.forEach((b, k) => {
          b.disabled = true;
          if (k === ans) b.classList.add("right");
          else if (k === j) b.classList.add("wrong");
        });
        const ok = j === ans;
        result(u, ok);
        sfx(ok ? "right" : "wrong");
        if (after) after(ok);
        end(ok, solution(u));
      };
      btns.forEach((b) => b.addEventListener("click", () => mark(Number(b.dataset.i))));
      qq.peek = () => mark(-1);
      if (btns[0]) btns[0].focus({ preventScroll: true });
    }

    // A romaji box: right answers go through at once; with auto-check on, so does
    // a whole different kana. Otherwise Enter checks.
    function typing(qq, el, u, opts) {
      const o = opts || {};
      const input = el.querySelector(".kt-input");
      const check = (forced, shown) => {
        if (qq.over || input.disabled) return;
        const v = input.value;
        const ok = !shown && accepts(v, u.h);
        if (!ok && !forced && !v.trim()) return;
        input.disabled = true;
        input.classList.add(ok ? "right" : "wrong");
        if (o.done) return o.done(ok, shown ? "" : v);
        result(u, ok);
        sfx(ok ? "right" : "wrong");
        if (voice() && NI.store.settings.autoplay) NI.speech.speak(u.h);
        end(ok, solution(u));
      };
      input.addEventListener("input", () => {
        if (!cfg.qs.auto) return;
        if (accepts(input.value, u.h)) check();
        else if (o.single && whole(input.value) && !toRomaji(u.h).startsWith(norm(input.value))) check();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          check(true);
        }
      });
      qq.peek = () => {
        input.value = u.r;
        check(true, true);
      };
      input.focus({ preventScroll: true });
      return input;
    }
    const inputHtml = (ph) =>
      '<div class="answer-row"><label class="sr" for="kp-in">Reading in romaji</label><input id="kp-in" class="kt-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en" enterkeyhint="done" placeholder="' + esc(ph) + '"></div>';

    // ---- the stages
    const MAKE = {
      read() {
        const u = pick();
        const opts = U.shuffle([u.k].concat(decoys(u, 3, (k) => soundText(unit(k)))));
        const qq = {
          html: big(u.k) + optsHtml(opts.map((k) => soundHtml(unit(k)))),
          mount: (el) => choice(qq, el, opts.indexOf(u.k), u, () => voice() && NI.store.settings.autoplay && NI.speech.speak(u.h)),
          peek: () => {},
        };
        return qq;
      },
      find() {
        const u = pick();
        const opts = U.shuffle([u.k].concat(decoys(u, 3, (k) => soundText(unit(k)))));
        const qq = {
          html: '<div class="kp-sound' + (asHira(u) ? " ja" : "") + '"' + (asHira(u) ? ' lang="ja"' : "") + ">" + esc(soundText(u)) + "</div>" + (asHira(u) ? '<p class="kp-script-note small muted">Pick the katakana</p>' : "") + optsHtml(opts.map((k) => '<span lang="ja" class="hand opt-kana">' + esc(k) + "</span>")),
          mount: (el) => choice(qq, el, opts.indexOf(u.k), u, () => voice() && NI.store.settings.autoplay && NI.speech.speak(u.h)),
          peek: () => {},
        };
        return qq;
      },
      listen() {
        const u = pick();
        const opts = U.shuffle([u.k].concat(decoys(u, 3, (k) => sound(K.toHiragana(k)))));
        const qq = {
          html: '<div class="prompt-audio"><button class="big-play" type="button" data-say="' + esc(u.h) + '" aria-label="Play again">' + ui.ICON.speaker + "</button></div>" + optsHtml(opts.map((k) => '<span lang="ja" class="hand opt-kana">' + esc(k) + "</span>")),
          mount: (el) => {
            setTimeout(() => !qq.over && NI.speech.speak(u.h), 200);
            choice(qq, el, opts.indexOf(u.k), u);
          },
          peek: () => {},
        };
        return qq;
      },
      type() {
        const u = pick();
        const qq = { html: big(u.k) + inputHtml("e.g. ka, shi, tsu"), mount: (el) => typing(qq, el, u, { single: true }), peek: () => {} };
        return qq;
      },
      word() {
        const kata = pool.length ? pick().kata : false;
        const list = words(kata);
        let w = U.pick(list);
        for (let t = 0; t < 4 && recent.indexOf(w.k) >= 0; t++) w = U.pick(list);
        recent = [w.k].concat(recent).slice(0, 3);
        const wu = { k: w.k, h: K.toHiragana(w.k), r: toRomaji(w.k), kata };
        const qq = {
          html: big(w.k) + (cfg.qs.meanings ? '<p class="kp-mean">' + esc(w.en) + "</p>" : "") + inputHtml("type the word in romaji"),
          mount: (el) =>
            typing(qq, el, wu, {
              done: (ok, typed) => {
                // Each kana of the word counts too: where the kana line up, the ones typed differently were misread.
                const want = units(w.k);
                const got = units(inScript(typedKana(typed), kata));
                const inPlay = (k) => pool.some((p) => p.k === k);
                if (ok) want.filter(inPlay).forEach((k) => record(unit(k), true));
                else if (got.length === want.length) want.forEach((k, i) => inPlay(k) && record(unit(k), sound(K.toHiragana(got[i])) === sound(K.toHiragana(k))));
                answer(ok);
                if (!ok) tally.missed.set(w.k, { k: w.k, h: wu.h, r: wu.r, en: w.en, n: 1 });
                sfx(ok ? "right" : "wrong");
                if (voice()) NI.speech.speak(wu.h);
                end(ok, solution(wu, ' <span class="muted">· ' + esc(w.en) + "</span>"));
              },
            }),
          peek: () => {},
        };
        return qq;
      },
      line() {
        const row = [];
        for (let i = 0; i < 10; i++) row.push(pick());
        let at = 0;
        const qq = {
          html: '<div class="kp-line" lang="ja">' + row.map((u, i) => '<span class="kp-lk' + (i ? "" : " now") + '" data-i="' + i + '"><b class="hand">' + esc(u.k) + "</b><small></small></span>").join("") + "</div>" + inputHtml("type the highlighted kana"),
          mount(el) {
            const input = el.querySelector(".kt-input");
            const chips = el.querySelectorAll(".kp-lk");
            const step = (ok, carry) => {
              const u = row[at];
              chips[at].classList.remove("now");
              chips[at].classList.add(ok ? "ok" : "bad");
              if (!ok) chips[at].querySelector("small").textContent = u.r;
              result(u, ok);
              sfx(ok ? "right" : "wrong");
              at++;
              input.value = carry || "";
              if (at >= row.length) {
                input.disabled = true;
                return end("auto");
              }
              chips[at].classList.add("now");
              timer(TIME.line, () => step(false));
            };
            input.addEventListener("input", () => {
              const u = row[at];
              const v = norm(input.value);
              if (!u || !cfg.qs.auto) return;
              // ん: "n" could still become な, so wait for the next letter, as a keyboard does.
              if (u.h === "ん" && /^n[^aiueoyn']/.test(v)) return step(true, v.slice(1));
              if (u.h === "ん" && v === "n") return;
              if (accepts(v, u.h)) step(true);
              else if (whole(v) && !toRomaji(u.h).startsWith(v)) step(false);
            });
            input.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                if (input.value.trim()) step(accepts(input.value, row[at].h));
              }
            });
            qq.peek = (timeout) => {
              if (at < row.length) step(false);
              if (timeout !== true) input.focus({ preventScroll: true });
            };
            input.focus({ preventScroll: true });
            timer(TIME.line, () => step(false));
          },
          peek: () => {},
        };
        return qq;
      },
      pairs() {
        const label = (u) => soundText(u);
        const set = pickMany(Math.min(6, pool.length), label);
        const tops = U.shuffle(set.slice());
        const bottoms = U.shuffle(set.slice());
        const tile = (u, side) => '<button class="kp-tile' + (side === "k" ? " hand" : "") + '" type="button" data-side="' + side + '" data-k="' + esc(u.k) + '"' + (side === "k" ? ' lang="ja"' : "") + ">" + (side === "k" ? esc(u.k) : soundHtml(u)) + "</button>";
        const qq = {
          html: '<div class="kp-pairs"><div class="kp-tiles">' + tops.map((u) => tile(u, "s")).join("") + '</div><div class="kp-tiles">' + bottoms.map((u) => tile(u, "k")).join("") + "</div></div>",
          mount(el) {
            let sel = null;
            let left = set.length;
            const slipped = new Set();
            const done = (u) => {
              el.querySelectorAll('[data-k="' + CSS.escape(u.k) + '"]').forEach((b) => {
                b.classList.add("done");
                b.disabled = true;
              });
              if (--left === 0) end("auto");
            };
            el.querySelectorAll(".kp-tile").forEach((b) =>
              b.addEventListener("click", () => {
                if (qq.over || b.disabled) return;
                if (!sel || sel.dataset.side === b.dataset.side) {
                  if (sel) sel.classList.remove("sel");
                  sel = b;
                  b.classList.add("sel");
                  return;
                }
                const a = sel;
                sel = null;
                a.classList.remove("sel");
                const kana = (a.dataset.side === "k" ? a : b).dataset.k;
                const u = set.find((x) => x.k === kana);
                if (a.dataset.k === b.dataset.k) {
                  if (!slipped.has(u.k)) result(u, true);
                  sfx("right");
                  if (voice() && NI.store.settings.autoplay) NI.speech.speak(u.h);
                  done(u);
                } else {
                  // The kana tapped was misread.
                  if (!slipped.has(u.k)) result(u, false);
                  slipped.add(u.k);
                  sfx("wrong");
                  [a, b].forEach((x) => {
                    x.classList.add("bad");
                    setTimeout(() => x.classList.remove("bad"), 500);
                  });
                }
              })
            );
            qq.peek = (timeout) => {
              const rest = set.filter((u) => !el.querySelector('.kp-tile.done[data-k="' + CSS.escape(u.k) + '"]'));
              for (const u of timeout === true ? rest : rest.slice(0, 1)) {
                if (!slipped.has(u.k)) result(u, false);
                slipped.add(u.k);
                done(u);
              }
            };
          },
          peek: () => {},
        };
        return qq;
      },
      trace() {
        return handwriting(true);
      },
      draw() {
        return handwriting(false);
      },
    };

    // Tracing over the model, or writing from memory, checked stroke by stroke.
    function handwriting(trace) {
      // A combination such as きゃ is written one kana at a time: here, its first.
      const k = Array.from(pick(single).k)[0];
      const u = unit(k);
      const name = u.kata ? "katakana" : "hiragana";
      const prompt = trace
        ? '<p class="kp-write-for">' + soundHtml(u) + "</p>"
        : '<p class="kp-write-for">Write the ' + name + " for " + (asHira(u) ? '<span lang="ja" class="kp-hira">' + esc(u.h) + "</span>" : "<b>" + esc(u.r) + "</b>") + " " + ui.say(u.h) + "</p>";
      let p = null;
      const qq = {
        kicker: trace ? "Trace it, stroke by stroke (" + NI.strokes.count(k) + ")" : "Write it from memory: " + U.plural(NI.strokes.count(k), "stroke"),
        html: prompt + '<div class="kp-pad"></div><div class="row center wrap kp-pad-btns"><button class="btn ghost small" type="button" data-hintme>' + ui.ICON.eye + "<span>Show me</span></button>" + '<button class="btn ghost small" type="button" data-again>Start again</button></div>',
        mount(el) {
          if (trace && voice()) setTimeout(() => !qq.over && NI.speech.speak(u.h), 200);
          p = NI.strokes.pad(el.querySelector(".kp-pad"), k, {
            guide: trace,
            arrows: trace,
            loose: !trace,
            onStroke: (r) => sfx(r.ok ? "tick" : "wrong"),
            onDone: ({ mistakes }) => {
              const ok = mistakes <= 1;
              result(unit(k), ok);
              NI.store.log("wr", 1);
              sfx(ok ? "right" : "wrong");
              if (voice()) NI.speech.speak(u.h);
              el.querySelector(".kp-write-for").innerHTML = '<span lang="ja" class="hand kp-done-k">' + esc(k) + "</span> " + esc(toRomaji(k));
              end(ok ? "auto" : false, solution(unit(k), " · " + esc(U.plural(NI.strokes.count(k), "stroke")) + ": watch the order in the chart."));
            },
          });
          el.querySelector("[data-hintme]").addEventListener("click", () => p.hint());
          el.querySelector("[data-again]").addEventListener("click", () => p.reset());
        },
        peek: () => p && p.hint(),
      };
      return qq;
    }

    // ---- the end
    let paid = false;
    function stop() {
      if (ended) return;
      ended = true;
      stopTimer();
      NI.speech.stop();
      NI.session.setKeys(null);
      if (active === self) active = null;
    }
    // Leaving part-way still earns the XP for the right answers.
    function cash() {
      if (paid || !tally.right) return;
      paid = true;
      NI.fx.gain(tally.right * NI.game.XP.gamePoint);
    }
    const self = {
      leave() {
        stop();
        cash();
      },
    };
    active = self;
    box.querySelector("[data-quit]").addEventListener("click", () => {
      if (!tally.asked || testing) {
        self.leave();
        return back();
      }
      finish();
    });

    function finish() {
      stop();
      const right = tally.right;
      const total = tally.asked;
      const pct = total ? Math.round((right / total) * 100) : 0;
      const xp = right * NI.game.XP.gamePoint;
      const badges = testing && pct === 100 && cfg.length >= 20 ? NI.game.event("kanamaster") : [];
      paid = true;
      const res = NI.fx.gain(xp, { inline: true, badges });
      const missed = Array.from(tally.missed.values()).sort((a, b) => b.n - a.n);
      let head;
      if (testing) {
        const what = (cfg.pick === "auto" ? "Automatic" : U.plural(pool.length, "kana", "kana")) + ", " + U.plural(cfg.length, "question");
        const tests = (NI.store.state.intro.kanaTests || []).concat([{ at: Date.now(), pct, what }]).slice(-20);
        const best = Math.max.apply(null, tests.filter((t) => t.what === what).map((t) => t.pct));
        const isBest = tests.filter((t) => t.what === what).length > 1 && pct >= best;
        NI.store.setIntro("kanaTests", tests);
        const grade = pct === 100 ? ["{完璧|かんぺき}！", "Perfect: every one right."] : pct >= 90 ? ["すごい！", "Excellent. Just a few to tidy up."] : pct >= 75 ? ["いいですね！", "Good. Practise the ones below and try again."] : pct >= 50 ? ["もう{少|すこ}し！", "Getting there. A little training every day will do it."] : ["がんばって！", "Keep going: train with fewer kana first."];
        head =
          (pct >= 80 ? NI.session.hanamaru() : "") + "<h2>" + ui.jp(grade[0], { tokens: false }) + "</h2>" +
          '<p class="kt-score"><b>' + pct + "%</b> " + right + " of " + total + " right" + (isBest ? " · new best!" : "") + "</p>" +
          '<p class="finish-en">' + esc(grade[1]) + "</p>";
        NI.fx.play(pct >= 80 ? "level" : "chime");
        if (pct >= 90) NI.fx.confetti(box);
      } else {
        head =
          (total >= 10 && pct >= 85 ? NI.session.hanamaru() : "") + "<h2>" + ui.jp("お{疲|つか}れさま！", { tokens: false }) + "</h2>" +
          '<p class="kt-score"><b>' + pct + "%</b> " + right + " of " + U.plural(total, "answer") + " right</p>" +
          '<ul class="kp-facts">' +
          "<li>Best run: <b>" + tally.best + "</b> in a row</li>" +
          (tally.ups ? "<li>Moved up <b>" + U.plural(tally.ups, "stage") + "</b></li>" : "") +
          (opened.length ? '<li>New kana: <b lang="ja">' + esc(opened.map((cd) => cd.kana.join(" ")).join(" · ")) + "</b></li>" : "") +
          "</ul>";
        NI.fx.play("chime");
      }
      box.innerHTML =
        '<div class="finish">' + head +
        (missed.length
          ? '<div class="missed kt-missed"><h3>To practise</h3><ul>' +
            missed.slice(0, 12).map((m) => '<li><span lang="ja" class="hand">' + esc(m.k) + "</span>" + ui.say(m.h) + "<span>" + esc(m.r) + (m.en ? ' <span class="muted">' + esc(m.en) + "</span>" : "") + "</span></li>").join("") +
            "</ul></div>"
          : "") +
        (xp ? NI.session.xpBlock(res, [["Correct answers", xp]]) : "") +
        '<div class="row center wrap">' +
        (missed.some((m) => Array.from(m.k).length <= 2) ? '<button class="btn primary" type="button" data-kp-missed>Practise the ones I missed</button>' : "") +
        '<button class="btn ' + (missed.length ? "ghost" : "primary") + '" type="button" data-kp-again>' + (testing ? "New test" : "Keep going") + "</button>" +
        '<button class="btn ghost" type="button" data-kp-back>Change the settings</button></div></div>';
      const again = box.querySelector("[data-kp-again]");
      again.addEventListener("click", () => session(box, cfg, back));
      const retry = box.querySelector("[data-kp-missed]");
      if (retry)
        retry.addEventListener("click", () => {
          const ks = missed.filter((m) => Array.from(m.k).length <= 2).map((m) => m.k);
          session(box, Object.assign({}, cfg, { pick: "manual", cards: [], extra: ks, mode: "train", save: false }), back);
        });
      box.querySelector("[data-kp-back]").addEventListener("click", back);
    }

    // Keys: 1–4 choose, Enter continues.
    NI.session.setKeys((e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (!foot.hidden && e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (/^[1-4]$/.test(e.key) && foot.hidden) {
        const b = card.querySelectorAll(".opt")[Number(e.key) - 1];
        if (b && !b.disabled) {
          e.preventDefault();
          b.click();
        }
      }
    });

    if (!pool.length) {
      card.innerHTML = '<p class="note">No kana to practise. Change the settings and choose a row or two.</p>';
      return;
    }
    // In automatic mode, a row you haven't met yet starts with its introduction.
    for (const p of plans) if (p.list[p.f].kana.every((k) => level(k) === "new")) intro.push(p.list[p.f]);
    stageName();
    next();
  }

  // Kana a learner might confuse with ch: look-alikes, voiced pairs, row neighbours.
  const VOICED = { か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご", さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ", た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど", は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ" };
  function neighbours(ch) {
    const h = K.toHiragana(ch);
    const out = new Set();
    const sets = HIRA_ALIKE.map((s) => Array.from(s)).concat(KATA_ALIKE.map((s) => Array.from(K.toHiragana(s))), NI.data.kana.LOOKALIKES.map((s) => s.set.map((k) => K.toHiragana(k))));
    for (const set of sets) if (set.indexOf(h) >= 0) set.forEach((x) => x !== h && out.add(x));
    for (const [a, b] of Object.entries(VOICED)) {
      if (a === h) out.add(b);
      if (b === h) out.add(a);
    }
    const row = NI.data.kana.ROWS.concat(NI.data.kana.DAKUTEN, NI.data.kana.YOON).find((r) => r.cells.some((c) => c && c[0] === h));
    if (row) row.cells.forEach((c) => c && c[0] !== h && out.add(c[0]));
    return Array.from(out);
  }

  const leave = () => active && active.leave();

  NI.kanaPractice = { body, mount, preset, leave, toRomaji, typedKana, accepts, units, level, mastery, groups, STAGES };
})(typeof window !== "undefined" ? window : globalThis);
