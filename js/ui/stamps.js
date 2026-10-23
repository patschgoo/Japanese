/* Stamp book: a station stamp (駅スタンプ) for every finished unit, gold line
   badges for passed line exams, achievement badges, level and records. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const pages = (NI.pages = NI.pages || {});

  // An eki stamp: ring in the line colour, code on an arc, a picture, the name.
  function stampSvg(u, opts) {
    const o = opts || {};
    const line = NI.course.lineOf(u.n);
    const done = o.done !== false;
    const name = NI.furi.base(u.ja);
    // The name sits on a chord of the inner ring about 70 units wide.
    const size = Math.min(13, 68 / Math.max(4, name.length));
    const id = "arc" + u.n + (o.fresh ? "f" : "");
    const tilt = (U.hash("stamp" + u.n) % 13) - 6;
    const st = NI.game.stamps().find((s) => s.unit.n === u.n);
    const date = st && st.date ? new Date(st.date) : null;
    return (
      '<svg class="stamp-svg line-' + (line ? line.color : "h") + (done ? "" : " todo") + (o.fresh ? " fresh" : "") + '" viewBox="0 0 120 120" role="img" aria-label="' + esc(NI.course.code(u.n) + " " + u.en + (done ? " stamp" : " (not collected yet)")) + '" style="--tilt:' + tilt + 'deg">' +
      '<defs><path id="' + id + '" d="M 22 62 A 38 38 0 0 1 98 62"/></defs>' +
      '<circle cx="60" cy="60" r="55" class="st-ring"/><circle cx="60" cy="60" r="49" class="st-ring2"/>' +
      '<text class="st-arc"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">' + esc(NI.course.code(u.n)) + " · " + esc(line ? NI.furi.base(line.ja) : "") + "</textPath></text>" +
      (done ? '<text x="60" y="76" class="st-emoji" text-anchor="middle">' + esc(st ? st.em : "🚉") + "</text>" : '<text x="60" y="74" class="st-q" text-anchor="middle">?</text>') +
      '<text x="60" y="93" class="st-name" text-anchor="middle" style="font-size:' + size.toFixed(1) + 'px">' + esc(name) + "</text>" +
      (done && date ? '<text x="60" y="106" class="st-date" text-anchor="middle">' + date.getFullYear() + "." + (date.getMonth() + 1) + "." + date.getDate() + "</text>" : "") +
      "</svg>"
    );
  }
  NI.stampSvg = stampSvg;

  function weekDots() {
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    return (
      '<ol class="week" aria-label="Last seven days">' +
      NI.game
        .week()
        .map((d) => {
          const dt = new Date(d.key + "T12:00:00");
          return '<li class="' + (d.on ? "on" : d.rest ? "rest" : "") + (d.today ? " is-today" : "") + '" title="' + esc(d.key) + (d.on ? ": practised" : d.rest ? ": rest day" : "") + '"><span>' + (d.rest ? "🎫" : days[dt.getDay()]) + "</span></li>";
        })
        .join("") +
      "</ol>"
    );
  }
  NI.weekDots = weekDots;

  pages.stamps = {
    title: "Stamp book",
    nav: "more",
    render() {
      const st = NI.store.state;
      const L = NI.game.level(st.xp);
      const stamps = NI.game.stamps();
      const got = stamps.filter((s) => s.done).length;
      const earned = NI.game.BADGES.filter((b) => st.badges[b.id]).length;
      let html =
        '<header class="page-head"><h1>Stamp book <span class="sub">' + ui.jp("スタンプ{帳|ちょう}", { tokens: false }) + "</span></h1>" +
        "<p>Finish every part of a unit to collect its station stamp, like the rubber stamps at Japanese railway stations. Pass a line exam to turn its line gold.</p></header>" +
        '<section class="u-sec stat-cards">' +
        '<div class="stat-card"><span class="lvl-badge big">Lv ' + L.n + "</span><div><b>" + ui.jp(L.title.ja, { tokens: false, ro: true }) + " · " + esc(L.title.en) + "</b>" + ui.progressBar(L.frac, "Progress to the next level") + '<span class="small muted">' + st.xp + " XP in total · " + (L.need - L.into) + " to level " + (L.n + 1) + "</span></div></div>" +
        '<div class="stat-card"><span class="big-num">' + NI.store.streak() + '</span><div><b>Day streak</b><span class="small muted">Best: ' + NI.game.bestStreak() + " days</span>" + weekDots() + "</div></div>" +
        '<div class="stat-card"><span class="big-num">' + got + '</span><div><b>Stamps</b><span class="small muted">of ' + stamps.length + " stations · " + earned + " of " + NI.game.BADGES.length + " badges</span></div></div>" +
        "</section>";

      for (const line of NI.course.lines) {
        const pct = st.exams[line.id];
        const gold = pct >= 80;
        html +=
          '<section class="u-sec stamp-line line-' + line.color + (gold ? " gold" : "") + '"><h2><span class="line-badge" aria-hidden="true">' + line.id + "</span> " + ui.jp(line.ja, { tokens: false, ro: true }) + ' <span class="line-en">' + esc(line.en) + "</span>" +
          (gold ? ' <span class="gold-badge" title="Line exam passed: ' + pct + '%">★ ' + pct + "%</span>" : "") + "</h2>" +
          '<ol class="stamp-grid">' +
          line.units
            .map((n) => NI.course.unit(n))
            .filter(Boolean)
            .map((u) => {
              const s = stamps.find((x) => x.unit.n === u.n);
              return '<li><a href="#unit-' + u.n + '">' + stampSvg(u, { done: s && s.done }) + '<span class="stamp-cap">' + esc(NI.course.code(u.n)) + " " + esc(u.en) + "</span></a></li>";
            })
            .join("") +
          "</ol>" +
          '<p class="small"><a href="#exam-' + line.id + '">' + (gold ? "Retake the line exam" : pct != null ? "Line exam: best " + pct + "%. Try again" : "Take the line exam") + "</a></p></section>";
      }

      html +=
        '<section class="u-sec"><h2>Badges</h2><ul class="badges">' +
        NI.game.BADGES.map((b) => {
          const t = st.badges[b.id];
          return '<li class="badge-item' + (t ? " got" : "") + '"><span class="b-icon" aria-hidden="true">' + b.icon + '</span><span class="b-text"><b>' + esc(b.t) + "</b><span>" + esc(b.d) + "</span>" + (t ? '<small>Earned ' + esc(U.dayKey(t)) + "</small>" : "") + "</span></li>";
        }).join("") +
        "</ul></section>";

      const best = st.games;
      const rec = [
        ["Time Attack", best.timeattack != null ? best.timeattack + " points" : "—"],
        ["Kana Rain", best.kanarain != null ? best.kanarain + " kana" : "—"],
        ["Memory Match", best.memory != null ? best.memory + " s" : "—"],
        ["Sentence Sprint", best.sprint != null ? best.sprint + " s" : "—"],
      ];
      html += '<section class="u-sec"><h2>Records</h2><dl class="records">' + rec.map(([k, v]) => "<div><dt>" + k + "</dt><dd>" + esc(v) + "</dd></div>").join("") + '</dl><p class="small"><a href="#play">Play a game</a></p></section>';
      return html;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
