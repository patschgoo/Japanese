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
            '<span class="vz-bar' + (o.goal && x.v >= o.goal ? " met" : "") + (i === o.mark ? " now" : "") + '" style="height:' + pct(x.v).toFixed(2) + '%">' + (label(i) ? '<span class="vz-lab">' + fmt(x.v) + "</span>" : "") + "</span></span>"
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
  function meter(frac, label, value, sub, cls) {
    return (
      '<div class="vz-meter' + (cls ? " " + cls : "") + '"><div class="vz-mhead"><span>' + label + '</span><b>' + esc(value) + "</b></div>" +
      '<div class="vz-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(frac * 100) + '" aria-label="' + esc(label.replace(/<[^>]+>/g, "")) + '"><i style="width:' + Math.max(0, Math.min(100, frac * 100)).toFixed(1) + '%"></i></div>' +
      (sub ? '<p class="small muted">' + sub + "</p>" : "") + "</div>"
    );
  }

  function tile(label, value, sub) {
    return '<div class="stile"><span class="lbl">' + label + '</span><b class="tile-v">' + value + "</b>" + (sub ? '<span class="tile-sub">' + sub + "</span>" : "") + "</div>";
  }

  // A section's title row: the title, and a short note on the right.
  const head = (id, title, meta) => '<div class="sec-head"><h2 id="' + id + '">' + title + "</h2>" + (meta ? '<span class="meta">' + meta + "</span>" : "") + "</div>";

  // ---------------------------------------------------------------------------
  // Sections

  function overview() {
    const st = NI.store.state;
    const goal = Number(NI.store.settings.dailyGoal) || 60;
    const week = days(7);
    const wxp = week.reduce((a, x) => a + x.xp, 0);
    const met = week.filter((x) => x.xp >= goal).length;
    let words = 0;
    for (const id in st.srs) if (/^[vxu]:/.test(id)) words++;
    const kj = NI.kanji ? NI.kanji.list() : [];
    const kjKnown = kj.filter((x) => NI.kanji.level(x.k) === "known").length;
    return (
      '<div class="tiles two">' +
      tile("XP this week", fmt(wxp), "goal met " + met + " of 7 days") +
      tile("Best streak", fmt(Math.max(NI.game.bestStreak(), NI.store.streak())), "days · now " + NI.store.streak()) +
      tile("Words", fmt(words), "of " + fmt(NI.course.words.length) + " in the course") +
      tile("Kanji", fmt(kjKnown), "known well, of " + fmt(kj.length)) +
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
      '<section class="h-sec vz-card" aria-labelledby="vz-xp">' + head("vz-xp", "XP, last 30 days", "Goal: " + goal + " a day") +
      '<div class="card vz-box">' + columns(data, { title: "XP in the last 30 days", goal, label: true, mark: data.length - 1, ticks: [shortDate(list[0].d), shortDate(list[15].d), "Today"] }) +
      '<p class="small muted vz-sum">' + fmt(total) + " XP in all, " + fmt(Math.round(total / 30)) + " a day on average. Daily goal reached on " + U.plural(met, "day") + ".</p></div>" +
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
      '<section class="h-sec vz-card" aria-labelledby="vz-cal">' + head("vz-cal", "Activity", "Last 16 weeks · " + U.plural(active, "day")) +
      '<div class="card vz-box"><div class="vz-cal" role="group" aria-label="Activity calendar">' +
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
      '<div class="vz-scale" aria-hidden="true"><span>Less</span><i class="vz-day h0"></i><i class="vz-day h1"></i><i class="vz-day h2"></i><i class="vz-day h3"></i><i class="vz-day h4"></i><span>More</span></div></div>' +
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
      '<section class="h-sec vz-card" aria-labelledby="vz-rev">' + head("vz-rev", "Review cards by train", all ? U.plural(all, "card") : "") +
      (all
        ? '<div class="card vz-box"><div class="vz-stack" role="img" aria-label="' + esc(by.map((x) => x.t.en + " " + x.n).join(", ")) + '">' +
          by.filter((x) => x.n).map((x) => '<i class="t-' + x.t.id + '" style="flex:' + x.n + '" aria-label="' + esc(x.t.en + ": " + U.plural(x.n, "card")) + '" data-tip="' + esc(x.t.en + " · " + U.plural(x.n, "card")) + '"></i>').join("") + "</div>" +
          '<ul class="vz-legend">' +
          by.map((x) => '<li><i class="t-' + x.t.id + '" aria-hidden="true"></i><span lang="ja">' + esc(x.t.ja) + "</span><span>" + esc(x.t.en) + "</span><b>" + fmt(x.n) + "</b></li>").join("") +
          '</ul><p class="small muted vz-sum">Each right answer moves a card to a faster train and a longer wait.</p></div>' +
          '<div class="sec-head vz-sub"><h2>Due in the week ahead</h2><span class="meta">' + U.plural(ahead.reduce((a, x) => a + x.n, 0), "card") + "</span></div>" +
          '<div class="card vz-box">' + NI.session.weekChart(ahead) + '<p class="small muted vz-sum">' + (dueNow ? U.plural(dueNow, "card") + ' due now. <a href="#review">Review them</a>' : "Nothing due right now.") + "</p></div>" +
          table(["Stage", "Cards"], by.map((x) => [x.t.en + " (" + x.t.ja + ")", fmt(x.n)]).concat(ahead.map((x) => ["Due " + (x.i === 0 ? "today" : dayName(x.d)), fmt(x.n)])))
        : '<p class="card empty small">No review cards yet. Finish a lesson part and its words join your reviews.</p>') +
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

  // Kanji: how many of the course's kanji are known well, and how many are in the reviews.
  function kanjiMeter() {
    if (!NI.kanji) return "";
    const all = NI.kanji.list();
    const lv = all.map((x) => NI.kanji.level(x.k));
    const known = lv.filter((l) => l === "known").length;
    const rev = lv.filter((l) => l !== "new").length;
    return meter(known / all.length, '<span lang="ja">漢字</span> Kanji', known + "/" + all.length, rev ? rev + ' in your reviews · <a href="#kanji">the kanji</a>' : '<a href="#kanji">Put a unit’s kanji into your reviews</a>');
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
      '<section class="h-sec vz-card" aria-labelledby="vz-kana">' + head("vz-kana", "Kana", "") + '<div class="card vz-box">' +
      meter(c.hira.known / c.hira.total, '<span lang="ja">ひらがな</span> Hiragana', c.hira.known + "/" + c.hira.total, line(c.hira), "ok") +
      meter(c.kata.known / c.kata.total, '<span lang="ja">カタカナ</span> Katakana', c.kata.known + "/" + c.kata.total, line(c.kata), "xp") +
      kanjiMeter() +
      '<p class="small">' + (right + wrong ? "Kana answers: <b>" + Math.round((right / (right + wrong)) * 100) + "%</b> right, of " + fmt(right + wrong) + "." : "No kana practice yet.") +
      (tests.length ? " Last kana test: <b>" + tests[tests.length - 1].pct + "%</b>." : "") +
      ' <a href="#kana-chart">The chart, kana by kana</a></p></div></section>'
    );
  }

  function tests() {
    const st = NI.store.state;
    const vt = NI.store.books.tests;
    const pct = (t) => (t.n ? Math.round((t.right / t.n) * 100) : 0);
    const exams = NI.course.lines.filter((l) => st.exams[l.id] != null);
    // The latest test for each list or source, newest first.
    const seen = {};
    const last = vt.slice().reverse().filter((t) => !seen[t.src] && (seen[t.src] = 1)).slice(0, 5);
    const name = (src) => {
      if (src === "all") return "Saved words";
      if (src === "rev") return "Words in your reviews";
      if (src === "mis") return "Your mistakes";
      const l = NI.store.books.lists.find((x) => x.id === src);
      if (l) return l.name;
      const m = /^u(\d+)(?:\.(\d+))?$/.exec(src || "");
      return m ? (m[2] ? "Units " + m[1] + "–" + m[2] : NI.course.code(Number(m[1]))) : src;
    };
    const row = (t, v, star) => '<div class="vz-trow"><b>' + t + '</b><span>' + v + "</span>" + (star ? '<span class="vz-star" aria-label="gold">★</span>' : "") + "</div>";
    const rows =
      exams.map((l) => row(ui.jp(l.ja, { tokens: false }) + " line exam", st.exams[l.id] + "%", st.exams[l.id] >= 80)).join("") +
      last.map((t) => { const b = NI.store.testsOf(t.src); return row(esc(name(t.src)) + " · vocabulary test", "last " + pct(t) + "%" + (b && b.n > 1 ? " · best " + b.best + "%" : "")); }).join("");
    return (
      '<section class="h-sec vz-card" aria-labelledby="vz-tests">' + head("vz-tests", "Tests & exams", Object.values(st.exams).filter((p) => p >= 80).length + " of " + NI.course.lines.length + " lines gold") +
      '<div class="card list-card vz-tests">' + (rows || '<p class="vz-trow muted">No tests yet. <a href="#vtest">Take a vocabulary test</a> or a <a href="#play">line exam</a>.</p>') + "</div></section>"
    );
  }

  function totals() {
    const S = NI.store;
    const rows = [
      ["Total XP", S.state.xp],
      ["Days of practice", Object.keys(S.state.days).length],
      ["Lesson parts finished", Object.keys(S.state.parts).length + " of " + NI.course.units.reduce((a, u) => a + NI.course.parts(u).length, 0)],
      ["Vocabulary tests", S.books.tests.length],
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
      '<section class="h-sec vz-card" aria-labelledby="vz-all">' + head("vz-all", "All-time totals", "") +
      '<div class="card table-wrap"><table class="ref vz-totals"><tbody>' + rows.map(([t, v]) => "<tr><th>" + esc(t) + '</th><td class="num">' + esc(typeof v === "number" ? fmt(v) : v) + "</td></tr>").join("") + "</tbody></table></div></section>"
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
        '<header class="page-head"><p class="crumb"><a href="#more">More</a></p><h1>Statistics<span class="sub">' + ui.jp("{統計|とうけい}", { tokens: false }) + "</span></h1></header>" +
        overview() +
        '<p class="small muted vz-intro">The profile ' + p.icon + " <b>" + esc(p.name) + "</b>. Hover over or tab to any bar or square for its number; each chart also opens as a table.</p>" +
        '<div class="vz-cols2"><div class="h-col">' + xpChart() + reviews() + kana() + '</div><div class="h-col">' + calendar() + tests() + totals() + "</div></div>" +
        "</div>"
      );
    },
    mount(el) {
      bindTips(el.querySelector(".vz"));
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
