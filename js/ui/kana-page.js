/* Kana trainer: practice and tests (kana-practice.js), a chart of hiragana
   and katakana side by side with audio, stroke order and how well you know
   each one, handwriting, loanword reading and look-alike katakana. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const K = NI.kana;
  const doc = root.document;
  const pages = (NI.pages = NI.pages || {});

  const TABS = [
    ["practice", "Practice", "れんしゅう"],
    ["chart", "Chart", "ひょう"],
    ["write", "Write", "かく"],
    ["loan", "Loanwords", "がいらいご"],
    ["pairs", "Look-alikes", "にている じ"],
  ];
  // Older links: #kana-kata, #kana-hira and #kana-test open a ready-made practice.
  const ALIAS = { kata: "kata", hira: "hira", test: "mixed" };
  const tabOf = (args) => (ALIAS[args[0]] ? "practice" : TABS.some((t) => t[0] === args[0]) ? args[0] : "practice");

  // ---------------------------------------------------------------------------
  // The chart

  const LEVEL = { known: "Known", learning: "Learning", weak: "Needs practice", new: "Not practised yet" };

  function cell(k, rom) {
    const lv = NI.kanaPractice.level(k);
    return '<button class="kc-cell lv-' + lv + '" type="button" data-kc="' + esc(k) + '" aria-label="' + esc(k + ", " + rom + ": " + LEVEL[lv]) + '"><b lang="ja">' + esc(k) + "</b><small>" + esc(rom) + "</small></button>";
  }
  const cellsOf = (r) => r.cells.filter(Boolean);

  function chartBody() {
    const D = NI.data.kana;
    const side = (row, kata) => '<div class="kc-side">' + cellsOf(row).map((c) => cell(kata ? K.toKatakana(c[0]) : c[0], c[1])).join("") + "</div>";
    const rows = (list) => list.map((r) => '<div class="kc-row">' + side(r, false) + side(r, true) + "</div>").join("");
    // わ を and ん share a line, as on most charts.
    const basic = D.ROWS.filter((r) => r.id !== "n").map((r) => (r.id === "wa" ? { id: "wa", cells: r.cells.concat(D.ROWS.find((x) => x.id === "n").cells) } : r));
    const P = NI.kanaPractice;
    return (
      "<p>Katakana spells the same sounds as hiragana, mostly for words from other languages: コーヒー (coffee), テレビ (TV). Tap any kana to hear it, watch how it’s written and try writing it.</p>" +
      '<p class="kc-know small">Hiragana <b>' + P.mastery("hira") + "%</b> known · Katakana <b>" + P.mastery("kata") + "%</b> known</p>" +
      '<p class="kc-legend small">' + ["known", "learning", "weak", "new"].map((lv) => '<span class="lv-' + lv + '"><i aria-hidden="true"></i>' + LEVEL[lv] + "</span>").join("") + "</p>" +
      '<div class="kc-chart">' +
      '<div class="kc-row kc-heads" aria-hidden="true"><span>Hiragana</span><span>Katakana</span></div>' +
      '<h3 class="kc-h">Basic</h3>' + rows(basic) +
      '<h3 class="kc-h">With ゛ and ゜</h3>' + rows(D.DAKUTEN) +
      '<h3 class="kc-h">With small ゃ ゅ ょ</h3>' + rows(D.YOON) +
      '<h3 class="kc-h">Extra katakana for other languages</h3>' +
      '<div class="kc-extra">' + D.EXTENDED.map((r) => '<div class="kc-side">' + cellsOf(r).map((c) => cell(c[0], c[1])).join("") + "</div>").join("") + "</div>" +
      "</div>" +
      '<p class="small muted">Known means right three times in a row. Stroke order from <a href="http://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a> (CC BY-SA 3.0).</p>'
    );
  }

  // Up to three words with the kana, ones that start with it first.
  function examples(k) {
    const kata = K.hasKatakana(k);
    const list = kata
      ? NI.data.kana.LOANWORDS.map((w) => ({ show: w.k, say: w.k, en: w.en }))
      : NI.course.words.filter((w) => w.en && /^[ぁ-ゖー]+$/.test(w.r)).map((w) => ({ show: w.head, say: w.r, en: w.en, r: w.r }));
    const has = (w) => K.toHiragana(w.say).indexOf(K.toHiragana(k)) >= 0;
    const starts = (w) => K.toHiragana(w.say).startsWith(K.toHiragana(k));
    const byLen = (a, b) => a.say.length - b.say.length;
    return list.filter(starts).sort(byLen).concat(list.filter((w) => has(w) && !starts(w)).sort(byLen)).slice(0, 3);
  }

  // The card for one kana: its sound, stroke order, your record, words with it.
  function sheet(k) {
    const m = doc.getElementById("modal");
    if (!m) return;
    ui.hidePop();
    const h = K.toHiragana(k);
    const pair = Array.from(h).length === Array.from(k).length ? [h, K.toKatakana(h)] : [k];
    const rom = NI.kanaPractice.toRomaji(k);
    const s = NI.store.state.kana[k];
    const lv = NI.kanaPractice.level(k);
    const ex = examples(k);
    const chars = (w) => Array.from(w).filter((c) => NI.strokes.has(c));
    let showing = k;
    m.innerHTML =
      '<div class="modal-card kc-card" role="dialog" aria-modal="true" aria-labelledby="kc-title">' +
      '<div class="bd-head"><h2 id="kc-title"><span lang="ja">' + esc(k) + "</span> " + esc(rom) + "</h2>" +
      '<button class="icon-btn" type="button" data-kc-close aria-label="Close">' + ui.ICON.close + "</button></div>" +
      (pair.length > 1 ? '<div class="kc-pick" role="group" aria-label="Script">' + pair.map((x) => '<button type="button" class="kc-pk" data-show="' + esc(x) + '" aria-pressed="' + (x === k) + '"><span lang="ja">' + esc(x) + "</span><small>" + (K.hasKatakana(x) ? "katakana" : "hiragana") + "</small></button>").join("") + "</div>" : "") +
      '<div class="kc-draw"></div>' +
      '<div class="row center wrap kc-btns">' +
      (NI.speech.supported ? '<button class="btn small" type="button" data-say="' + esc(h) + '">' + ui.ICON.speaker + "<span>Listen</span></button>" : "") +
      '<button class="btn small ghost" type="button" data-kc="replay">' + ui.ICON.repeat + "<span>Replay</span></button>" +
      '<button class="btn small ghost" type="button" data-kc="trace">Trace it</button>' +
      '<button class="btn small ghost" type="button" data-kc="memory">From memory</button></div>' +
      '<p class="kc-rec small lv-' + lv + '"><i aria-hidden="true"></i>' + esc(LEVEL[lv]) + (s ? " · " + U.plural(s[0], "right answer") + ", " + s[1] + " missed" : "") + "</p>" +
      (ex.length
        ? '<ul class="kc-words">' + ex.map((w) => "<li>" + (NI.speech.supported ? ui.say(w.say, w.say, "small") : "") + '<span class="jp">' + ui.jp(w.show, { tokens: false }) + "</span><span>" + esc(w.en) + "</span></li>").join("") + "</ul>"
        : "") +
      '<div class="row center"><button class="btn primary small" type="button" data-kc="practise">Practise this row</button></div>' +
      "</div>";
    m.hidden = false;
    const box = m.querySelector(".kc-draw");
    let anim = null;
    const show = (mode) => {
      if (anim) anim.stop();
      const cs = chars(showing);
      if (mode === "trace" || mode === "memory") {
        // One character at a time: the first, then the next when it's done.
        let i = 0;
        const one = () => {
          box.innerHTML = '<div class="kc-pad"></div><p class="small muted kc-pad-note">' + (mode === "trace" ? "Trace each stroke from the dot, in order." : "Write it from memory, stroke by stroke.") + "</p>";
          NI.strokes.pad(box.querySelector(".kc-pad"), cs[i], {
            guide: mode === "trace",
            arrows: mode === "trace",
            loose: mode === "memory",
            onStroke: (r) => NI.fx.play(r.ok ? "tick" : "wrong"),
            onDone: ({ mistakes }) => {
              NI.store.log("wr", 1);
              if (++i < cs.length) return setTimeout(one, 600);
              NI.fx.play(mistakes ? "chime" : "right");
              if (NI.speech.supported) NI.speech.speak(h);
            },
          });
        };
        return one();
      }
      box.innerHTML = '<div class="kc-diagrams">' + cs.map((c) => NI.strokes.diagram(c)).join("") + "</div>" + '<p class="small muted">' + esc(cs.map((c) => U.plural(NI.strokes.count(c), "stroke")).join(" + ")) + "</p>";
      anim = NI.strokes.animate(box);
    };
    show();
    const close = () => {
      if (anim) anim.stop();
      m.hidden = true;
      m.innerHTML = "";
      doc.removeEventListener("keydown", onKey, true);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    doc.addEventListener("keydown", onKey, true);
    m.onclick = (e) => {
      if (e.target === m || e.target.closest("[data-kc-close]")) return close();
      const pk = e.target.closest("[data-show]");
      if (pk) {
        showing = pk.getAttribute("data-show");
        m.querySelectorAll("[data-show]").forEach((b) => b.setAttribute("aria-pressed", String(b === pk)));
        return show();
      }
      const b = e.target.closest("[data-kc]");
      if (!b) return;
      const what = b.getAttribute("data-kc");
      if (what === "replay") return show();
      if (what === "trace" || what === "memory") return show(what);
      if (what === "practise") {
        close();
        NI.kanaPractice.preset(rowOf(showing));
        NI.app.go("kana-practice");
      }
    };
    const first = m.querySelector("[data-kc-close]");
    if (first) first.focus();
  }

  // The practice set for the row a kana is in.
  function rowOf(k) {
    const card = NI.kanaPractice.groups()[K.hasKatakana(k) ? "kata" : "hira"].filter((g) => g.id !== "alike").flatMap((g) => g.cards).find((c) => c.kana.indexOf(k) >= 0);
    return { pick: "manual", cards: card ? [card.id] : [], mode: "train" };
  }

  // ---------------------------------------------------------------------------
  // Loanword and look-alike drills

  function loanDrill() {
    const L = NI.data.kana.LOANWORDS;
    return U.sample(L, 10).map((w) => {
      const opts = U.shuffle([w].concat(U.sample(L.filter((x) => x !== w), 3)));
      return {
        prompt: '<p class="kicker">What does this mean?</p><div class="kana-word hand" lang="ja">' + esc(w.k) + "</div>",
        options: opts.map((o) => esc(o.en)),
        answer: opts.indexOf(w),
        audio: w.k,
        after: '<p class="loan-after"><span lang="ja" class="hand">' + esc(w.k) + "</span> <span lang=\"ja\">(" + esc(K.toHiragana(w.k)) + ")</span> = " + esc(w.en) + (w.note ? '<br><span class="muted">' + esc(w.note) + "</span>" : "") + "</p>",
        solution: esc(w.en),
      };
    });
  }

  function pairsDrill() {
    const sets = NI.data.kana.LOOKALIKES;
    const items = [];
    for (let n = 0; n < 12; n++) {
      const s = sets[n % sets.length];
      const k = U.pick(s.set);
      const opts = U.shuffle(s.set.slice());
      items.push({
        prompt: '<p class="kicker">Which katakana is this sound?</p><div class="kana-prompt small" lang="ja">' + esc(K.toHiragana(k)) + "</div>",
        options: opts.map((o) => '<span lang="ja" class="hand opt-kana">' + esc(o) + "</span>"),
        answer: opts.indexOf(k),
        audio: K.toHiragana(k),
        record: (ok) => NI.store.kanaResult(k, ok),
        solution: '<span lang="ja">' + esc(K.toHiragana(k)) + " = " + esc(k) + "</span>. " + esc(s.tip),
      });
    }
    return U.shuffle(items);
  }

  // Runs a drill inside `box`, then calls onEnd.
  function quiz(box, items, onEnd) {
    let i = 0;
    let right = 0;
    box.innerHTML = NI.session.shell("Drill", U.plural(items.length, "question"));
    const card = box.querySelector(".sess-card");
    const foot = box.querySelector(".sess-foot");
    const bar = box.querySelector(".sess-bar");
    const count = box.querySelector(".sess-count");
    box.querySelector("[data-quit]").addEventListener("click", () => end(true));

    function show() {
      if (i >= items.length) return end(false);
      const it = items[i];
      bar.innerHTML = ui.progressBar(i / items.length, "Drill progress");
      count.textContent = i + 1 + " / " + items.length;
      card.innerHTML =
        '<div class="ex">' + it.prompt + '<div class="opts">' + it.options.map((o, j) => '<button class="opt" type="button" data-i="' + j + '"><span class="key" aria-hidden="true">' + (j + 1) + '</span><span class="opt-body">' + o + "</span></button>").join("") + "</div></div>";
      foot.hidden = true;
      card.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => pick(Number(b.dataset.i))));
      const first = card.querySelector(".opt");
      if (first) first.focus({ preventScroll: true });
    }

    function pick(j) {
      const it = items[i];
      const btns = card.querySelectorAll(".opt");
      if (btns[0].disabled) return;
      const ok = j === it.answer;
      btns.forEach((b, k) => {
        b.disabled = true;
        if (k === it.answer) b.classList.add("right");
        else if (k === j) b.classList.add("wrong");
      });
      if (ok) right++;
      if (it.record) it.record(ok);
      if (it.audio && NI.store.settings.autoplay) NI.speech.speak(it.audio);
      if (it.after) card.querySelector(".ex").insertAdjacentHTML("beforeend", it.after);
      if (ok && !it.after) {
        // keep the pace up on easy ones
        setTimeout(() => {
          if (items[i] === it) next();
        }, 650);
        return;
      }
      foot.innerHTML = NI.session.feedback(ok, ok ? "" : it.solution);
      foot.hidden = false;
      const b = foot.querySelector("[data-next]");
      b.addEventListener("click", next);
      setTimeout(() => b.focus({ preventScroll: true }), 0);
    }

    function next() {
      i++;
      show();
    }

    function end(quit) {
      NI.session.setKeys(null);
      onEnd(quit ? null : { right, total: items.length });
    }

    NI.session.setKeys((e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (!foot.hidden && e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (/^[1-9]$/.test(e.key)) {
        const b = card.querySelectorAll(".opt")[Number(e.key) - 1];
        if (b && !b.disabled) {
          e.preventDefault();
          b.click();
        }
      }
    });
    show();
  }

  function tabBody(tab) {
    if (tab === "practice") return NI.kanaPractice.body();
    if (tab === "chart") return chartBody();
    if (tab === "write") return NI.kanaWrite.body();
    if (tab === "loan") {
      return (
        "<p>Once you can read katakana, many words are easy to guess: they're borrowed, mostly from English. Watch for the ones made in Japan and the false friends.</p>" +
        '<div class="drill-setup"><button class="btn primary" type="button" data-start>Start: read 10 loanwords</button></div><div class="drill-box session" hidden></div>' +
        '<ul class="loanlist">' + NI.data.kana.LOANWORDS.map((w) => '<li><button class="say-row" type="button" data-say="' + esc(w.k) + '"><span class="hand" lang="ja">' + esc(w.k) + "</span><span>" + esc(w.en) + "</span></button>" + (w.note ? '<p class="small muted">' + esc(w.note) + "</p>" : "") + "</li>").join("") + "</ul>"
      );
    }
    return (
      "<p>A handful of katakana look almost the same. Here is how to tell them apart; then test yourself.</p>" +
      '<div class="drill-setup"><button class="btn primary" type="button" data-start>Start: 12 look-alike questions</button></div><div class="drill-box session" hidden></div>' +
      '<ul class="pairs">' + NI.data.kana.LOOKALIKES.map((s) => '<li><div class="pair-chars hand" lang="ja">' + s.set.map((k) => '<button type="button" class="pair-k" data-say="' + esc(K.toHiragana(k)) + '">' + esc(k) + "</button>").join("") + '</div><p>' + esc(s.tip) + "</p></li>").join("") + "</ul>"
    );
  }

  pages.kana = {
    title: "Kana trainer",
    nav: "kana",
    render(args) {
      const tab = tabOf(args);
      if (ALIAS[args[0]]) NI.kanaPractice.preset(ALIAS[args[0]]);
      return (
        '<header class="page-head"><h1>Kana trainer</h1>' +
        '<nav class="tabs" aria-label="Kana sections">' + TABS.map((t) => '<a class="tab' + (t[0] === tab ? " on" : "") + '" href="#kana-' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : "") + "><span>" + esc(t[1]) + '</span><small lang="ja">' + esc(t[2]) + "</small></a>").join("") + "</nav></header>" +
        '<div class="kana-body" data-tab="' + tab + '">' + tabBody(tab) + "</div>"
      );
    },
    mount(el, args) {
      const tab = tabOf(args);
      if (tab === "practice") return NI.kanaPractice.mount(el);
      if (tab === "write") return NI.kanaWrite.mount(el);
      if (tab === "chart") {
        el.querySelectorAll(".kc-cell").forEach((b) =>
          b.addEventListener("click", () => {
            if (NI.speech.supported) NI.speech.speak(K.toHiragana(b.getAttribute("data-kc")));
            sheet(b.getAttribute("data-kc"));
          })
        );
        return;
      }
      const start = el.querySelector("[data-start]");
      const box = el.querySelector(".drill-box");
      const setup = el.querySelector(".drill-setup");
      const rest = Array.from(el.querySelectorAll(".loanlist, .pairs"));
      if (!start) return;
      start.addEventListener("click", () => {
        const items = tab === "loan" ? loanDrill() : pairsDrill();
        setup.hidden = true;
        rest.forEach((x) => (x.hidden = true));
        box.hidden = false;
        quiz(box, items, (res) => {
          if (!res) {
            box.hidden = true;
            setup.hidden = false;
            rest.forEach((x) => (x.hidden = false));
            return;
          }
          const xp = res.right * NI.game.XP.gamePoint;
          const won = NI.fx.gain(xp, { inline: true });
          NI.fx.play("chime");
          box.innerHTML =
            '<div class="finish">' + (res.right / res.total >= 0.8 ? NI.session.hanamaru() : "") +
            "<h2>" + res.right + " / " + res.total + "</h2><p>" + (res.right === res.total ? "Perfect!" : res.right / res.total >= 0.8 ? "Nearly there." : "Keep at it: a few short drills a day work best.") + "</p>" +
            (xp ? NI.session.xpBlock(won, [["Correct answers", xp]]) : "") +
            '<div class="row center wrap"><button class="btn primary" type="button" data-again>Go again</button><button class="btn ghost" type="button" data-back>Back to the list</button></div></div>';
          box.querySelector("[data-again]").addEventListener("click", () => start.click());
          box.querySelector("[data-back]").addEventListener("click", () => NI.app.render());
        });
      });
    },
    unmount() {
      NI.session.setKeys(null);
      NI.kanaPractice.leave();
      NI.kanaWrite.leave();
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
