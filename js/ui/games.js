/* Play: the games hub, four games and the mistakes notebook.
   Games use words and sentences the learner has already met, so every round
   is retrieval practice; wrong answers go into the mistakes notebook. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const pages = (NI.pages = NI.pages || {});

  // Words for games: those in your reviews, or else the ones taught so far.
  function wordPool(min) {
    const srs = NI.store.state.srs;
    const learned = NI.course.words.filter((w) => srs[w.id]);
    if (learned.length >= (min || 12)) return learned;
    const step = NI.nextStep();
    const upto = Math.max(2, step ? step.u.n : 99);
    return NI.course.words.filter((w) => w.unit <= upto);
  }

  function sentencePool() {
    const step = NI.nextStep();
    const upto = Math.max(2, step ? step.u.n : 99);
    return NI.course.sentences.filter((s) => {
      if (s.unit > upto) return false;
      const n = NI.furi.parse(s.jp).length;
      return n >= 3 && n <= 6 && !/[。？！]/.test(NI.furi.base(s.jp).replace(/[。？！]$/, ""));
    });
  }

  const GAMES = [
    { id: "timeattack", icon: "⏱️", t: "Time Attack", ja: "タイムアタック", d: "60 seconds: how many word meanings can you get right?", best: (v) => v + " points" },
    { id: "kanarain", icon: "🌧️", t: "Kana Rain", ja: "かなの{雨|あめ}", d: "Type the romaji for each falling kana before it lands.", best: (v) => v + " kana" },
    { id: "memory", icon: "🃏", t: "Memory Match", ja: "{神経衰弱|しんけいすいじゃく}", d: "Turn over cards to pair each word with its meaning.", best: (v) => v + " s" },
    { id: "sprint", icon: "🧩", t: "Sentence Sprint", ja: "{文|ぶん}づくり", d: "Build five sentences from their pieces, against the clock.", best: (v) => v + " s" },
  ];

  // Other ways to practise, linked from Play.
  const WAYS = [
    { href: "roleplays", icon: "🎭", t: "Role-play", ja: "ロールプレイ", d: "Take a part in a conversation: your partner speaks, you answer." },
    { href: "listen", icon: "🎧", t: "Listen on the go", ja: "{聞|き}き{流|なが}し", d: "Hands-free audio of your words and sentences, with pauses to answer." },
    { href: "kana-write", icon: "🖌️", t: "Write kana", ja: "{書|か}く", d: "Trace and write hiragana and katakana with your finger." },
  ];

  function missionsCard() {
    const list = NI.game.missions();
    const bonusDone = !!NI.store.today().mb;
    return (
      '<section class="missions" aria-labelledby="mis-h"><h2 id="mis-h">' + ui.jp("{今日|きょう}のミッション", { tokens: false }) + ' <span class="sub">Today’s missions</span></h2>' +
      '<ul class="mis-list">' +
      list
        .map(
          (m) =>
            '<li class="' + (m.done ? "done" : "") + '"><span class="mis-check" aria-hidden="true">' + (m.done ? ui.ICON.check : "") + "</span>" +
            '<span class="mis-t">' + esc(m.t) + "</span>" + ui.progressBar(m.v / m.goal, m.t) + '<span class="mis-n">' + m.v + "/" + m.goal + "</span></li>"
        )
        .join("") +
      "</ul>" +
      '<p class="small muted">' + (bonusDone ? "All done today: bonus collected. New missions tomorrow." : "Finish all three for a +" + NI.game.XP.missions + " XP bonus.") + "</p></section>"
    );
  }
  NI.missionsCard = missionsCard;

  pages.play = {
    title: "Play",
    nav: "play",
    render() {
      const best = NI.store.state.games;
      const nm = Object.keys(NI.store.state.mistakes).filter((r) => NI.items.get(r)).length;
      let html =
        '<header class="page-head"><h1>Play <span class="sub">' + ui.jp("{遊|あそ}ぶ", { tokens: false }) + "</span></h1>" +
        "<p>Quick games with the words and sentences you've learned. Every round is recall practice, and it all earns XP.</p></header>" +
        missionsCard() +
        '<section class="u-sec"><h2>Games</h2><div class="game-grid">' +
        GAMES.map(
          (g) =>
            '<a class="game-card" href="#game-' + g.id + '"><span class="g-icon" aria-hidden="true">' + g.icon + "</span>" +
            '<span class="g-text"><b>' + esc(g.t) + '</b><span class="g-ja">' + ui.jp(g.ja, { tokens: false }) + "</span><span>" + esc(g.d) + "</span>" +
            (best[g.id] != null ? '<span class="g-best">Best: ' + esc(g.best(best[g.id])) + "</span>" : "") + "</span></a>"
        ).join("") +
        "</div></section>" +
        '<section class="u-sec"><h2>More ways to practise</h2><div class="game-grid">' +
        WAYS.map((w) => '<a class="game-card" href="#' + w.href + '"><span class="g-icon" aria-hidden="true">' + w.icon + "</span>" + '<span class="g-text"><b>' + esc(w.t) + '</b><span class="g-ja">' + ui.jp(w.ja, { tokens: false }) + "</span><span>" + esc(w.d) + "</span></span></a>").join("") +
        "</div></section>" +
        '<section class="u-sec"><h2>Mistakes notebook <span class="sub">' + ui.jp("{間違|まちが}いノート", { tokens: false }) + "</span></h2>" +
        "<p>" + (nm ? "You have " + U.plural(nm, "item") + " to practise. Get each one right twice and it leaves the notebook." : "Nothing here yet. Anything you get wrong in lessons, reviews and games is collected here to practise later.") + "</p>" +
        '<div class="row wrap">' + (nm ? '<a class="btn primary" href="#practice">Practise mistakes</a>' : "") + '<a class="btn ghost" href="#mistakes">Open the notebook</a></div></section>' +
        '<section class="u-sec"><h2>Line exams <span class="sub">' + ui.jp("{検定|けんてい}", { tokens: false }) + "</span></h2>" +
        "<p>20 mixed questions from one line. Pass with 80% to turn the line gold in your stamp book. Best taken once you've finished the line.</p><ul class=\"exam-list\">" +
        NI.course.lines
          .map((l) => {
            const pct = NI.store.state.exams[l.id];
            const units = l.units.map((n) => NI.course.unit(n)).filter(Boolean);
            const done = units.filter((u) => NI.game.stamps().find((s) => s.unit.n === u.n && s.done)).length;
            return (
              '<li class="line-' + l.color + (pct >= 80 ? " passed" : "") + '"><span class="line-badge" aria-hidden="true">' + l.id + "</span>" +
              '<span class="ex-t"><b>' + ui.jp(l.ja, { tokens: false }) + "</b><span>" + esc(l.en) + " · " + done + "/" + units.length + " stations" + (pct != null ? " · best " + pct + "%" : "") + "</span></span>" +
              '<a class="btn small ' + (done === units.length && !(pct >= 80) ? "primary" : "ghost") + '" href="#exam-' + l.id + '">' + (pct >= 80 ? "★ Retake" : "Take exam") + "</a></li>"
            );
          })
          .join("") +
        "</ul></section>";
      return html;
    },
  };

  // ---------------------------------------------------------------------------
  // Mistakes notebook

  pages.mistakes = {
    title: "Mistakes notebook",
    nav: "play",
    render() {
      const M = NI.store.state.mistakes;
      const refs = Object.keys(M).filter((r) => NI.items.get(r)).sort((a, b) => M[b].n - M[a].n || M[b].t - M[a].t);
      let html =
        '<header class="page-head"><h1>Mistakes notebook <span class="sub">' + ui.jp("{間違|まちが}いノート", { tokens: false }) + "</span></h1>" +
        "<p>Words and sentences you got wrong recently. Mistakes are useful: practising exactly what you missed is one of the fastest ways to improve. Get an item right twice in practice and it's cleared.</p>" +
        (refs.length ? '<div class="row wrap"><a class="btn primary" href="#practice">Practise ' + U.plural(Math.min(12, refs.length), "item") + "</a></div>" : "") + "</header>";
      if (!refs.length) return html + '<p class="empty">The notebook is empty. Nice!</p>';
      html +=
        '<ul class="mistakes">' +
        refs
          .map((r) => {
            const it = NI.items.get(r);
            const m = M[r];
            const jp = it.kind === "word" ? it.head : it.jp;
            return (
              '<li><div class="mk-jp">' + (it.em ? ui.em(it) : "") + ui.jp(jp, { tokens: it.kind !== "word" }) +
              '<span class="s-tools">' + ui.say(it.kind === "word" ? ui.wordAudio(it) : ui.sentenceAudio(jp)) + (it.kind === "word" ? "" : ui.breakdownBtn(jp, it.en)) + "</span></div>" +
              '<p class="en">' + esc(it.en) + "</p>" +
              '<p class="mk-meta">Missed ' + U.plural(m.n, "time") + (m.ok ? " · right once since" : "") + ' · <a href="#unit-' + it.unit + '">' + esc(NI.course.code(it.unit)) + "</a></p>" +
              '<button class="icon-btn mk-del" type="button" data-del="' + esc(r) + '" aria-label="Remove from the notebook" title="Remove">' + ui.ICON.close + "</button></li>"
            );
          })
          .join("") +
        "</ul>";
      return html;
    },
    mount(el) {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-del]");
        if (!b) return;
        NI.store.removeMistake(b.getAttribute("data-del"));
        b.closest("li").remove();
        ui.toast("Removed from the notebook.");
      });
    },
  };

  // ---------------------------------------------------------------------------
  // Shared game screen

  function gameShell(g, statsHtml) {
    return (
      '<div class="sess-top">' +
      '<button class="icon-btn" type="button" data-quit aria-label="Leave">' + ui.ICON.close + "</button>" +
      '<div class="sess-title"><b>' + g.icon + " " + esc(g.t) + "</b><span>" + ui.jp(g.ja, { tokens: false }) + "</span></div>" +
      '<span class="g-stats" aria-live="polite">' + (statsHtml || "") + "</span></div>" +
      '<div class="sess-bar"></div><div class="game-area"></div>'
    );
  }

  function intro(box, g, rulesHtml, options, onStart) {
    const best = NI.store.state.games[g.id];
    box.innerHTML =
      gameShell(g) +
      "";
    box.querySelector(".game-area").innerHTML =
      '<div class="game-intro"><span class="g-icon big" aria-hidden="true">' + g.icon + "</span><h2>" + esc(g.t) + "</h2>" + rulesHtml +
      (best != null ? '<p class="g-best">Your best: ' + esc(g.best(best)) + "</p>" : "") +
      (options ? '<div class="g-setup">' + options + "</div>" : "") +
      '<div class="row center"><button class="btn primary big" type="button" data-start>Start</button></div></div>';
    box.querySelector("[data-quit]").addEventListener("click", () => NI.app.go("play"));
    const start = box.querySelector("[data-start]");
    start.addEventListener("click", () => onStart(box.querySelector(".game-intro")));
    start.focus();
  }

  // Relaxed rounds have no clock and no lives, and don't set records.
  const relaxedBox = (what) =>
    '<label class="toggle"><input type="checkbox" id="g-relax"' + (NI.store.settings.relaxed ? " checked" : "") + "><span><b>Relaxed round</b><small>" + what + "</small></span></label>";
  const isRelaxed = (el) => {
    const c = el && el.querySelector("#g-relax");
    return !!(c && c.checked);
  };

  function results(box, g, o) {
    const isBest = !o.relaxed && NI.store.setBest(g.id, o.score, o.lowerIsBetter);
    if (o.relaxed) NI.store.log("g", 1);
    const res = NI.fx.gain(o.xp, { inline: true });
    if (isBest) NI.fx.confetti(box);
    NI.fx.play(isBest ? "level" : "chime");
    const area = box.querySelector(".game-area");
    area.innerHTML =
      '<div class="finish">' +
      "<h2>" + ui.jp(isBest ? "{新記録|しんきろく}！" : "お{疲|つか}れ{様|さま}！", { tokens: false }) + "</h2>" +
      '<p class="finish-en">' + o.summary + (o.relaxed ? "" : isBest ? " <b>New personal best!</b>" : " Best: " + esc(g.best(NI.store.state.games[g.id])) + ".") + "</p>" +
      NI.session.xpBlock(res, [["Game", o.xp]]) +
      (o.missed && o.missed.length
        ? '<div class="missed"><h3>To practise</h3><ul>' + o.missed.map((w) => "<li>" + ui.jp(w.head, { tokens: false }) + ' <span class="muted">' + esc(w.en) + "</span></li>").join("") + "</ul><p class=\"small muted\">Added to your mistakes notebook.</p></div>"
        : "") +
      '<div class="row center wrap"><button class="btn primary" type="button" data-again>Play again</button><a class="btn ghost" href="#play">More games</a></div></div>';
    area.querySelector("[data-again]").addEventListener("click", o.again);
    area.querySelector("[data-again]").focus();
  }

  // ---------------------------------------------------------------------------
  // Time Attack: 60 seconds of meaning questions

  const TA_RELAXED = 20;

  function timeAttack(box) {
    const g = GAMES[0];
    const listenOk = NI.speech.canListen;
    const opts =
      '<fieldset class="g-opts"><legend>Questions</legend>' +
      '<label class="radio"><input type="radio" name="ta-mode" value="mix" checked><span><b>Mixed</b></span></label>' +
      '<label class="radio"><input type="radio" name="ta-mode" value="jp"><span><b>Japanese → English</b></span></label>' +
      '<label class="radio"><input type="radio" name="ta-mode" value="en"><span><b>English → Japanese</b></span></label>' +
      (listenOk ? '<label class="radio"><input type="radio" name="ta-mode" value="ear"><span><b>Listening</b><small>Hear the word, pick its meaning</small></span></label>' : "") +
      '<label class="radio"><input type="radio" name="ta-mode" value="pic"><span><b>Pictures</b><small>See a picture, pick the Japanese word</small></span></label>' +
      "</fieldset>";
    intro(box, g, "<p>Answer as many as you can in 60 seconds. A wrong answer costs a moment while the right one is shown.</p>", opts + relaxedBox("No clock: " + TA_RELAXED + " questions at your own pace."), (el) => {
      const mode = (el.querySelector('input[name="ta-mode"]:checked') || {}).value || "mix";
      play(mode, isRelaxed(el));
    });

    function play(mode, relaxed) {
      const words = wordPool(12).filter((w) => w.en && w.pos !== "int");
      // Picture mode needs words with a picture; fall back to every one taught so far.
      const pics = words.filter((w) => w.em);
      const step = NI.nextStep();
      const pool = mode !== "pic" ? words : pics.length >= 8 ? pics : NI.course.words.filter((w) => w.em && w.unit <= Math.max(3, step ? step.u.n : 99));
      const area = box.querySelector(".game-area");
      const stats = box.querySelector(".g-stats");
      const barBox = box.querySelector(".sess-bar");
      const rng = U.rng(Date.now());
      let score = 0;
      let left = 60;
      let over = false;
      const missed = [];
      let lastTick = 61;
      const t0 = Date.now();
      const order = U.shuffle(pool, rng);
      let k = 0;
      let answered = 0;
      const status = () => (stats.innerHTML = relaxed ? "<b>" + score + "</b> right · " + answered + "/" + TA_RELAXED : "<b>" + score + "</b> pts · " + Math.ceil(left) + " s");
      if (relaxed) {
        barBox.innerHTML = ui.progressBar(0, "Questions");
        status();
      }
      const timer = relaxed ? null : setInterval(() => {
        left = Math.max(0, 60 - (Date.now() - t0) / 1000);
        barBox.innerHTML = ui.progressBar(left / 60, "Time left");
        stats.innerHTML = "<b>" + score + "</b> pts · " + Math.ceil(left) + " s";
        if (left <= 5 && Math.ceil(left) < lastTick) {
          lastTick = Math.ceil(left);
          NI.fx.play("tick");
        }
        if (left <= 0) end();
      }, 100);
      box._cleanup = () => clearInterval(timer);
      function end() {
        if (over) return;
        over = true;
        clearInterval(timer);
        NI.session.setKeys(null);
        NI.speech.stop();
        missed.forEach((w) => NI.store.addMistake(w.id));
        results(box, g, { score, relaxed, xp: score * NI.game.XP.gamePoint, summary: relaxed ? "You got " + score + " of " + TA_RELAXED + " right." : "You scored " + score + ".", missed: missed.slice(0, 8), again: () => play(mode, relaxed) });
      }
      function ask() {
        if (over) return;
        const w = order[k++ % order.length];
        const m = mode === "mix" ? U.pick(w.em ? ["jp", "en", "pic"] : ["jp", "en"], rng) : mode;
        const opts = U.shuffle([w].concat(NI.exercises.wordDistractors(w, 3, rng)), rng);
        const prompt =
          m === "ear"
            ? '<div class="prompt-audio"><button class="big-play" type="button" data-say="' + esc(ui.wordAudio(w)) + '" aria-label="Play again">' + ui.ICON.speaker + "</button></div>"
            : m === "pic"
              ? '<div class="prompt-pic" role="img" aria-label="' + esc(w.en) + '">' + w.em + "</div>"
              : m === "jp"
              ? '<div class="prompt-word hand"' + ui.fit(w.head) + ">" + ui.em(w) + ui.jp(w.head, { tokens: false }) + "</div>"
              : '<p class="prompt-en">' + ui.em(w) + esc(w.en) + "</p>";
        area.innerHTML =
          '<div class="ex ta-card">' + prompt +
          '<div class="opts">' + opts.map((o, i) => '<button class="opt" type="button" data-i="' + i + '"><span class="key" aria-hidden="true">' + (i + 1) + '</span><span class="opt-body">' + (m === "en" || m === "pic" ? ui.jp(o.head, { tokens: false }) : esc(o.en)) + "</span></button>").join("") + "</div></div>";
        if (m === "ear") NI.speech.speak(ui.wordAudio(w));
        const btns = Array.from(area.querySelectorAll(".opt"));
        const ci = opts.indexOf(w);
        btns.forEach((b) =>
          b.addEventListener("click", () => {
            if (over || area.dataset.lock) return;
            area.dataset.lock = "1";
            const ok = Number(b.dataset.i) === ci;
            btns.forEach((x, j) => {
              x.disabled = true;
              if (j === ci) x.classList.add("right");
              else if (x === b) x.classList.add("wrong");
            });
            if (ok) {
              score++;
              NI.fx.play("right");
            } else {
              missed.push(w);
              NI.fx.play("wrong");
            }
            answered++;
            status();
            if (relaxed) barBox.innerHTML = ui.progressBar(answered / TA_RELAXED, "Questions");
            setTimeout(() => {
              delete area.dataset.lock;
              if (relaxed && answered >= TA_RELAXED) return end();
              ask();
            }, ok ? 180 : relaxed ? 1400 : 850);
          })
        );
      }
      NI.session.setKeys((e) => {
        if (/^[1-4]$/.test(e.key)) {
          const b = area.querySelectorAll(".opt")[Number(e.key) - 1];
          if (b && !b.disabled) {
            e.preventDefault();
            b.click();
          }
        }
      });
      ask();
    }
  }

  // ---------------------------------------------------------------------------
  // Kana Rain

  function kanaSet(kind, dakuten) {
    const D = NI.data.kana;
    const rows = D.ROWS.concat(dakuten ? D.DAKUTEN : []);
    const out = [];
    for (const r of rows) for (const c of r.cells) if (c && c[0] !== "ぢ" && c[0] !== "づ") out.push({ h: c[0], ro: c[1] });
    return out;
  }

  const KR_RELAXED = 30;

  function kanaRain(box) {
    const g = GAMES[1];
    const opts =
      '<fieldset class="g-opts"><legend>Which kana?</legend>' +
      '<label class="radio"><input type="radio" name="kr-set" value="hira"><span><b>Hiragana</b></span></label>' +
      '<label class="radio"><input type="radio" name="kr-set" value="kata" checked><span><b>Katakana</b></span></label>' +
      '<label class="radio"><input type="radio" name="kr-set" value="both"><span><b>Both</b></span></label></fieldset>' +
      '<label class="toggle"><input type="checkbox" id="kr-dk"><span><b>Add が, ざ, ぱ …</b><small>Kana with dakuten and handakuten</small></span></label>';
    intro(box, g, "<p>Kana fall from the sky. Type each one in romaji (ka, shi, tsu…) before it lands. Three misses and the round is over.</p>", opts + relaxedBox("Slower kana and no hearts to lose: the round ends after " + KR_RELAXED + " kana."), (el) => {
      const kind = (el.querySelector('input[name="kr-set"]:checked') || {}).value || "kata";
      play(kind, el.querySelector("#kr-dk").checked, isRelaxed(el));
    });

    function play(kind, dk, relaxed) {
      const area = box.querySelector(".game-area");
      const stats = box.querySelector(".g-stats");
      box.querySelector(".sess-bar").innerHTML = "";
      area.innerHTML =
        '<div class="rain" aria-label="Falling kana"><div class="rain-floor" aria-hidden="true"></div></div>' +
        '<div class="answer-row rain-input"><label class="sr" for="kr-in">Type the romaji</label><input id="kr-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type romaji: ka, shi, tsu…" lang="en"></div>';
      const sky = area.querySelector(".rain");
      const input = area.querySelector("#kr-in");
      const set = kanaSet(kind, dk);
      let drops = [];
      let score = 0;
      let lives = 3;
      let over = false;
      let last = performance.now();
      let spawnIn = 400;
      let elapsed = 0;
      let spawned = 0;
      let landed = 0;
      const missed = new Map();
      const draw = () => (stats.innerHTML = "<b>" + score + "</b> kana · " + (relaxed ? score + landed + "/" + KR_RELAXED : "❤️".repeat(lives) + "🤍".repeat(3 - lives)));
      draw();
      function spawn() {
        const base = U.pick(set);
        const kata = kind === "kata" || (kind === "both" && Math.random() < 0.5);
        const k = { h: base.h, ro: base.ro, show: kata ? NI.kana.toKatakana(base.h) : base.h };
        const el = document.createElement("span");
        el.className = "drop";
        el.setAttribute("lang", "ja");
        el.textContent = k.show;
        el.style.left = 6 + Math.random() * 82 + "%";
        sky.appendChild(el);
        drops.push({ k, el, y: 0, v: (0.12 + Math.min(0.18, elapsed / 300000) + Math.random() * 0.02) * (relaxed ? 0.6 : 1) });
        spawned++;
      }
      function frame(now) {
        if (over) return;
        const dt = Math.min(64, now - last);
        last = now;
        elapsed += dt;
        spawnIn -= dt;
        if (spawnIn <= 0 && !(relaxed && spawned >= KR_RELAXED)) {
          spawn();
          spawnIn = Math.max(650, 1800 - elapsed / 40) * (relaxed ? 1.5 : 1);
        }
        const h = sky.clientHeight - 40;
        for (const d of drops.slice()) {
          d.y += (d.v * dt) / 10;
          d.el.style.transform = "translateY(" + (d.y / 100) * h + "px)";
          if (d.y >= 100) {
            drops.splice(drops.indexOf(d), 1);
            d.el.classList.add("splash");
            setTimeout(() => d.el.remove(), 400);
            if (!relaxed) lives--;
            landed++;
            missed.set(d.k.show, d.k.ro);
            NI.store.kanaResult(d.k.show, false);
            NI.fx.play("wrong");
            draw();
            if (lives <= 0 || roundOver()) return end();
          }
        }
        box._raf = requestAnimationFrame(frame);
      }
      // A relaxed round ends once every kana has been caught or has landed.
      const roundOver = () => relaxed && spawned >= KR_RELAXED && !drops.length;
      let ended = false;
      function end() {
        if (ended) return;
        ended = true;
        over = true;
        cancelAnimationFrame(box._raf);
        input.disabled = true;
        const list = Array.from(missed.entries());
        results(box, g, {
          score,
          relaxed,
          xp: score,
          summary: "You caught " + score + (relaxed ? " of " + KR_RELAXED : "") + " kana." + (list.length ? " Missed: " + list.map(([k, r]) => k + " (" + r + ")").join(", ") + "." : ""),
          again: () => play(kind, dk, relaxed),
        });
      }
      input.addEventListener("input", () => {
        const typed = input.value.toLowerCase().replace(/[^a-z']/g, "");
        if (!typed) return;
        // A lone "n" waits while な, に … are falling too; "nn" is always ん.
        if (typed === "n" && drops.some((d) => d.k.ro.length > 1 && d.k.ro[0] === "n")) return;
        const kana = NI.kana.romajiToHiragana(typed, true);
        const hit = drops
          .filter((d) => d.k.h === kana || (d.k.h === "を" && kana === "お"))
          .sort((a, b) => b.y - a.y)[0];
        if (hit) {
          drops.splice(drops.indexOf(hit), 1);
          hit.el.classList.add("pop");
          setTimeout(() => hit.el.remove(), 300);
          score++;
          NI.store.kanaResult(hit.k.show, true);
          NI.fx.play("right");
          input.value = "";
          draw();
          if (roundOver()) end();
        } else if (typed.length >= 3 && !drops.some((d) => d.k.ro.startsWith(typed))) {
          input.value = "";
        }
      });
      const vis = () => {
        if (document.hidden && !over) {
          over = true;
          cancelAnimationFrame(box._raf);
          area.insertAdjacentHTML("afterbegin", '<p class="note">Paused because the page was hidden.</p>');
          setTimeout(end, 300);
        }
      };
      document.addEventListener("visibilitychange", vis);
      box._cleanup = () => {
        over = true;
        cancelAnimationFrame(box._raf);
        document.removeEventListener("visibilitychange", vis);
      };
      input.focus();
      box._raf = requestAnimationFrame((t) => {
        last = t;
        frame(t);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Memory Match

  function memory(box) {
    const g = GAMES[2];
    intro(box, g, "<p>Twelve cards hide six words and their meanings. Turn over two at a time and find the pairs.</p>", relaxedBox("No clock: just find the pairs."), (el) => play(isRelaxed(el)));

    function play(relaxed) {
      const rng = U.rng(Date.now());
      const pool = U.shuffle(wordPool(6).filter((w) => w.en && w.pos !== "int"), rng);
      const pick = [];
      for (const w of pool) {
        if (pick.length >= 6) break;
        if (!pick.some((p) => p.r === w.r || NI.exercises.overlaps(p.en, w.en))) pick.push(w);
      }
      const cards = U.shuffle(pick.map((w) => ({ w, side: "jp" })).concat(pick.map((w) => ({ w, side: "en" }))), rng);
      const area = box.querySelector(".game-area");
      const stats = box.querySelector(".g-stats");
      box.querySelector(".sess-bar").innerHTML = "";
      area.innerHTML =
        '<div class="memory">' +
        cards
          .map(
            (c, i) =>
              '<button class="mem-card" type="button" data-i="' + i + '" aria-label="Card ' + (i + 1) + ', face down"><span class="mem-back" aria-hidden="true">一歩</span><span class="mem-face">' +
              (c.side === "jp" ? ui.em(c.w) + ui.jp(c.w.head, { tokens: false }) : esc(c.w.en)) + "</span></button>"
          )
          .join("") +
        "</div>";
      const t0 = Date.now();
      let moves = 0;
      let open = [];
      let pairs = 0;
      let lock = false;
      const tick = setInterval(() => (stats.innerHTML = (relaxed ? "" : Math.floor((Date.now() - t0) / 1000) + " s · ") + moves + " moves"), 250);
      box._cleanup = () => clearInterval(tick);
      area.querySelectorAll(".mem-card").forEach((b) =>
        b.addEventListener("click", () => {
          if (lock || b.classList.contains("up")) return;
          const c = cards[Number(b.dataset.i)];
          b.classList.add("up");
          b.setAttribute("aria-label", c.side === "jp" ? NI.furi.base(c.w.head) : c.w.en);
          if (c.side === "jp" && NI.store.settings.autoplay) NI.speech.speak(ui.wordAudio(c.w));
          open.push({ b, c });
          if (open.length < 2) return;
          moves++;
          const [a, z] = open;
          open = [];
          if (a.c.w.id === z.c.w.id) {
            a.b.classList.add("matched");
            z.b.classList.add("matched");
            NI.fx.play("right");
            if (++pairs === cards.length / 2) {
              clearInterval(tick);
              const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
              setTimeout(() => results(box, g, { score: secs, relaxed, lowerIsBetter: true, xp: 20, summary: relaxed ? "All pairs in " + moves + " moves." : "All pairs in " + secs + " s and " + moves + " moves.", again: () => play(relaxed) }), 500);
            }
          } else {
            lock = true;
            NI.fx.play("wrong");
            setTimeout(() => {
              a.b.classList.remove("up");
              z.b.classList.remove("up");
              a.b.setAttribute("aria-label", "Face down");
              z.b.setAttribute("aria-label", "Face down");
              lock = false;
            }, 900);
          }
        })
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Sentence Sprint: five sentences from their tiles

  function sprint(box) {
    const g = GAMES[3];
    const pool = sentencePool();
    if (pool.length < 5) {
      intro(box, g, "<p>Finish a few lesson parts first: this game builds sentences from the units you've reached.</p>", "", () => NI.app.go("home"));
      return;
    }
    intro(box, g, "<p>Put each sentence in order as fast as you can. A wrong answer adds 5 seconds.</p>", relaxedBox("No clock: take your time over each sentence."), (el) => play(isRelaxed(el)));

    function play(relaxed) {
      const rng = U.rng(Date.now());
      const list = U.sample(pool, 5, rng);
      const area = box.querySelector(".game-area");
      const stats = box.querySelector(".g-stats");
      const t0 = Date.now();
      let penalty = 0;
      let k = 0;
      let right = 0;
      const tick = setInterval(() => (stats.innerHTML = (relaxed ? "" : Math.floor((Date.now() - t0) / 1000 + penalty) + " s · ") + k + "/5"), 250);
      box._cleanup = () => clearInterval(tick);
      const nextOne = () => {
        box.querySelector(".sess-bar").innerHTML = ui.progressBar(k / 5, "Sentences");
        if (k >= 5) {
          clearInterval(tick);
          const secs = Math.round((Date.now() - t0) / 1000 + penalty);
          return results(box, g, { score: secs, relaxed, lowerIsBetter: true, xp: right * 5, summary: relaxed ? right + " of 5 right." : right + " of 5 right in " + secs + " s" + (penalty ? " (incl. " + penalty + " s penalty)" : "") + ".", again: () => play(relaxed) });
        }
        const s = list[k];
        const ex = NI.exercises.T.build(s, rng);
        area.innerHTML = '<div class="ex ex-build">' + ex.html() + "</div>";
        ex.mount(area.firstElementChild, {
          done: (ok) => {
            if (ok) {
              right++;
              NI.fx.play("right");
            } else {
              penalty += 5;
              NI.fx.play("wrong");
              if (s.id) NI.store.addMistake(s.id);
              area.insertAdjacentHTML("beforeend", '<div class="sol center">' + ui.jp(s.jp, { tokens: false }) + "</div>");
            }
            k++;
            setTimeout(nextOne, ok ? 500 : 1800);
          },
        });
      };
      nextOne();
    }
  }

  const RUN = { timeattack: timeAttack, kanarain: kanaRain, memory, sprint };

  pages.game = {
    session: true,
    nav: "play",
    title(args) {
      const g = GAMES.find((x) => x.id === args[0]);
      return g ? g.t : "Game";
    },
    render(args) {
      return RUN[args[0]] ? '<div class="session game" id="game"></div>' : '<p class="empty">That game doesn\'t exist. <a href="#play">Back to Play</a></p>';
    },
    mount(el, args) {
      const box = el.querySelector("#game");
      if (box && RUN[args[0]]) RUN[args[0]](box);
    },
    unmount() {
      const box = document.getElementById("game");
      if (box && box._cleanup) box._cleanup();
      if (box && box._raf) cancelAnimationFrame(box._raf);
      NI.session.setKeys(null);
      NI.speech.stop();
    },
  };

  NI.games = { GAMES, wordPool, sentencePool };
})(typeof window !== "undefined" ? window : globalThis);
