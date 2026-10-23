/* Write kana by hand: trace a character stroke by stroke, then write it from
   memory. Every stroke is checked for its shape, direction and order, with
   the next stroke shown when you're stuck. Learners who write new
   characters by hand recognise them better later than those who only type. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const K = NI.kana;

  const ROUNDS = 10;
  let leaving = null;

  function body() {
    const D = NI.data.kana;
    const kata = !NI.store.settings.kataHelp;
    return (
      "<p>Writing a character by hand helps you remember it far better than only looking at it. Trace it first, following the dot and the arrow for each stroke; then write it from memory. Each stroke is checked as you go: its shape, its direction and its place in the order.</p>" +
      '<div class="drill-setup write-setup">' +
      '<fieldset><legend>Script</legend>' +
      '<label class="check"><input type="radio" name="wr-script" value="hira"' + (kata ? "" : " checked") + "> hiragana</label>" +
      '<label class="check"><input type="radio" name="wr-script" value="kata"' + (kata ? " checked" : "") + "> katakana</label></fieldset>" +
      '<label for="wr-set">Characters</label><select id="wr-set"><option value="mix">10 at random from the basic 46</option><option value="weak">The ones you miss most</option>' +
      D.ROWS.map((r) => '<option value="' + r.id + '">' + esc(r.cells.filter(Boolean).map((c) => c[0]).join(" ")) + "</option>").join("") +
      D.DAKUTEN.map((r) => '<option value="' + r.id + '">' + esc(r.cells.filter(Boolean).map((c) => c[0]).join(" ")) + "</option>").join("") +
      "</select>" +
      '<label class="toggle"><input type="checkbox" id="wr-guide" checked><span><b>Trace first</b><small>Trace each character over a guide before writing it from memory</small></span></label>' +
      '<button class="btn primary" type="button" data-wr-start>Start writing</button></div>' +
      '<div class="write-box" hidden></div>'
    );
  }

  function pick(set, kata) {
    const D = NI.data.kana;
    const all = D.ROWS.flatMap((r) => r.cells.filter(Boolean)).map((c) => c[0]);
    const conv = (h) => (kata ? K.toKatakana(h) : h);
    if (set === "weak") {
      const st = NI.store.state.kana;
      const mine = Object.keys(st)
        .filter((k) => K.hasKatakana(k) === kata && Array.from(k).length === 1 && NI.strokes.has(k) && st[k][1] > 0)
        .sort((a, b) => st[b][1] / (st[b][0] + 1) - st[a][1] / (st[a][0] + 1));
      return mine.slice(0, ROUNDS).concat(U.sample(all.map(conv).filter((k) => mine.indexOf(k) < 0), Math.max(0, 3 - mine.length)));
    }
    const row = D.ROWS.concat(D.DAKUTEN).find((r) => r.id === set);
    return (row ? row.cells.filter(Boolean).map((c) => c[0]) : U.sample(all, ROUNDS)).map(conv);
  }

  function mount(el) {
    const start = el.querySelector("[data-wr-start]");
    const setup = el.querySelector(".write-setup");
    const box = el.querySelector(".write-box");
    if (!start) return;
    start.addEventListener("click", () => {
      const kata = el.querySelector('input[name="wr-script"]:checked').value === "kata";
      const trace = el.querySelector("#wr-guide").checked;
      const list = pick(el.querySelector("#wr-set").value, kata);
      const intro = el.querySelector(".kana-body > p");
      setup.hidden = true;
      if (intro) intro.hidden = true;
      box.hidden = false;
      run(box, list, trace, () => {
        box.hidden = true;
        setup.hidden = false;
        if (intro) intro.hidden = false;
      });
      box.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function run(box, list, trace, back) {
    let i = 0;
    let right = 0;
    let tracing = trace;
    let p = null;
    const missed = [];
    box.innerHTML =
      '<div class="w-head"><button class="icon-btn" type="button" data-wr-quit aria-label="Stop">' + ui.ICON.close + '</button><span class="w-count small muted"></span></div>' +
      '<div class="w-prompt"><span class="w-ro"></span><span class="w-say"></span></div>' +
      '<p class="w-step small muted"></p>' +
      '<div class="w-pad"></div>' +
      '<div class="row center wrap w-btns"><button class="btn ghost small" type="button" data-hintme>' + ui.ICON.eye + '<span>Show me</span></button><button class="btn ghost small" type="button" data-again>Start again</button></div>';
    const quit = () => {
      leaving = null;
      NI.speech.stop();
      if (right) NI.fx.gain(right * NI.game.XP.written);
      back();
    };
    leaving = () => right && NI.fx.gain(right * NI.game.XP.written);
    box.querySelector("[data-wr-quit]").addEventListener("click", quit);
    box.querySelector("[data-hintme]").addEventListener("click", () => p && p.hint());
    box.querySelector("[data-again]").addEventListener("click", () => p && p.reset());

    function show() {
      if (i >= list.length) return finish();
      const k = list[i];
      box.querySelector(".w-count").textContent = i + 1 + " / " + list.length;
      box.querySelector(".w-ro").textContent = NI.kanaPractice.toRomaji(k);
      box.querySelector(".w-say").innerHTML = ui.say(K.toHiragana(k), NI.kanaPractice.toRomaji(k));
      box.querySelector(".w-step").textContent = tracing
        ? "Trace it: start at the dot and follow the arrow. " + U.plural(NI.strokes.count(k), "stroke") + "."
        : "Now from memory: " + U.plural(NI.strokes.count(k), "stroke") + ".";
      p = NI.strokes.pad(box.querySelector(".w-pad"), k, {
        guide: tracing,
        arrows: tracing,
        loose: !tracing,
        onStroke: (r) => NI.fx.play(r.ok ? "tick" : "wrong"),
        onDone: ({ mistakes }) => {
          if (tracing) {
            tracing = false;
            NI.fx.play("right");
            return setTimeout(show, 700);
          }
          const ok = mistakes <= 1;
          if (ok) right++;
          else missed.push(k);
          NI.store.kanaResult(k, ok);
          NI.store.log("wr", 1);
          NI.fx.play(ok ? "right" : "wrong");
          if (NI.speech.supported && NI.store.settings.autoplay) NI.speech.speak(K.toHiragana(k));
          i++;
          tracing = trace;
          setTimeout(show, 900);
        },
      });
      if (NI.speech.supported && NI.store.settings.autoplay && tracing) NI.speech.speak(K.toHiragana(k));
    }

    function finish() {
      leaving = null;
      const xp = right * NI.game.XP.written;
      const res = NI.fx.gain(xp, { inline: true });
      NI.fx.play("chime");
      box.innerHTML =
        '<div class="finish">' + (right === list.length ? NI.session.hanamaru() : "") + "<h2>" + right + " / " + list.length + "</h2>" +
        "<p>" + (right === list.length ? "Beautiful handwriting!" : "Keep writing: a few characters a day add up.") + (trace ? " Next time, try it without tracing first." : "") + "</p>" +
        (missed.length ? '<p class="w-missed">To practise: <span lang="ja" class="hand">' + esc(missed.join(" ")) + "</span></p>" : "") +
        (xp ? NI.session.xpBlock(res, [["Characters written", xp]]) : "") +
        '<div class="row center wrap"><button class="btn primary" type="button" data-again>Write more</button></div></div>';
      box.querySelector("[data-again]").addEventListener("click", back);
    }

    show();
  }

  // Leaving the page part-way still earns the XP for what you wrote.
  function leave() {
    if (leaving) leaving();
    leaving = null;
  }

  NI.kanaWrite = { body, mount, leave };
})(typeof window !== "undefined" ? window : globalThis);
