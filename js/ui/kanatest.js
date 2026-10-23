/* Kana test: how well do you know hiragana and katakana? Single kana, whole
   words, or both, answered by typing the reading, choosing it, or picking
   what you hear. Ends with a score and the kana you missed, to practise. */
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

  // ---------------------------------------------------------------------------
  // What to test

  const HIRA_LOOKALIKE = [["ぬ", "め"], ["わ", "れ", "ね"], ["る", "ろ"], ["さ", "ち"], ["き", "さ"], ["は", "ほ"], ["い", "り"], ["あ", "お"], ["こ", "に"], ["う", "つ"], ["し", "つ"], ["ま", "ほ"]];
  const VOICED = { か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご", さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ", た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど", は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ" };

  function letterPool(dk, yoon) {
    const D = NI.data.kana;
    const out = [];
    const rows = D.ROWS.concat(dk ? D.DAKUTEN : []).concat(yoon ? D.YOON : []);
    for (const r of rows) for (const c of r.cells) if (c && !/^[ぢづゐゑ]/.test(c[0])) out.push(c[0]);
    return out;
  }

  function wordPool(kata) {
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
        const r = w.r;
        const n = Array.from(r).length;
        if (n >= 2 && n <= 6 && /^[ぁ-ゖー]+$/.test(r)) add(r, w.en);
      }
    }
    return out;
  }

  // The same kana in the script the item is shown in.
  const inScript = (h, kata) => (kata ? K.toKatakana(h) : h);

  // Kana a learner might confuse with ch: look-alikes, voiced pairs, row neighbours.
  function neighbours(ch) {
    const h = K.toHiragana(ch);
    const out = new Set();
    const sets = HIRA_LOOKALIKE.concat(NI.data.kana.LOOKALIKES.map((s) => s.set.map((k) => K.toHiragana(k))));
    for (const set of sets) if (set.indexOf(h) >= 0) set.forEach((x) => x !== h && out.add(x));
    for (const [a, b] of Object.entries(VOICED)) {
      if (a === h) out.add(b);
      if (b === h) out.add(a);
    }
    const row = NI.data.kana.ROWS.concat(NI.data.kana.DAKUTEN).find((r) => r.cells.some((c) => c && c[0] === h));
    if (row) row.cells.forEach((c) => c && c[0] !== h && out.add(c[0]));
    return Array.from(out).filter((x) => !/^[ぢづゐゑ]/.test(x));
  }

  // Three wrong versions of a word: one kana changed, or a small っ / long vowel added or dropped.
  function wordDecoys(k, kata, rng) {
    const s = Array.from(k);
    const cands = new Set();
    for (let t = 0; t < 40 && cands.size < 8; t++) {
      const i = Math.floor(rng() * s.length);
      const c = s.slice();
      const roll = rng();
      if (roll < 0.6) {
        const n = neighbours(s[i]);
        if (!n.length) continue;
        c[i] = inScript(U.pick(n, rng), kata);
      } else if (roll < 0.8) {
        if (/[っッ]/.test(s[i])) c.splice(i, 1);
        else if (i > 0) c.splice(i, 0, kata ? "ッ" : "っ");
        else continue;
      } else if (kata) {
        if (s[i] === "ー") c.splice(i, 1);
        else c.splice(i + 1, 0, "ー");
      } else {
        const v = { a: "あ", i: "い", u: "う", e: "い", o: "う" }[toRomaji(s[i]).slice(-1)];
        if (!v || s[i + 1] === v) continue;
        c.splice(i + 1, 0, v);
      }
      const w = c.join("");
      if (w !== k && toRomaji(w) !== toRomaji(k)) cands.add(w);
    }
    return U.shuffle(Array.from(cands), rng).slice(0, 3);
  }

  // Builds the questions: { kana, hira, rom, en, kind, kata, options?, answer? }.
  function build(cfg) {
    const rng = U.rng(Date.now());
    const items = [];
    const n = cfg.length;
    const nWords = cfg.what === "letters" ? 0 : cfg.what === "words" ? n : Math.floor(n / 2);
    const kataFor = () => (cfg.script === "kata" ? true : cfg.script === "hira" ? false : rng() < 0.5);
    const letters = U.shuffle(letterPool(cfg.dk, cfg.yoon), rng);
    const words = { true: U.shuffle(wordPool(true), rng), false: U.shuffle(wordPool(false), rng) };
    for (let i = 0; i < n - nWords; i++) {
      const h = letters[i % letters.length];
      const kata = kataFor();
      items.push({ kind: "letter", kata, kana: inScript(h, kata), hira: h, rom: toRomaji(h) });
    }
    for (let i = 0; i < nWords; i++) {
      const kata = kataFor();
      const w = words[kata].shift() || U.pick(wordPool(kata), rng);
      items.push({ kind: "word", kata, kana: w.k, hira: K.toHiragana(w.k), rom: toRomaji(w.k), en: w.en });
    }
    const list = U.shuffle(items, rng);
    if (cfg.answer !== "type") {
      for (const it of list) {
        let decoys;
        if (it.kind === "letter") decoys = U.shuffle(neighbours(it.hira), rng).concat(U.shuffle(letters, rng)).map((h) => inScript(h, it.kata));
        else decoys = wordDecoys(it.kana, it.kata, rng).concat(U.shuffle(words[it.kata], rng).slice(0, 3).map((w) => w.k));
        // Options must differ in what's compared: the romaji, or the sound when listening.
        const label = (k) => (cfg.answer === "choose" ? toRomaji(k) : sound(K.toHiragana(k)));
        const opts = [it.kana];
        for (const d of decoys) if (opts.length < 4 && !opts.some((o) => label(o) === label(d) || o === d)) opts.push(d);
        it.options = U.shuffle(opts, rng);
        it.answer = it.options.indexOf(it.kana);
      }
    }
    return list;
  }

  // Kana that sound the same are the same answer: を/お, ぢ/じ, づ/ず.
  const sound = (kana) => K.fold(kana).replace(/を/g, "お").replace(/ぢ/g, "じ").replace(/づ/g, "ず");

  // Typed romaji, as kana to compare: m before b/p/m counts as ん (shimbun).
  function typedKana(text) {
    const t = String(text).toLowerCase().replace(/\s+/g, "").replace(/m(?=[bpm])/g, "n");
    return sound(K.romajiToHiragana(t, true));
  }

  /* Whether typed romaji reads as hira. Hepburn writes ティ, ディ, トゥ, ドゥ
     as ti, di, tu, du, which a keyboard reads as ち, ぢ, つ, づ: both count. */
  function accepts(text, hira) {
    const want = sound(hira);
    if (typedKana(text) === want) return true;
    const hep = String(text).toLowerCase().replace(/([td])([iu])/g, (m, c, v) => c + (v === "i" ? "hi" : "wu"));
    return typedKana(hep) === want;
  }

  // ---------------------------------------------------------------------------
  // The page section (a tab of the Kana trainer)

  const CONFIG_KEY = "kanaTest";

  function body() {
    const c = Object.assign({ script: "hira", what: "both", answer: "type", length: 20, dk: true, yoon: false }, NI.store.state.intro[CONFIG_KEY] || {});
    const best = NI.store.state.intro.kanaBest || {};
    const r = (name, v, label, sub) =>
      '<label class="radio"><input type="radio" name="kt-' + name + '" value="' + v + '"' + (String(c[name]) === String(v) ? " checked" : "") + "><span><b>" + label + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span></label>";
    const bestList = Object.keys(best)
      .sort()
      .map((k) => "<li>" + esc(describe(JSON.parse(k))) + ": <b>" + best[k] + "%</b></li>")
      .join("");
    return (
      "<p>Check how well you read kana: single characters, real words, or a mix. Type the reading in romaji, pick it from four, or listen and pick what you hear. You get a score and a list of the ones to practise.</p>" +
      '<div class="drill-setup kt-setup">' +
      '<fieldset><legend>Script</legend><div class="seg-row">' + r("script", "hira", "Hiragana") + r("script", "kata", "Katakana") + r("script", "both", "Both") + "</div></fieldset>" +
      '<fieldset><legend>Questions</legend><div class="seg-row">' + r("what", "letters", "Single kana") + r("what", "words", "Words") + r("what", "both", "Both") + "</div></fieldset>" +
      '<fieldset><legend>Answer by</legend>' +
      r("answer", "type", "Typing the reading", "Type it in romaji: ka, shi, tsu…") +
      r("answer", "choose", "Choosing the reading", "Pick the right romaji from four") +
      (NI.speech.canListen ? r("answer", "listen", "Listening", "Hear it, then pick the kana you heard") : "") +
      "</fieldset>" +
      '<fieldset class="stack"><legend>Single kana include</legend>' +
      '<label class="check"><input type="checkbox" id="kt-dk"' + (c.dk ? " checked" : "") + "> ゛ and ゜ (が, ぱ …)</label>" +
      '<label class="check"><input type="checkbox" id="kt-yoon"' + (c.yoon ? " checked" : "") + "> small ゃ ゅ ょ (きゃ, しゅ …)</label></fieldset>" +
      '<fieldset><legend>Length</legend><div class="seg-row">' + r("length", 10, "10") + r("length", 20, "20") + r("length", 40, "40") + "</div></fieldset>" +
      '<button class="btn primary" type="button" data-kt-start>Start the test</button>' +
      (bestList ? '<div class="kt-best"><b>Your best scores</b><ul>' + bestList + "</ul></div>" : "") +
      "</div>" +
      '<div class="kt-box session" hidden></div>'
    );
  }

  function describe(c) {
    const s = { hira: "Hiragana", kata: "Katakana", both: "Hiragana & katakana" }[c.script];
    const w = { letters: "single kana", words: "words", both: "kana & words" }[c.what];
    const a = { type: "typing", choose: "choosing", listen: "listening" }[c.answer];
    return s + ", " + w + ", " + a;
  }

  function mount(el) {
    const start = el.querySelector("[data-kt-start]");
    if (!start) return;
    const setup = el.querySelector(".kt-setup");
    const box = el.querySelector(".kt-box");
    const intro = el.querySelector(".kana-body > p");
    const val = (name) => el.querySelector('input[name="kt-' + name + '"]:checked').value;
    start.addEventListener("click", () => {
      const cfg = { script: val("script"), what: val("what"), answer: val("answer"), length: Number(val("length")), dk: el.querySelector("#kt-dk").checked, yoon: el.querySelector("#kt-yoon").checked };
      NI.store.setIntro(CONFIG_KEY, cfg);
      const back = () => {
        box.hidden = true;
        setup.hidden = false;
        if (intro) intro.hidden = false;
        NI.app.render();
      };
      setup.hidden = true;
      if (intro) intro.hidden = true;
      box.hidden = false;
      run(box, cfg, build(cfg), back);
      box.scrollIntoView({ block: "start" });
    });
  }

  // ---------------------------------------------------------------------------
  // Running the test

  function run(box, cfg, items, back) {
    let i = 0;
    const missed = [];
    box.innerHTML = NI.session.shell("Kana test", esc(describe(cfg)));
    const card = box.querySelector(".sess-card");
    const foot = box.querySelector(".sess-foot");
    const bar = box.querySelector(".sess-bar");
    const count = box.querySelector(".sess-count");
    box.querySelector(".sess-xp").hidden = true;
    box.querySelector("[data-quit]").addEventListener("click", () => {
      NI.session.setKeys(null);
      NI.speech.stop();
      back();
    });

    const shown = (it) => '<div class="kana-prompt hand' + (it.kind === "word" ? " word" : "") + '" lang="ja"' + ui.fit(it.kana) + ">" + esc(it.kana) + "</div>";

    function show() {
      if (i >= items.length) return finish();
      const it = items[i];
      bar.innerHTML = ui.progressBar(i / items.length, "Test progress");
      count.textContent = i + 1 + " / " + items.length;
      foot.hidden = true;
      let html = '<div class="ex kt-ex">';
      if (cfg.answer === "type") {
        html +=
          '<p class="kicker">Type the reading in romaji</p>' + shown(it) +
          '<div class="answer-row"><label class="sr" for="kt-in">Reading in romaji</label><input id="kt-in" class="kt-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en" placeholder="e.g. ka, shi, tsu"><button class="btn primary" type="button" data-kt-check>Check</button></div>';
      } else if (cfg.answer === "choose") {
        html += '<p class="kicker">How do you read it?</p>' + shown(it) + options(it.options.map((o) => esc(toRomaji(o))));
      } else {
        html +=
          '<p class="kicker">Which one did you hear?</p><div class="prompt-audio"><button class="big-play" type="button" data-say="' + esc(it.hira) + '" aria-label="Play again">' + ui.ICON.speaker + "</button></div>" +
          options(it.options.map((o) => '<span lang="ja" class="hand opt-kana">' + esc(o) + "</span>"));
      }
      card.innerHTML = html + "</div>";
      if (cfg.answer === "listen") setTimeout(() => NI.speech.speak(it.hira), 150);
      if (cfg.answer === "type") {
        const input = card.querySelector("#kt-in");
        const check = () => {
          if (!input.value.trim() || input.disabled) return;
          input.disabled = true;
          const ok = accepts(input.value, it.hira);
          input.classList.add(ok ? "right" : "wrong");
          answered(ok);
        };
        card.querySelector("[data-kt-check]").addEventListener("click", check);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            check();
          }
        });
        input.focus({ preventScroll: true });
      } else {
        card.querySelectorAll(".opt").forEach((b) =>
          b.addEventListener("click", () => {
            const btns = card.querySelectorAll(".opt");
            if (btns[0].disabled) return;
            const j = Number(b.dataset.i);
            btns.forEach((x, k) => {
              x.disabled = true;
              if (k === it.answer) x.classList.add("right");
              else if (k === j) x.classList.add("wrong");
            });
            answered(j === it.answer);
          })
        );
        const first = card.querySelector(".opt");
        if (first) first.focus({ preventScroll: true });
      }
    }

    function options(labels) {
      return '<div class="opts">' + labels.map((o, j) => '<button class="opt" type="button" data-i="' + j + '"><span class="key" aria-hidden="true">' + (j + 1) + '</span><span class="opt-body">' + o + "</span></button>").join("") + "</div>";
    }

    function answered(ok) {
      const it = items[i];
      if (it.kind === "letter") NI.store.kanaResult(it.kana, ok);
      else NI.store.log("kn", 1);
      if (!ok) missed.push(it);
      it.ok = ok;
      NI.fx.play(ok ? "right" : "wrong");
      if (cfg.answer !== "listen" && NI.speech.supported && NI.store.settings.autoplay) NI.speech.speak(it.hira);
      if (ok) {
        setTimeout(() => items[i] === it && next(), 650);
        return;
      }
      foot.innerHTML = NI.session.feedback(false, '<span lang="ja">' + esc(it.kana) + "</span> = " + esc(it.rom) + (it.en ? ' <span class="muted">(' + esc(it.en) + ")</span>" : ""));
      foot.hidden = false;
      const b = foot.querySelector("[data-next]");
      b.addEventListener("click", next);
      setTimeout(() => b.focus({ preventScroll: true }), 0);
    }

    function next() {
      i++;
      show();
    }

    function finish() {
      NI.session.setKeys(null);
      const right = items.length - missed.length;
      const pct = Math.round((right / items.length) * 100);
      const key = JSON.stringify({ script: cfg.script, what: cfg.what, answer: cfg.answer });
      const best = Object.assign({}, NI.store.state.intro.kanaBest || {});
      const had = best[key] != null;
      const isBest = !(best[key] >= pct);
      if (isBest) best[key] = pct;
      NI.store.setIntro("kanaBest", best);
      const badges = pct === 100 && items.length >= 20 ? NI.game.event("kanamaster") : [];
      const xp = right * NI.game.XP.gamePoint;
      const res = NI.fx.gain(xp, { inline: true, badges });
      NI.fx.play(pct >= 80 ? "level" : "chime");
      if (pct >= 90) NI.fx.confetti(box);
      const grade = pct === 100 ? ["{完璧|かんぺき}！", "Perfect: every one right."] : pct >= 90 ? ["すごい！", "Excellent. Just a few to tidy up."] : pct >= 75 ? ["いいですね！", "Good. Practise the ones below and try again."] : pct >= 50 ? ["もう{少|すこ}し！", "Getting there. A short drill a day will do it."] : ["がんばって！", "Keep going: start with the chart and the drills."];
      box.innerHTML =
        '<div class="finish">' + (pct >= 80 ? NI.session.hanamaru() : "") +
        "<h2>" + ui.jp(grade[0], { tokens: false }) + "</h2>" +
        '<p class="kt-score"><b>' + pct + "%</b> " + right + " of " + items.length + " right" + (had && isBest ? " · new best!" : "") + "</p>" +
        '<p class="finish-en">' + esc(grade[1]) + "</p>" +
        (missed.length
          ? '<div class="missed kt-missed"><h3>To practise</h3><ul>' +
            missed.map((m) => '<li><span lang="ja" class="hand">' + esc(m.kana) + "</span>" + ui.say(m.hira) + "<span>" + esc(m.rom) + (m.en ? ' <span class="muted">' + esc(m.en) + "</span>" : "") + "</span></li>").join("") +
            "</ul></div>"
          : "") +
        (xp ? NI.session.xpBlock(res, [["Correct answers", xp]]) : "") +
        '<div class="row center wrap">' +
        (missed.length ? '<button class="btn primary" type="button" data-kt-retry>Practise the ones I missed</button>' : "") +
        '<button class="btn ' + (missed.length ? "ghost" : "primary") + '" type="button" data-kt-again>New test</button>' +
        '<button class="btn ghost" type="button" data-kt-back>Change the settings</button></div></div>';
      const retry = box.querySelector("[data-kt-retry]");
      if (retry) retry.addEventListener("click", () => run(box, cfg, U.shuffle(missed.concat(missed.length < 5 ? missed : []).map((m) => Object.assign({}, m))), back));
      box.querySelector("[data-kt-again]").addEventListener("click", () => run(box, cfg, build(cfg), back));
      box.querySelector("[data-kt-back]").addEventListener("click", back);
    }

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
    show();
  }

  NI.kanaTest = { body, mount, toRomaji, build, typedKana, accepts };
})(typeof window !== "undefined" ? window : globalThis);
