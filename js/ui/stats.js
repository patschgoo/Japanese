/* Statistics (統計), like Kana Pro's: headline numbers, XP over the last 30
   days, an activity calendar, review cards by stage and the week ahead, kana,
   tests and all-time totals. Charts are plain HTML (they reflow on phones),
   every mark has a tooltip on hover and focus, and every chart has a table. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const U = NI.util;
  const ui = NI.ui;
  const esc = ui.esc;
  const doc = root.document;
  const pages = (NI.pages = NI.pages || {});

  const fmt = (n) => Number(n || 0).toLocaleString("en-GB");
  const dayName = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const shortDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  // The last n days, oldest first, with what was done on each.
  function days(n) {
    const st = NI.store.state;
    const out = [];
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(t);
      d.setDate(t.getDate() - i);
      const k = NI.util.dayKey(d);
      out.push({ k, d, xp: (st.days[k] || {}).xp || 0, any: !!st.days[k], rest: !!st.rest.days[k] });
    }
    return out;
  }

  // A clean top for an axis: 10, 20, 50, 100, 150 …
  function niceMax(v) {
    if (v <= 10) return 10;
    const steps = [10, 20, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000];
    return steps.find((s) => s >= v) || Math.ceil(v / 1000) * 1000;
  }

  // ---------------------------------------------------------------------------
  // Chart pieces

  // Columns over time: one series, the goal as a hairline, a few labels.
  function columns(list, o) {
    const max = niceMax(Math.max(o.goal || 0, ...list.map((x) => x.v)));
    const pct = (v) => (v / max) * 100;
    // Labels only on the highest column and the one the chart is about (today).
    const peak = list.reduce((b, x, i) => (x.v > list[b].v ? i : b), 0);
    const label = (i) => o.label && (i === peak || i === o.mark) && list[i].v > 0;
    return (
      '<div class="vz-cols" style="--n:' + list.length + '" role="group" aria-label="' + esc(o.title) + '">' +
      '<div class="vz-yaxis" aria-hidden="true"><span style="bottom:100%">' + fmt(max) + '</span><span style="bottom:50%">' + fmt(max / 2) + '</span><span style="bottom:0">0</span></div>' +
      '<div class="vz-plot">' +
      '<div class="vz-grid" aria-hidden="true"><i></i><i></i><i></i></div>' +
      (o.goal ? '<div class="vz-goal" style="bottom:' + pct(o.goal).toFixed(2) + '%" aria-hidden="true"></div>' : "") +
      list
        .map(
          (x, i) =>
            '<span class="vz-col" tabindex="0" role="img" aria-label="' + esc(x.tip) + '" data-tip="' + esc(x.tip) + '">' +
            '<span class="vz-bar" style="height:' + pct(x.v).toFixed(2) + '%">' + (label(i) ? '<span class="vz-lab">' + fmt(x.v) + "</span>" : "") + "</span></span>"
        )
        .join("") +
      "</div>" +
      '<div class="vz-xaxis" aria-hidden="true">' + o.ticks.map((t) => "<span>" + esc(t) + "</span>").join("") + "</div>" +
      (o.goal ? '<div class="vz-key"><i></i>Daily goal, ' + fmt(o.goal) + " XP</div>" : "") +
      "</div>"
    );
  }

  // A table version of a chart (the way to read it without hovering).
  function table(cols, rows) {
    return (
      '<details class="vz-table"><summary>Show as a table</summary><div class="table-wrap"><table class="ref"><thead><tr>' +
      cols.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map((r) => "<tr>" + r.map((c, i) => (i ? '<td class="num">' : "<th>") + esc(c) + (i ? "</td>" : "</th>")).join("") + "</tr>").join("") +
      "</tbody></table></div></details>"
    );
  }

  // A share of a whole as a meter: the fill on a lighter track of the same blue.
  function meter(frac, label, value, sub) {
    return (
      '<div class="vz-meter"><div class="vz-mhead"><span>' + label + '</span><b>' + esc(value) + "</b></div>" +
      '<div class="vz-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(frac * 100) + '" aria-label="' + esc(label.replace(/<[^>]+>/g, "")) + '"><i style="width:' + Math.max(0, Math.min(100, frac * 100)).toFixed(1) + '%"></i></div>' +
      (sub ? '<p class="small muted">' + sub + "</p>" : "") + "</div>"
    );
  }

  function tile(label, value, sub) {
    return '<div class="vz-tile"><span class="vz-tl">' + label + '</span><b class="vz-tv">' + value + "</b>" + (sub ? '<span class="vz-ts">' + sub + "</span>" : "") + "</div>";
  }

  // ---------------------------------------------------------------------------
  // Sections

  function overview() {
    const st = NI.store.state;
    const L = NI.game.level(st.xp);
    const srs = st.srs;
    let words = 0;
    let strong = 0;
    for (const id in srs) {
      const it = /^[vxu]:/.test(id);
      if (!it) continue;
      words++;
      if (srs[id].st >= 5) strong++;
    }
    const kana = kanaCounts();
    const known = kana.hira.known + kana.kata.known;
    const total = kana.hira.total + kana.kata.total;
    const daysList = Object.keys(st.days).sort();
    const saved = Object.keys(NI.store.books.saved).length;
    return (
      '<div class="vz-tiles">' +
      tile("Total XP", fmt(st.xp), "Level " + L.n + " · " + esc(L.title.en)) +
      tile("Day streak", fmt(NI.store.streak()), "Best: " + U.plural(Math.max(NI.game.bestStreak(), NI.store.streak()), "day")) +
      tile("Days of practice", fmt(daysList.length), daysList.length ? "Since " + esc(shortDate(new Date(daysList[0] + "T12:00:00"))) : "Starts with your first lesson") +
      tile("Words in reviews", fmt(words), fmt(strong) + " on an express or faster") +
      tile("Kana known", fmt(known), "of " + fmt(total) + " in the two charts") +
      tile("Saved words", fmt(saved), U.plural(NI.store.books.lists.length, "list")) +
      "</div>"
    );
  }

  function xpChart() {
    const list = days(30);
    const goal = Number(NI.store.settings.dailyGoal) || 60;
    const total = list.reduce((a, x) => a + x.xp, 0);
    const met = list.filter((x) => x.xp >= goal).length;
    const data = list.map((x) => ({ v: x.xp, tip: dayName(x.d) + " · " + fmt(x.xp) + " XP" + (x.rest && !x.xp ? " · rest day" : "") }));
    return (
      '<section class="u-sec vz-card" aria-labelledby="vz-xp"><h2 id="vz-xp">XP in the last 30 days</h2>' +
      '<p class="small muted">' + fmt(total) + " XP in all, " + fmt(Math.round(total / 30)) + " a day on average. Daily goal reached on " + U.plural(met, "day") + ".</p>" +
      '<div class="vz-box">' + columns(data, { title: "XP in the last 30 days", goal, label: true, mark: data.length - 1, ticks: [shortDate(list[0].d), shortDate(list[15].d), "Today"] }) + "</div>" +
      table(["Day", "XP"], list.slice().reverse().map((x) => [dayName(x.d), fmt(x.xp)])) +
      "</section>"
    );
  }

  // Activity calendar: 16 weeks, Monday to Sunday; darker is more XP.
  function calendar() {
    const goal = Number(NI.store.settings.dailyGoal) || 60;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const dow = (today.getDay() + 6) % 7; // Monday = 0
    const n = 15 * 7 + dow + 1;
    const list = days(n);
    const level = (xp) => (!xp ? 0 : xp < goal / 2 ? 1 : xp < goal ? 2 : xp < goal * 2 ? 3 : 4);
    const weeks = [];
    for (let i = 0; i < list.length; i += 7) weeks.push(list.slice(i, i + 7));
    const months = weeks.map((w, i) => (i === 0 || w[0].d.getMonth() !== weeks[i - 1][0].d.getMonth() ? w[0].d.toLocaleDateString("en-GB", { month: "short" }) : ""));
    const active = list.filter((x) => x.any).length;
    return (
      '<section class="u-sec vz-card" aria-labelledby="vz-cal"><h2 id="vz-cal">Activity, the last 16 weeks</h2>' +
      '<p class="small muted">' + U.plural(active, "day") + " with practice. Each square is a day; the darker, the more XP.</p>" +
      '<div class="vz-box"><div class="vz-cal" role="group" aria-label="Activity calendar">' +
      '<div class="vz-cal-m" aria-hidden="true">' + months.map((m) => "<span>" + esc(m) + "</span>").join("") + "</div>" +
      '<div class="vz-cal-d" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span></div>' +
      '<div class="vz-cal-g">' +
      weeks
        .map((w) =>
          '<div class="vz-week">' +
          w.map((x) => {
            const tip = dayName(x.d) + " · " + (x.xp ? fmt(x.xp) + " XP" : x.rest ? "rest day" : x.any ? "practised" : "no practice");
            return '<span class="vz-day h' + level(x.xp) + (x.rest && !x.xp ? " rest" : "") + '" tabindex="0" role="img" aria-label="' + esc(tip) + '" data-tip="' + esc(tip) + '"></span>';
          }).join("") +
          "</div>"
        )
        .join("") +
      "</div></div>" +
      '<div class="vz-scale" aria-hidden="true"><span>None</span><i class="vz-day h0"></i><i class="vz-day h1"></i><i class="vz-day h2"></i><i class="vz-day h3"></i><i class="vz-day h4"></i><span>Twice your goal</span></div></div>' +
      table(["Day", "XP"], list.filter((x) => x.any || x.rest).reverse().map((x) => [dayName(x.d), x.xp ? fmt(x.xp) : x.rest ? "rest day" : "0"])) +
      "</section>"
    );
  }

  function reviews() {
    const srs = NI.store.state.srs;
    const T = NI.srs.TIERS;
    const by = T.map((t) => ({ t, n: 0 }));
    for (const id in srs) {
      const t = NI.srs.tierOf(srs[id].st);
      const row = t && by.find((x) => x.t.id === t.id);
      if (row) row.n++;
    }
    const max = Math.max(1, ...by.map((x) => x.n));
    const all = by.reduce((a, x) => a + x.n, 0);
    // The week ahead: due today (with anything overdue), then each day.
    const now = Date.now();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const ahead = [];
    for (let i = 0; i < 7; i++) {
      const to = new Date(end);
      to.setDate(end.getDate() + i);
      const from = new Date(to);
      from.setDate(to.getDate() - 1);
      let n = 0;
      for (const id in srs) {
        const due = srs[id].due;
        if ((i === 0 && due <= to.getTime()) || (i > 0 && due > from.getTime() && due <= to.getTime())) n++;
      }
      const d = new Date(to);
      d.setHours(12, 0, 0, 0);
      ahead.push({ d, n, i });
    }
    const dueNow = NI.srs.countDueBy(srs, now);
    return (
      '<section class="u-sec vz-card" aria-labelledby="vz-rev"><h2 id="vz-rev">Review cards</h2>' +
      (all
        ? '<p class="small muted">' + U.plural(all, "card") + " on the trains. Each right answer moves a card to a faster train and a longer wait.</p>" +
          '<div class="vz-box"><div class="vz-hbars" role="group" aria-label="Review cards by stage">' +
          by
            .map(
              (x, i) =>
                '<div class="vz-hrow"><span class="vz-hlab">' + ui.jp("{" + x.t.ja + "|" + x.t.kana + "}", { tokens: false }) + " <small>" + esc(x.t.en) + "</small></span>" +
                '<span class="vz-htrack" tabindex="0" role="img" aria-label="' + esc(x.t.en + ": " + x.n + " cards") + '" data-tip="' + esc(x.t.en + " · " + U.plural(x.n, "card")) + '"><i class="o' + (i + 1) + '" style="width:calc((100% - 46px) * ' + (x.n / max).toFixed(3) + ')"></i><b>' + fmt(x.n) + "</b></span></div>"
            )
            .join("") +
          "</div></div>" +
          '<h3 class="vz-h3">Due in the next 7 days</h3><p class="small muted">' + (dueNow ? U.plural(dueNow, "card") + ' due now. <a href="#review">Review them</a>' : "Nothing due right now.") + "</p>" +
          '<div class="vz-box">' + columns(ahead.map((x) => ({ v: x.n, tip: (x.i === 0 ? "Today" : dayName(x.d)) + " · " + U.plural(x.n, "card") })), { title: "Cards due in the next 7 days", label: true, mark: 0, ticks: ["Today", shortDate(ahead[3].d), shortDate(ahead[6].d)] }) + "</div>" +
          table(["Stage", "Cards"], by.map((x) => [x.t.en + " (" + x.t.ja + ")", fmt(x.n)]).concat(ahead.map((x) => ["Due " + (x.i === 0 ? "today" : dayName(x.d)), fmt(x.n)])))
        : '<p class="empty small">No review cards yet. Finish a lesson part and its words join your reviews.</p>') +
      "</section>"
    );
  }

  // Known, learning, weak and new kana in each script's chart.
  function kanaCounts() {
    const KP = NI.kanaPractice;
    const out = {};
    for (const s of ["hira", "kata"]) {
      const ks = KP.groups()[s].filter((g) => g.id === "basic" || g.id === "voiced").flatMap((g) => g.cards.flatMap((c) => c.kana));
      const c = { total: ks.length, known: 0, learning: 0, weak: 0, new: 0 };
      for (const k of ks) c[KP.level(k)]++;
      out[s] = c;
    }
    return out;
  }

  function kana() {
    const c = kanaCounts();
    let right = 0;
    let wrong = 0;
    for (const k in NI.store.state.kana) {
      right += NI.store.state.kana[k][0] || 0;
      wrong += NI.store.state.kana[k][1] || 0;
    }
    const tests = NI.store.state.intro.kanaTests || [];
    const line = (x) => x.learning + " learning · " + x.weak + " weak · " + x.new + " new";
    return (
      '<section class="u-sec vz-card" aria-labelledby="vz-kana"><h2 id="vz-kana">Kana</h2><div class="vz-box">' +
      meter(c.hira.known / c.hira.total, 'Hiragana <span lang="ja">ひらがな</span>', c.hira.known + " of " + c.hira.total + " known", line(c.hira)) +
      meter(c.kata.known / c.kata.total, 'Katakana <span lang="ja">カタカナ</span>', c.kata.known + " of " + c.kata.total + " known", line(c.kata)) +
      '<p class="small">' + (right + wrong ? "Kana answers: <b>" + Math.round((right / (right + wrong)) * 100) + "%</b> right, of " + fmt(right + wrong) + "." : "No kana practice yet.") +
      (tests.length ? " Last kana test: <b>" + tests[tests.length - 1].pct + "%</b>." : "") +
      ' <a href="#kana-chart">The chart, kana by kana</a></p></div></section>'
    );
  }

  function tests() {
    const st = NI.store.state;
    const vt = NI.store.books.tests;
    const pct = (t) => (t.n ? Math.round((t.right / t.n) * 100) : 0);
    const lines = NI.course.lines.map((l) => [esc(l.en), st.exams[l.id] != null ? st.exams[l.id] + "%" + (st.exams[l.id] >= 80 ? " ★" : "") : "not taken"]);
    return (
      '<section class="u-sec vz-card" aria-labelledby="vz-tests"><h2 id="vz-tests">Tests and exams</h2>' +
      '<div class="vz-tiles small">' +
      tile("Vocabulary tests", fmt(vt.length), vt.length ? "Average " + Math.round(vt.reduce((a, t) => a + pct(t), 0) / vt.length) + "% · best " + Math.max(...vt.map(pct)) + "%" : '<a href="#vtest">Take one</a>') +
      tile("Line exams passed", Object.values(st.exams).filter((p) => p >= 80).length + " of " + NI.course.lines.length, "80% passes and turns a line gold") +
      tile("Course parts finished", fmt(Object.keys(st.parts).length) + " of " + fmt(NI.course.units.reduce((a, u) => a + NI.course.parts(u).length, 0)), U.plural(NI.game.stamps().filter((s) => s.done).length, "station stamp")) +
      "</div>" +
      '<div class="table-wrap"><table class="ref vz-exams"><thead><tr><th>Line exam</th><th>Best</th></tr></thead><tbody>' +
      lines.map(([n, v]) => "<tr><th>" + n + '</th><td class="num">' + esc(v) + "</td></tr>").join("") +
      "</tbody></table></div></section>"
    );
  }

  function totals() {
    const S = NI.store;
    const rows = [
      ["Lesson parts finished", Object.keys(S.state.parts).length],
      ["Questions answered in lessons", S.total("x")],
      ["Reviews", S.total("r")],
      ["Games played", S.total("g")],
      ["Stories read", Object.keys(S.state.stories).length],
      ["Role-plays", S.total("rp")],
      ["Lines shadowed", S.total("sh")],
      ["Sentences said aloud", S.total("sp")],
      ["Kana answered", S.total("kn")],
      ["Kana written", S.total("wr")],
      ["Flashcards turned", S.total("fc")],
      ["Mistakes put right", S.total("mf")],
      ["Sentences made in the Sentence Maker", S.total("mk")],
      ["Badges", Object.keys(S.state.badges).length + " of " + NI.game.BADGES.length],
    ];
    return (
      '<section class="u-sec vz-card" aria-labelledby="vz-all"><h2 id="vz-all">All-time totals</h2>' +
      '<div class="table-wrap"><table class="ref vz-totals"><tbody>' + rows.map(([t, v]) => "<tr><th>" + esc(t) + '</th><td class="num">' + esc(typeof v === "number" ? fmt(v) : v) + "</td></tr>").join("") + "</tbody></table></div></section>"
    );
  }

  // ---------------------------------------------------------------------------
  // One tooltip for every mark: on hover and on keyboard focus.

  function bindTips(el) {
    const tip = doc.createElement("div");
    tip.className = "vz-tip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    el.appendChild(tip);
    let on = null;
    const show = (mark) => {
      if (!mark || mark === on) return;
      on = mark;
      tip.textContent = mark.getAttribute("data-tip");
      tip.hidden = false;
      const r = mark.getBoundingClientRect();
      const host = el.getBoundingClientRect();
      const w = tip.offsetWidth;
      let left = r.left + r.width / 2 - host.left - w / 2;
      left = Math.max(0, Math.min(left, host.width - w));
      tip.style.left = left + "px";
      tip.style.top = r.top - host.top - tip.offsetHeight - 8 + "px";
    };
    const hide = () => {
      on = null;
      tip.hidden = true;
    };
    el.addEventListener("pointerover", (e) => show(e.target.closest("[data-tip]")));
    el.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest || e.relatedTarget.closest("[data-tip]") !== on) hide();
    });
    el.addEventListener("focusin", (e) => show(e.target.closest("[data-tip]")));
    el.addEventListener("focusout", hide);
    // One tab stop per chart; the arrow keys move between its marks (a week
    // left or right in the calendar, a day up or down).
    el.querySelectorAll(".vz-cols, .vz-cal, .vz-hbars").forEach((g) => {
      const marks = Array.from(g.querySelectorAll("[data-tip]"));
      marks.forEach((m, i) => m.setAttribute("tabindex", i === marks.length - 1 ? "0" : "-1"));
      const cal = g.classList.contains("vz-cal");
      g.addEventListener("keydown", (e) => {
        const i = marks.indexOf(e.target);
        if (i < 0) return;
        const k = { ArrowRight: cal ? 7 : 1, ArrowLeft: cal ? -7 : -1, ArrowDown: 1, ArrowUp: -1, Home: -i, End: marks.length - 1 - i }[e.key];
        if (!k) return;
        e.preventDefault();
        const j = Math.max(0, Math.min(marks.length - 1, i + k));
        marks[i].setAttribute("tabindex", "-1");
        marks[j].setAttribute("tabindex", "0");
        marks[j].focus();
      });
    });
  }

  pages.stats = {
    title: "Statistics",
    nav: "more",
    render() {
      const p = NI.store.profile;
      return (
        '<div class="vz">' +
        '<header class="page-head"><h1>Statistics <span class="sub">' + ui.jp("{統計|とうけい}", { tokens: false }) + "</span></h1>" +
        "<p>Everything learnt so far in the profile " + p.icon + " <b>" + esc(p.name) + "</b>. Hover over or tab to any bar or square for its number; each chart also opens as a table.</p></header>" +
        overview() + xpChart() + calendar() + reviews() + kana() + tests() + totals() +
        "</div>"
      );
    },
    mount(el) {
      bindTips(el.querySelector(".vz"));
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
