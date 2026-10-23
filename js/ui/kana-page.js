/* Kana trainer: charts with audio, quick-fire drills (katakana → hiragana,
   kana → romaji), loanword reading and look-alike katakana. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const K = NI.kana;
  const pages = (NI.pages = NI.pages || {});

  const TABS = [
    ["kata", "Katakana", "カタカナ"],
    ["hira", "Hiragana check", "ひらがな"],
    ["loan", "Loanwords", "がいらいご"],
    ["pairs", "Look-alikes", "にている じ"],
  ];

  function groupsFor(script) {
    const D = NI.data.kana;
    const g = [
      { id: "basic", label: "Basic 46", rows: D.ROWS },
      { id: "daku", label: "゛ and ゜ (dakuten)", rows: D.DAKUTEN },
      { id: "yoon", label: "Small ゃゅょ combinations", rows: D.YOON },
    ];
    if (script === "kata") g.push({ id: "ext", label: "Extra katakana sounds", rows: D.EXTENDED, kataOnly: true });
    return g;
  }

  // Cells for a script: katakana is derived from the hiragana tables.
  const cellKana = (cell, script, row) => (row && row.kataOnly ? cell[0] : script === "kata" ? K.toKatakana(cell[0]) : cell[0]);

  function chart(script) {
    let html = "";
    for (const g of groupsFor(script)) {
      html += '<section class="kana-group"><h3>' + esc(g.label) + '</h3><div class="kana-grid cols-' + g.rows[0].cells.length + '">';
      for (const row of g.rows) {
        for (const cell of row.cells) {
          if (!cell) {
            html += '<span class="k-cell empty" aria-hidden="true"></span>';
            continue;
          }
          const k = g.kataOnly ? cell[0] : cellKana(cell, script);
          const hira = K.toHiragana(k);
          const stat = NI.store.state.kana[k];
          const weak = stat && stat[1] > stat[0] ? " weak" : "";
          html +=
            '<button class="k-cell' + weak + '" type="button" data-say="' + esc(hira) + '" aria-label="' + esc(k + " " + cell[1]) + '">' +
            '<span class="k-big" lang="ja">' + esc(k) + "</span>" +
            '<span class="k-rom">' + esc(cell[1]) + "</span>" +
            (script === "kata" ? '<span class="k-hira" lang="ja">' + esc(hira) + "</span>" : "") +
            "</button>";
        }
      }
      html += "</div></section>";
    }
    return html;
  }

  function poolFor(script, groups) {
    const out = [];
    for (const g of groupsFor(script)) {
      if (groups.indexOf(g.id) < 0) continue;
      for (const row of g.rows) for (const cell of row.cells) if (cell) out.push({ k: g.kataOnly ? cell[0] : cellKana(cell, script), rom: cell[1], hira: g.kataOnly ? K.toHiragana(cell[0]) : cell[0] });
    }
    return out;
  }

  function lookalikeOf(k) {
    const set = NI.data.kana.LOOKALIKES.find((s) => s.set.indexOf(k) >= 0);
    return set ? set.set.filter((x) => x !== k) : [];
  }

  // A drill is a list of {prompt, answer, options, after} rendered by quiz().
  function kanaDrill(script, groups, answerMode) {
    const pool = poolFor(script, groups);
    if (!pool.length) return [];
    const stats = NI.store.state.kana;
    const weight = (it) => {
      const s = stats[it.k] || [0, 0];
      return 1 + s[1] * 2 - Math.min(s[0], 4) * 0.15;
    };
    // Weighted sample without replacement: shaky kana come up more often.
    const picks = [];
    const bag = pool.slice();
    while (picks.length < Math.min(20, pool.length)) {
      const total = bag.reduce((a, b) => a + weight(b), 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < bag.length - 1; idx++) {
        r -= weight(bag[idx]);
        if (r <= 0) break;
      }
      picks.push(bag.splice(idx, 1)[0]);
    }
    const label = (it) => (answerMode === "rom" ? it.rom : it.hira);
    return picks.map((it) => {
      const near = lookalikeOf(it.k).map((k) => pool.find((p) => p.k === k)).filter(Boolean);
      const rest = U.shuffle(pool.filter((p) => p !== it && near.indexOf(p) < 0 && label(p) !== label(it)));
      const opts = U.shuffle([it].concat(near.slice(0, 2), rest).filter((p, i, a) => a.findIndex((q) => label(q) === label(p)) === i).slice(0, 4));
      return {
        prompt: '<div class="kana-prompt hand" lang="ja">' + esc(it.k) + "</div>",
        options: opts.map((o) => (answerMode === "rom" ? esc(o.rom) : '<span lang="ja" class="hand opt-kana">' + esc(o.hira) + "</span>")),
        answer: opts.indexOf(it),
        audio: it.hira,
        record: (ok) => NI.store.kanaResult(it.k, ok),
        solution: '<span lang="ja">' + esc(it.k) + "</span> = " + (answerMode === "rom" ? esc(it.rom) : '<span lang="ja">' + esc(it.hira) + "</span>") + " (" + esc(it.rom) + ")",
      };
    });
  }

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
    if (tab === "kata" || tab === "hira") {
      const script = tab;
      const intro =
        script === "kata"
          ? "<p>Katakana spells the same sounds as hiragana, mostly for words from other languages: コーヒー (coffee), テレビ (TV). You already know the sounds, so match each katakana to the hiragana you know. Tap any character to hear it.</p>"
          : "<p>A quick check that your hiragana is solid, including the combinations with small ゃ, ゅ, ょ. Tap any character to hear it.</p>";
      const groups = groupsFor(script);
      return (
        intro +
        '<div class="drill-setup"><fieldset><legend>Practise</legend>' +
        groups.map((g, i) => '<label class="check"><input type="checkbox" name="kg" value="' + g.id + '"' + (i === 0 ? " checked" : "") + "> " + esc(g.label) + "</label>").join("") +
        "</fieldset>" +
        (script === "kata"
          ? '<fieldset><legend>Answer with</legend><label class="check"><input type="radio" name="km" value="hira" checked> hiragana</label><label class="check"><input type="radio" name="km" value="rom"> romaji</label></fieldset>'
          : "") +
        '<button class="btn primary" type="button" data-start>Start a 20-question drill</button></div>' +
        '<div class="drill-box session" hidden></div>' +
        '<div class="chart">' + chart(script) + "</div>" +
        '<p class="small muted">Characters you often miss are marked in the chart.</p>'
      );
    }
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
      const tab = TABS.some((t) => t[0] === args[0]) ? args[0] : "kata";
      return (
        '<header class="page-head"><h1>Kana trainer</h1>' +
        '<nav class="tabs" aria-label="Kana sections">' + TABS.map((t) => '<a class="tab' + (t[0] === tab ? " on" : "") + '" href="#kana-' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : "") + "><span>" + esc(t[1]) + '</span><small lang="ja">' + esc(t[2]) + "</small></a>").join("") + "</nav></header>" +
        '<div class="kana-body" data-tab="' + tab + '">' + tabBody(tab) + "</div>"
      );
    },
    mount(el, args) {
      const tab = TABS.some((t) => t[0] === args[0]) ? args[0] : "kata";
      const start = el.querySelector("[data-start]");
      const box = el.querySelector(".drill-box");
      const setup = el.querySelector(".drill-setup");
      const rest = Array.from(el.querySelectorAll(".chart, .loanlist, .pairs"));
      if (!start) return;
      start.addEventListener("click", () => {
        let items;
        if (tab === "loan") items = loanDrill();
        else if (tab === "pairs") items = pairsDrill();
        else {
          const groups = Array.from(el.querySelectorAll('input[name="kg"]:checked')).map((x) => x.value);
          if (!groups.length) return ui.toast("Choose at least one set to practise.");
          const m = el.querySelector('input[name="km"]:checked');
          items = kanaDrill(tab, groups, tab === "hira" ? "rom" : m ? m.value : "hira");
        }
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
          box.innerHTML =
            '<div class="finish">' + (res.right / res.total >= 0.8 ? NI.session.hanamaru() : "") +
            "<h2>" + res.right + " / " + res.total + "</h2><p>" + (res.right === res.total ? "Perfect!" : res.right / res.total >= 0.8 ? "Nearly there." : "Keep at it: a few short drills a day work best.") + "</p>" +
            '<div class="row center wrap"><button class="btn primary" type="button" data-again>Go again</button><button class="btn ghost" type="button" data-back>Back to the chart</button></div></div>';
          box.querySelector("[data-again]").addEventListener("click", () => start.click());
          box.querySelector("[data-back]").addEventListener("click", () => NI.app.render());
        });
      });
    },
    unmount() {
      NI.session.setKeys(null);
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
