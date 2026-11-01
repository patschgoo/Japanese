/* Pages: home (route map), unit, phrasebook, word list, grammar reference,
   options and the mobile "more" menu. Each page returns HTML from render()
   and may attach behaviour in mount(). */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const pages = (NI.pages = NI.pages || {});

  function nextStep() {
    for (const u of NI.course.units) {
      for (const p of NI.course.parts(u)) if (!NI.store.partDone(u.n, p.key)) return { u, p };
    }
    return null;
  }

  function partsDone(u) {
    return NI.course.parts(u).filter((p) => NI.store.partDone(u.n, p.key)).length;
  }

  function counts() {
    const srs = NI.store.state.srs;
    const now = Date.now();
    let words = 0;
    let strong = 0;
    for (const id in srs) {
      if (id.startsWith("v:")) {
        words++;
        if (srs[id].st >= 5) strong++;
      }
    }
    return { due: NI.srs.countDueBy(srs, now), words, strong, next: NI.srs.nextDue(srs, now), streak: NI.store.streak() };
  }

  NI.nextStep = nextStep;
  NI.counts = counts;

  // ---------------------------------------------------------------------------
  // The learner's plan: a goal, a daily XP target and a focus for lessons.
  const PLAN = {
    GOALS: [
      { id: "travel", icon: "✈️", t: "Travel in Japan", focus: "speaking", tip: "Start with the phrasebook and units 1–8, then directions in unit 19. Shadow the conversations so phrases come out quickly.", go: [["#phrases", "Phrasebook"], ["#unit-19", "Directions (unit 19)"], ["#maker", "Sentence Maker"]] },
      { id: "media", icon: "🎌", t: "Anime, manga & games", focus: "listening", tip: "Learn katakana early, enjoy casual speech in unit 16, and listen a lot: play conversations and read the stories.", go: [["#kana-kata", "Katakana trainer"], ["#stories", "Stories"], ["#unit-16", "Casual speech (unit 16)"]] },
      { id: "work", icon: "💼", t: "Work or study", focus: "balanced", tip: "Keep polite です/ます forms solid and don’t skip the service Japanese in unit 30.", go: [["#grammar", "Grammar list"], ["#reader", "Reader"], ["#unit-30", "Service Japanese (unit 30)"]] },
      { id: "exam", icon: "🎓", t: "The JLPT exam", focus: "exam", tip: "Units 1–20 cover most of N5 and units 21–30 much of N4. Use the line exams as practice tests.", go: [["#play", "Line exams"], ["#grammar", "Grammar list"], ["#reader", "Reader"]] },
      { id: "people", icon: "💬", t: "Friends, family or a partner", focus: "speaking", tip: "Casual speech (unit 16) and the conversation units matter most. Say sentences out loud and shadow.", go: [["#unit-16", "Casual speech (unit 16)"], ["#maker", "Sentence Maker"], ["#stories", "Stories"]] },
      { id: "curious", icon: "🌱", t: "Just curious", focus: "balanced", tip: "Follow the route map at your own pace; the games keep it fun.", go: [["#play", "Games"], ["#stories", "Stories"], ["#stamps", "Stamp book"]] },
    ],
    DAILY: [
      [30, "Casual", "about 5 minutes"],
      [60, "Regular", "about 10 minutes"],
      [120, "Serious", "about 20 minutes"],
      [200, "Intense", "30 minutes or more"],
    ],
    FOCI: [
      ["balanced", "Balanced", "A bit of everything"],
      ["listening", "Listening", "More audio questions and shadowing"],
      ["speaking", "Speaking", "More saying it aloud and typing from memory"],
      ["reading", "Reading", "More reading and grammar in context"],
      ["exam", "Exam practice", "More particles, verb forms and numbers"],
    ],
  };
  // "Lessons now focus on listening." for toasts after the plan changes.
  PLAN.focusLine = (id) => (id === "balanced" ? "Lessons now practise a bit of everything." : "Lessons now focus on " + ((PLAN.FOCI.find((f) => f[0] === id) || [])[1] || id).toLowerCase() + ".");
  NI.plan = PLAN;

  // The logo, as the top bar shows it (inside the page in the one-file build).
  const markSrc = () => {
    const m = root.document && root.document.querySelector(".brand-mark");
    return m ? m.getAttribute("src") : "img/mark.png";
  };

  // The plan as a focus screen: four questions, a tip, then Start learning.
  function planCard(back) {
    const s = NI.store.settings;
    const chip = (name, v, label, on) => '<button class="chip' + (on ? " on" : "") + '" type="button" data-plan="' + name + '" data-v="' + v + '" aria-pressed="' + !!on + '">' + label + "</button>";
    const q = (n, title, sub, chips) => '<section class="card plan-q"><p class="lbl">' + n + ' of 4</p><h2>' + title + "</h2>" + (sub ? '<p class="small muted">' + sub + "</p>" : "") + '<div class="chips">' + chips + "</div></section>";
    return (
      '<div class="plan plan-screen" data-session>' +
      (back ? '<p class="crumb plan-back"><a href="#' + back + '">Back</a></p>' : "") +
      '<header class="plan-head"><img class="plan-mark" src="' + esc(markSrc()) + '" alt="" width="48" height="48"><h1 id="welcome-h">' + ui.jp("ようこそ！", { tokens: false }) + "</h1><p class=\"plan-sub\">Let’s set up your plan</p>" +
      "<p>This course is for people who can already read <b>hiragana</b>. Four quick questions, and the course adapts to you. You can change any of it later in Options.</p></header>" +
      q("1", "Can you read katakana?", "The script for words like コーヒー", chip("kata", "yes", "Yes", !s.kataHelp && NI.store.state.onboarded) + chip("kata", "no", "Not yet", s.kataHelp)) +
      q("2", "Why are you learning?", "", PLAN.GOALS.map((g) => chip("goal", g.id, g.icon + " " + esc(g.t), s.goal === g.id)).join("")) +
      q("3", "How much time do you have most days?", "", PLAN.DAILY.map(([xp, t, d]) => chip("daily", xp, "<b>" + esc(t) + "</b><small>" + esc(d) + "</small>", Number(s.dailyGoal) === xp)).join("")) +
      q("4", "What do you want to get better at first?", "", PLAN.FOCI.map(([v, t]) => chip("focus", v, esc(t), s.focus === v)).join("")) +
      '<p class="plan-tip" aria-live="polite"></p>' +
      '<div class="plan-btns"><button class="btn primary big" type="button" data-plan-save>' + (back ? "Save my plan" : "Start learning") + "</button>" + (back ? "" : '<button class="btn plain" type="button" data-plan-skip>Skip for now</button>') + "</div>" +
      '<p class="small muted plan-foot">Rusty on hiragana? <a href="#kana-hira">Take the 2-minute hiragana check</a>. Curious about the method? <a href="#guide">Read how this course works</a>.</p>' +
      "</div>"
    );
  }

  function mountPlan(el) {
    const box = el.querySelector(".plan");
    if (!box) return;
    const tip = box.querySelector(".plan-tip");
    const showTip = () => {
      const g = PLAN.GOALS.find((x) => x.id === NI.store.settings.goal);
      tip.innerHTML = g ? "<b>Tip for you:</b> " + esc(g.tip) : "";
      tip.hidden = !g;
    };
    box.querySelectorAll("[data-plan]").forEach((b) =>
      b.addEventListener("click", () => {
        const name = b.getAttribute("data-plan");
        const v = b.getAttribute("data-v");
        box.querySelectorAll('[data-plan="' + name + '"]').forEach((x) => {
          x.classList.toggle("on", x === b);
          x.setAttribute("aria-pressed", x === b);
        });
        if (name === "kata") NI.store.set("kataHelp", v !== "yes", true);
        if (name === "daily") NI.store.set("dailyGoal", Number(v), true);
        if (name === "focus") NI.store.set("focus", v, true);
        if (name === "goal") {
          NI.store.set("goal", v, true);
          const g = PLAN.GOALS.find((x) => x.id === v);
          if (g) {
            NI.store.set("focus", g.focus, true);
            box.querySelectorAll('[data-plan="focus"]').forEach((x) => {
              x.classList.toggle("on", x.getAttribute("data-v") === g.focus);
              x.setAttribute("aria-pressed", x.getAttribute("data-v") === g.focus);
            });
          }
          showTip();
        }
        NI.app.applySettings();
      })
    );
    showTip();
    box.querySelector("[data-plan-save]").addEventListener("click", () => {
      NI.store.setPlanned();
      ui.toast("Your plan is saved. がんばって！");
      if (NI.app.current() === "plan") NI.app.go("options");
      else NI.app.render();
      root.scrollTo(0, 0);
    });
    const skip = box.querySelector("[data-plan-skip]");
    if (skip)
      skip.addEventListener("click", () => {
        NI.store.setPlanned();
        NI.app.render();
        root.scrollTo(0, 0);
      });
  }

  // ---------------------------------------------------------------------------
  // Home: four stat tiles, today's ticket, the omikuji, Today (goal, reviews,
  // missions, this week), the route map, stamps and the word of the day.

  // A tile's bar: segments [[flex, class]] or a fraction filled with a colour class.
  function tileBar(segs) {
    return '<span class="tile-bar" aria-hidden="true">' + segs.map(([n, cls]) => '<i class="' + cls + '" style="flex:' + n + '"></i>').join("") + "</span>";
  }
  function fracBar(frac, cls) {
    const f = U.clamp(frac, 0, 1);
    return tileBar(f >= 1 ? [[1, cls]] : f <= 0 ? [[1, ""]] : [[f, cls], [1 - f, ""]]).replace('class="tile-bar"', 'class="tile-bar solid"');
  }
  function tile(label, value, bar, sub, href, aria) {
    const tag = href ? "a" : "div";
    return "<" + tag + ' class="stile"' + (href ? ' href="' + href + '"' : "") + (aria ? ' aria-label="' + esc(aria) + '"' : "") + '><span class="lbl">' + label + '</span><b class="tile-v">' + value + "</b>" + bar + '<span class="tile-sub">' + sub + "</span></" + tag + ">";
  }

  function homeTiles(c) {
    const st = NI.store.state;
    const L = NI.game.level(st.xp);
    const week = NI.game.week();
    const byTier = {};
    let cards = 0;
    for (const id in st.srs) {
      const t = NI.srs.tierOf(st.srs[id].st);
      if (t) (byTier[t.id] = (byTier[t.id] || 0) + 1), cards++;
    }
    const tiers = cards ? NI.srs.TIERS.filter((t) => byTier[t.id]).map((t) => [byTier[t.id], "t-" + t.id]) : [[1, ""]];
    const total = NI.course.words.length;
    const revSub = c.due ? (c.due === 1 ? "card due" : "cards due") : c.next ? "next in " + U.formatInterval(c.next - Date.now()) : "none yet";
    return (
      '<div class="tiles">' +
      tile("Streak", '<span aria-hidden="true">🔥</span> ' + c.streak, tileBar(week.map((d) => [1, d.on ? "on" : d.rest ? "rest" : ""])), c.streak === 1 ? "day" : c.streak ? "in a row" : "practise today", "", "Streak: " + U.plural(c.streak, "day") + " in a row") +
      tile("Review", String(c.due), tileBar(tiers), revSub, "#review", "Review: " + U.plural(c.due, "card") + " due") +
      tile("Words", String(c.words), fracBar(c.words / total, "ok"), "of " + total, "#book", "Words: " + c.words + " of " + total + " in your reviews") +
      tile("Level", "Lv " + L.n, fracBar(L.frac, "xp"), Math.round(L.frac * 100) + "% to Lv " + (L.n + 1), "#stamps", "Level " + L.n + ", " + Math.round(L.frac * 100) + "% of the way to level " + (L.n + 1)) +
      "</div>"
    );
  }

  // A section: a title on the left, a short note on the right, then its content.
  function sec(title, meta, body, cls, id) {
    return '<section class="h-sec' + (cls ? " " + cls : "") + '"' + (id ? ' aria-labelledby="' + id + '"' : "") + '><div class="sec-head"><h2' + (id ? ' id="' + id + '"' : "") + ">" + title + "</h2>" + (meta ? '<span class="meta">' + meta + "</span>" : "") + "</div>" + body + "</section>";
  }

  // What a part holds: "10 words", "8 sentences" or "A conversation".
  function partWhat(u, p) {
    if (p.words) return U.plural(p.words.length, "word");
    if (p.key === "s") return U.plural((u.sentences || []).length, "sentence");
    return "A conversation";
  }

  // Today's ticket (乗車券): from the last station to the one you're on.
  function ticketCard(step) {
    const tag = '<span class="tk-ja">' + ui.jp("{乗車券|じょうしゃけん}", { tokens: false }) + '</span><span class="lbl">Today’s ticket</span>';
    if (!step) {
      return (
        '<section class="ticket" aria-labelledby="tk-h"><div class="tk-top"><p class="tk-label" id="tk-h">' + tag + "</p>" +
        '<p class="tk-end">' + ui.jp("{終点|しゅうてん}", { tokens: false }) + ' <span>Terminus</span></p><p class="tk-note">Every station is visited. お疲れ様でした！ Keep your words fresh with reviews and games.</p></div>' +
        '<div class="tk-bottom"><a class="btn primary tk-go" href="#review">Review</a><a class="btn ghost tk-go" href="#play">Play</a></div></section>'
      );
    }
    const u = step.u;
    const p = step.p;
    const line = NI.course.lineOf(u.n);
    const prev = u.n > 1 ? NI.course.unit(u.n - 1) : null;
    const parts = NI.course.parts(u);
    const code = NI.course.code(u.n);
    const started = Object.keys(NI.store.state.parts).length > 0;
    const nDone = partsDone(u);
    return (
      '<section class="ticket line-' + line.color + '" aria-labelledby="tk-h"><div class="tk-top">' +
      '<p class="tk-label" id="tk-h">' + tag + '<span class="tk-line"><i aria-hidden="true"></i>' + ui.jp(line.ja, { tokens: false, ro: true }) + "</span></p>" +
      '<div class="tk-route">' +
      '<p class="tk-from"><span class="lbl">' + (prev ? "From " + esc(NI.course.code(prev.n)) : "Start") + '</span> <span class="tk-fname">' + (prev ? ui.jp(prev.ja, { tokens: false, gaps: false }) : "your first station") + "</span></p>" +
      '<p class="tk-to"><span class="lbl">To ' + esc(code) + ' · <span lang="ja" title="You are here">現在地</span></span><span class="tk-tname">' + ui.jp(u.ja, { tokens: false, gaps: false, ro: true }) + "</span></p>" +
      "</div>" +
      '<p class="tk-part"><b>' + esc(p.title) + "</b> <span>" + esc(partWhat(u, p)) + " · " + esc(u.en) + "</span></p>" +
      '<span class="tk-parts" role="img" aria-label="' + nDone + " of " + parts.length + ' parts done">' + parts.map((x) => '<i class="' + (NI.store.partDone(u.n, x.key) ? "on" : x === p ? "next" : "") + '"></i>').join("") + "</span>" +
      "</div>" +
      '<div class="tk-bottom"><a class="btn primary tk-go" href="#learn-' + u.n + "-" + p.key + '" aria-label="' + (started ? "Continue" : "Start") + ": " + esc(code + " " + p.title) + '">' + (started ? "Continue" : "Start") + ui.ICON.chev + "</a>" +
      '<a class="tk-st" href="#unit-' + u.n + '" aria-label="Station ' + esc(code) + ": " + esc(u.en) + '"><b>' + esc(code) + "</b><span>Station</span></a></div>" +
      "</section>"
    );
  }

  // The last seven days as stops on a line, today last.
  function weekLine() {
    const days = NI.game.week();
    const xp = NI.store.state.days;
    const DAY = ["S", "M", "T", "W", "T", "F", "S"];
    const rode = (d) => d.on || d.rest;
    let rail = "";
    for (let i = 0; i < 6; i++) rail += "<i" + (rode(days[i]) && rode(days[i + 1]) ? ' class="on"' : "") + "></i>";
    return (
      '<div class="wk"><span class="wk-rail" aria-hidden="true">' + rail + '</span><ol class="wk-days" aria-label="The last seven days">' +
      days
        .map((d) => {
          const dt = new Date(d.key + "T12:00:00");
          const x = (xp[d.key] && xp[d.key].xp) || 0;
          return (
            '<li class="' + (d.on ? "on" : d.rest ? "rest" : "") + (d.today ? " is-today" : "") + '" title="' + esc(d.key) + (d.on ? ": " + x + " XP" : d.rest ? ": rest day" : "") + '"><i class="wk-node" aria-hidden="true"></i>' +
            "<b>" + DAY[dt.getDay()] + '</b><span>' + (d.rest ? '<span aria-label="rest day">🎫</span>' : x) + "</span></li>"
          );
        })
        .join("") +
      "</ol></div>"
    );
  }

  function todayCard(c, g) {
    const plan = PLAN.DAILY.find((d) => d[0] === g.target);
    const rest = NI.store.state.rest.n;
    const rev = c.due
      ? '<a class="rev-row" href="#review"><span class="rv-ic">' + ui.ICON.repeat + '</span><span class="rv-t"><b>' + U.plural(c.due, "card") + " to review</b><span>" + (NI.nextStep() ? "Do these first, then your ticket" : "Keep your words fresh") + "</span></span>" + ui.ICON.chev + "</a>"
      : '<a class="rev-row quiet" href="#review"><span class="rv-ic">' + ui.ICON.check + '</span><span class="rv-t"><b>Nothing to review</b><span>' + (c.next ? "Next review in " + U.formatInterval(c.next - Date.now()) : "Reviews start after your first lesson") + "</span></span>" + ui.ICON.chev + "</a>";
    return sec(
      "Today",
      g.done ? "Goal reached ✓" : g.target - g.xp + " XP to your goal",
      '<div class="card today-card">' +
        '<div class="tc-goal"><span class="ring-box">' + NI.session.ring(g.frac, "<b>" + g.xp + "</b><small>/" + g.target + " XP</small>") + "</span>" +
        '<span class="goal-t"><b>' + (g.done ? "Goal reached!" : "Daily goal") + "</b><span>" + (plan ? esc(plan[1]) + " plan · " : "") + g.target + ' XP a day</span></span></div>' +
        rev +
        NI.missionsList() +
        '<hr class="dash">' +
        '<div class="lbl-row"><span class="lbl">This week’s line</span><span>' + (c.streak ? c.streak + "-day streak" : "No streak yet") + (rest ? ' · <span title="If you miss a day, a rest day keeps your streak going. You earn one for every 7 days in a row.">🎫 ' + U.plural(rest, "rest day") + "</span>" : "") + "</span></div>" +
        weekLine() +
        "</div>",
      "today-sec"
    );
  }

  /* Route map: one card per line, side by side; the current line comes
     first in view. Each card shows the line's five stations. */
  function routeMap(step) {
    const cur = step ? NI.course.lineOf(step.u.n) : null;
    let doneAll = 0;
    let total = 0;
    const cards = NI.course.lines
      .map((line) => {
        const units = line.units.map((n) => NI.course.unit(n)).filter(Boolean);
        const d = units.filter((u) => partsDone(u) === NI.course.parts(u).length).length;
        doneAll += d;
        total += units.length;
        const pct = NI.store.state.exams[line.id];
        const isCur = line === cur;
        const chip =
          pct >= 80 ? '<span class="pill gold" title="Line exam passed">★ ' + pct + "%</span>"
          : d === units.length ? '<span class="pill ok">Done ✓</span>'
          : isCur ? '<span class="pill now">Now · ' + d + "/" + units.length + "</span>"
          : '<span class="pill">' + d + "/" + units.length + "</span>";
        const n = units.length;
        return (
          '<article class="rm-card line-' + line.color + (isCur ? " cur" : "") + (pct >= 80 ? " gold" : "") + '" data-line="' + line.id + '" aria-labelledby="rm-' + line.id + '">' +
          '<header class="rm-head"><span class="ring-l" aria-hidden="true">' + line.id + '</span><span class="rm-t"><b id="rm-' + line.id + '">' + ui.jp(line.ja, { tokens: false, ro: true }) + "</b><span>" + esc(line.en) + "</span></span>" + chip + "</header>" +
          NI.views.lineStrip(line, step ? step.u.n : 0) +
          '<p class="rm-blurb">' + esc(line.blurb) + (d === n && !(pct >= 80) ? ' <a href="#exam-' + line.id + '">Take the line exam</a>' : "") + "</p></article>"
        );
      })
      .join("");
    const dots = NI.course.lines.map((l) => '<button class="line-' + l.color + (l === cur ? " on" : "") + '" type="button" data-rm-dot="' + l.id + '" aria-label="Show the ' + esc(l.en) + '"><i></i></button>').join("");
    const why =
      '<details class="map-why"><summary>What do H01, M06… mean?</summary><p>Stations are numbered the way real ones are in Japan, where G09 is the ninth stop on Tokyo’s Ginza Line. The letter is the first letter of the line’s Japanese name, so <b>H01</b> is station 1 of the <b>H</b>ajime-sen, the Starting Line.</p><ul class="map-lines">' +
      NI.course.lines.map((l) => '<li><span class="ring-l line-' + l.color + '" aria-hidden="true">' + l.id + "</span>" + ui.jp(l.ja, { tokens: false }) + " <b>" + esc(ui.lineRomaji(l)) + "</b> " + esc(l.en) + "</li>").join("") +
      "</ul><p class=\"small muted\">English initials wouldn’t work: Starting and Onward would both be S, and Can-Do, Conversation and Connections all C.</p></details>";
    return sec("Route map", doneAll + " of " + total + " stations", '<div class="rm-scroll" data-rm>' + cards + '</div><div class="rm-dots">' + dots + "</div>" + why, "rm-sec", "rm-h");
  }

  // An eki stamp (駅スタンプ) for the home row and the stamp book.
  function ekiStamp(u, state) {
    const line = NI.course.lineOf(u.n);
    const code = NI.course.code(u.n);
    if (state !== "done") return '<span class="eki ' + (state || "next") + '" title="' + esc(code + " " + u.en) + ': not collected yet"><b>?</b><span class="eki-en">' + esc(code) + "</span></span>";
    return (
      '<span class="eki line-' + line.color + '" style="--tilt:' + ((U.hash("stamp" + u.n) % 16) - 7) + 'deg" title="' + esc(code + " " + u.en) + '"><span class="eki-l" lang="ja">' + esc(NI.furi.base(line.ja)) + "</span><b>" + esc(code) + '</b><span class="eki-en">' + esc(u.en) + "</span></span>"
    );
  }
  NI.ekiStamp = ekiStamp;

  function stampsRow() {
    const list = NI.game.stamps();
    const got = list.filter((s) => s.done);
    const next = list.find((s) => !s.done);
    const body =
      '<a class="card stamp-row" href="#stamps" aria-label="Stamp book: ' + got.length + " of " + list.length + ' stamps collected">' +
      got.map((s) => ekiStamp(s.unit, "done")).join("") + (next ? ekiStamp(next.unit, "next") : "") +
      (got.length ? "" : '<span class="stamp-hint">Finish every part of ' + esc(NI.course.code(next.unit.n)) + " to collect your first station stamp.</span>") +
      "</a>";
    return sec("Stamps", got.length + " of " + list.length + " collected", body, "st-sec");
  }

  function wotdCard() {
    const w = NI.game.wordOfTheDay();
    if (!w) return "";
    const ex = NI.items.bestExample(w);
    return (
      '<section class="card wotd" aria-labelledby="wotd-h"><p class="tk-label" id="wotd-h"><span class="tk-ja">' + ui.jp("{今日|きょう}の{言葉|ことば}", { tokens: false }) + "</span>" + '<span class="lbl">Word of the day</span></p>' +
      '<div class="wotd-row"><span class="wotd-word">' + ui.wordHead(w, { tokens: false }) + '</span><span class="wotd-btns">' + ui.say(ui.wordAudio(w), w.r) + NI.book.star(w.id) + "</span></div>" +
      '<p class="wotd-en"><b>' + esc(w.en) + "</b> · " + esc(NI.course.posLabel(w.pos)) + ' · <a href="#unit-' + w.unit + '">from ' + esc(NI.course.code(w.unit)) + "</a></p>" +
      (ex ? '<div class="wotd-ex">' + ui.jp(ex.jp) + '<span class="s-tools">' + ui.say(ui.sentenceAudio(ex.jp)) + ui.breakdownBtn(ex.jp, ex.en) + '</span><p class="en">' + esc(ex.en) + "</p></div>" : "") +
      "</section>"
    );
  }

  /* Omikuji: once the daily goal is reached, a paper fortune like the ones
     drawn at shrines. Today's draw is kept in the day's log (ok = fortune,
     om = message, both counted from 1). */
  function omikujiCard() {
    if (!NI.game.goal().done) return "";
    const O = NI.data.omikuji;
    const day = NI.store.today();
    const title = ui.jp("おみくじ", { tokens: false }) + " · Today’s fortune";
    if (!day.ok) {
      return sec(
        title,
        "Goal reached ✓",
        '<div class="card omikuji"><span class="omi-tag" aria-hidden="true" lang="ja">御籤</span><div class="omi-body">' +
          "<p>Goal reached! At shrines people draw a paper fortune, an omikuji. Draw yours for today.</p>" +
          '<button class="btn primary small" type="button" data-omikuji>Draw a fortune</button></div></div>',
        "omi-sec",
        "omi-h"
      );
    }
    const [lv, lvEn] = O.levels[day.ok - 1] || O.levels[3];
    const [msg, msgEn] = O.messages[(day.om || 1) - 1] || O.messages[0];
    return sec(
      title,
      "Goal reached ✓",
      '<div class="card omikuji drawn"><span class="omi-slip" aria-hidden="true"><span>おみくじ</span><b lang="ja">' + esc(NI.furi.base(lv)) + "</b></span>" +
        '<div class="omi-body"><p class="omi-level">' + ui.jp(lv, { tokens: false }) + ui.say(NI.furi.reading(lv)) + '</p><p class="omi-en">' + esc(lvEn) + "</p>" +
        '<p class="omi-msg">' + ui.jp(msg) + ui.say(ui.sentenceAudio(msg)) + '</p><p class="omi-msg-en">' + esc(msgEn) + "</p>" +
        '<p class="small muted">A new fortune tomorrow, once you reach your goal.</p></div></div>',
      "omi-sec",
      "omi-h"
    );
  }

  function drawOmikuji() {
    const O = NI.data.omikuji;
    let roll = Math.random() * 100;
    let i = 0;
    while (i < O.levels.length - 1 && roll >= O.levels[i][2]) roll -= O.levels[i++][2];
    NI.store.log("ok", i + 1);
    NI.store.log("om", 1 + Math.floor(Math.random() * O.messages.length));
    NI.fx.gain(O.levels[i][3], { badges: i === 0 ? NI.game.event("daikichi") : [] });
    NI.fx.play(i === 0 ? "level" : "chime");
    if (i === 0) NI.fx.confetti();
  }

  const greeting = () => {
    const h = new Date().getHours();
    return h >= 4 && h < 11 ? ["おはようございます", "Good morning"] : h >= 11 && h < 18 ? ["こんにちは", "Hello"] : ["こんばんは", "Good evening"];
  };

  pages.plan = {
    title: "Your plan",
    nav: "home",
    render() {
      return planCard("options");
    },
    mount(el) {
      mountPlan(el);
    },
  };

  pages.home = {
    title: "Route map",
    nav: "home",
    render() {
      const c = counts();
      const step = nextStep();
      const g = NI.game.goal();
      const greet = greeting();
      // First visit: the plan comes first, as its own screen. Someone who
      // already has progress gets a nudge instead.
      const st = NI.store.state;
      const started = st.xp > 0 || Object.keys(st.parts).length > 0;
      if (!st.planned && !started) return planCard();
      let html = '<header class="page-head"><h1>' + ui.jp(greet[0], { tokens: false }) + '<span class="sub">' + greet[1] + "</span></h1></header>";
      if (!st.planned) html += '<a class="card plan-nudge" href="#plan"><span class="lr-ic" aria-hidden="true">🧭</span><span class="lr-t"><b>Set up your plan</b><span>Four quick questions, and lessons fit your goal</span></span>' + ui.ICON.chev + "</a>";
      html += homeTiles(c);
      html +=
        '<div class="h-cols"><div class="h-col">' + ticketCard(step) + omikujiCard() + todayCard(c, g) + "</div>" +
        '<div class="h-col">' + routeMap(step) + stampsRow() + wotdCard() + "</div></div>";
      return html;
    },
    mount(el) {
      mountPlan(el);
      const omi = el.querySelector("[data-omikuji]");
      if (omi)
        omi.addEventListener("click", () => {
          omi.disabled = true;
          el.querySelector(".omikuji").classList.add("shake");
          setTimeout(() => {
            drawOmikuji();
            NI.app.render();
          }, 700);
        });
      // The route map starts at the current line; the dots follow the scroll.
      const rm = el.querySelector("[data-rm]");
      if (rm) {
        const cards = Array.from(rm.children);
        const dots = Array.from(el.querySelectorAll("[data-rm-dot]"));
        const pad = () => parseFloat(getComputedStyle(rm).paddingLeft) || 0;
        const cur = rm.querySelector(".cur");
        if (cur) rm.scrollLeft = cur.offsetLeft - pad();
        let raf = 0;
        const sync = () => {
          raf = 0;
          const x = rm.scrollLeft + pad();
          let best = 0;
          cards.forEach((c, i) => { if (Math.abs(c.offsetLeft - x) < Math.abs(cards[best].offsetLeft - x)) best = i; });
          dots.forEach((d, i) => d.classList.toggle("on", i === best));
        };
        rm.addEventListener("scroll", () => { if (!raf) raf = root.requestAnimationFrame(sync); }, { passive: true });
        dots.forEach((d, i) => d.addEventListener("click", () => rm.scrollTo({ left: cards[i].offsetLeft - pad(), behavior: root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })));
        sync();
      }
      // Recent stamps in view.
      const sr = el.querySelector(".stamp-row");
      if (sr) sr.scrollLeft = sr.scrollWidth;
    },
  };

  // ---------------------------------------------------------------------------
  function builderHtml() {
    const B = NI.data.builder;
    const st = NI.store.state.intro || {};
    const opt = (list, key, empty) =>
      (empty ? '<option value="">' + esc(empty) + "</option>" : "") +
      list.map((x, i) => '<option value="' + i + '"' + (String(st[key]) === String(i) ? " selected" : "") + ">" + esc(x.en) + " — " + esc(NI.furi.reading(x.j)) + "</option>").join("");
    return (
      '<section class="builder" aria-labelledby="builder-h"><h2 id="builder-h">Your own introduction</h2>' +
      "<p>Fill this in and you have a self-introduction you can say today.</p>" +
      '<div class="form-grid">' +
      '<label for="b-name">Your name, typed the way it sounds<input id="b-name" type="text" placeholder="Emily → emiri-" value="' + esc(st.name || "") + '"></label>' +
      '<label for="b-country">Where you’re from<select id="b-country">' + opt(B.COUNTRIES, "country") + "</select></label>" +
      '<label for="b-job">What you do<select id="b-job">' + opt(B.JOBS, "job") + "</select></label>" +
      '<label for="b-hobby">Something you like (optional)<select id="b-hobby">' + opt(B.HOBBIES, "hobby", "—") + "</select></label>" +
      "</div>" +
      '<div class="b-out" aria-live="polite"></div>' +
      "</section>"
    );
  }

  function builderLines() {
    const B = NI.data.builder;
    const st = NI.store.state.intro || {};
    const name = (st.name || "").trim();
    const c = B.COUNTRIES[Number(st.country || 0)] || B.COUNTRIES[0];
    const j = B.JOBS[Number(st.job || 0)] || B.JOBS[0];
    const h = st.hobby !== "" && st.hobby != null ? B.HOBBIES[Number(st.hobby)] : null;
    const lines = [
      ["はじめまして。", "Nice to meet you."],
      [(name || "＿＿") + "です。", "I'm " + (name ? name : "…") + "."],
      [c.j + "から{来|き}ました。", "I'm from " + (/^(USA|UK|Netherlands|Philippines)$/.test(c.en) ? "the " : "") + c.en + "."],
      // "an engineer", but "a university student"
      [j.j + "です。", "I'm " + (/^([aeio]|u(?!ni))/i.test(j.en) ? "an " : "a ") + j.en.replace(/ \(.*\)$/, "") + "."],
    ];
    if (h) lines.push([h.j + "が {好|す}きです。", "I like " + h.en + "."]);
    lines.push(["よろしくお{願|ねが}いします。", "I look forward to getting to know you."]);
    return lines;
  }

  function mountBuilder(el) {
    const out = el.querySelector(".b-out");
    if (!out) return;
    const name = el.querySelector("#b-name");
    NI.kana.bindIme(name, { katakana: true });
    const draw = () => {
      const lines = builderLines();
      out.innerHTML =
        '<ol class="b-lines">' + lines.map(([jp, en]) => "<li>" + ui.jp(jp, { tokens: false }) + '<span class="en">' + esc(en) + "</span></li>").join("") + "</ol>" +
        '<div class="row wrap">' + ui.say(lines.map((l) => NI.furi.base(l[0])).join(""), "your introduction") + '<button class="btn small ghost" type="button" data-copy-intro>Copy text</button></div>';
      out.querySelector("[data-copy-intro]").addEventListener("click", () => copyText(lines.map((l) => NI.furi.base(l[0])).join("\n")));
    };
    name.addEventListener("input", () => {
      NI.store.setIntro("name", name.value);
      draw();
    });
    for (const key of ["country", "job", "hobby"]) {
      el.querySelector("#b-" + key).addEventListener("change", (e) => {
        NI.store.setIntro(key, e.target.value);
        draw();
      });
    }
    draw();
  }

  // Copies text; msg is what the toast says once it's done.
  function copyText(text, msg) {
    const done = () => ui.toast(msg || "Copied.");
    try {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, msg));
    } catch (e) {
      fallbackCopy(text, msg);
    }
  }
  function fallbackCopy(text, msg) {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    t.remove();
    ui.toast(ok ? msg || "Copied." : "Select the text and copy it manually.");
  }
  NI.copyText = copyText;

  pages.unit = {
    nav: "home",
    title(args) {
      const u = NI.course.unit(args[0]);
      return u ? NI.course.code(u.n) + " " + u.en : "Unit";
    },
    render(args) {
      const u = NI.course.unit(args[0]);
      if (!u) return '<p class="empty">That unit doesn\'t exist. <a href="#home">Back to the route map</a></p>';
      const parts = NI.course.parts(u);
      const next = parts.find((p) => !NI.store.partDone(u.n, p.key));
      const line = NI.course.lineOf(u.n);
      let html =
        '<header class="page-head"><p class="crumb"><a href="#home">Route map</a></p><h1>Station ' + esc(NI.course.code(u.n)) + '<span class="sub">' + ui.jp(line.ja, { tokens: false }) + " · " + esc(line.en) + "</span></h1></header>";
      html += NI.views.sign(u);
      html +=
        '<section class="card steps" aria-label="Lesson parts"><ol class="step-list">' +
        parts
          .map((p, i) => {
            const done = NI.store.partDone(u.n, p.key);
            const isNext = next && next.key === p.key;
            const sub = p.words ? U.plural(p.words.length, "word") : p.key === "s" ? "Grammar in sentences" : "Listen, read, answer";
            const href = "#learn-" + u.n + "-" + p.key;
            return (
              '<li class="step ' + (done ? "done" : isNext ? "next" : "todo") + '">' +
              '<span class="step-n" aria-hidden="true">' + (done ? ui.ICON.check : i + 1) + "</span>" +
              '<div class="step-text"><b>' + esc(p.title) + (done ? '<span class="sr"> (done)</span>' : "") + "</b><span>" + esc(sub) + "</span></div>" +
              (isNext ? '<a class="btn primary step-go" href="' + href + '">Start ' + esc(p.title) + "</a>" : '<a class="btn small ghost" href="' + href + '" aria-label="' + (done ? "Practise " + esc(p.title) + " again" : "Start " + esc(p.title)) + '">' + (done ? "Again" : "Start") + "</a>") +
              "</li>"
            );
          })
          .join("") +
        "</ol></section>";
      html += '<p class="unit-intro">' + esc(u.intro) + " Read the words, grammar and examples below first, or jump straight into a lesson. Finished parts go into your reviews.</p>";
      html += NI.views.aids();

      html += '<section class="card u-card" aria-labelledby="w-h"><h2 id="w-h">Words <span class="count">' + u.words.length + "</span></h2>" + NI.views.wordList(u.words) + "</section>";

      // The kanji this unit's words bring in, each opening its card.
      const kj = NI.kanji ? NI.kanji.list().filter((x) => x.unit === u.n) : [];
      if (kj.length)
        html +=
          '<section class="u-sec" aria-labelledby="k-h"><h2 id="k-h">New kanji <span class="count">' + kj.length + "</span></h2>" +
          '<div class="kj-grid kj-strip">' + kj.map((x) => '<a class="kc-cell kj-cell lv-' + NI.kanji.level(x.k) + '" href="#kanji-' + encodeURIComponent(x.k) + '"><b lang="ja">' + esc(x.k) + "</b><small>" + esc(NI.data.kanji[x.k][1].split(/[;,(]/)[0].trim()) + "</small></a>").join("") + "</div>" +
          '<p class="small muted">Tap one for its readings, stroke order and words, and to put it in your reviews.</p></section>';

      if (u.grammar && u.grammar.length) {
        html +=
          '<section class="u-sec" aria-labelledby="g-h"><h2 id="g-h">Grammar</h2>' +
          u.grammar.map((g) => '<article class="gpoint"><h3>' + esc(g.t) + '</h3><div class="gbody">' + ui.rich(g.body) + "</div>" + NI.views.examples(g.ex) + "</article>").join("") +
          "</section>";
      }
      html += '<section class="u-sec" aria-labelledby="s-h"><h2 id="s-h">Example sentences</h2><p class="small muted">Tap any word for its meaning.</p>' + NI.views.sentenceList(u.sentences) + "</section>";
      if (u.dialogue) html += '<section class="u-sec" aria-labelledby="d-h"><h2 id="d-h">Conversation</h2>' + NI.views.dialogue(u, { roleplay: true }) + "</section>";
      if (u.builder) html += builderHtml();
      if (u.culture) html += '<aside class="culture"><h2>' + ui.jp("{豆知識|まめちしき}", { tokens: false }) + " · " + esc(u.culture.t) + "</h2>" + ui.rich(u.culture.body) + "</aside>";
      const nu = NI.course.unit(u.n + 1);
      html += '<nav class="unit-foot">' + (next ? '<a class="btn primary" href="#learn-' + u.n + "-" + next.key + '">Start ' + esc(next.title) + "</a>" : nu ? '<a class="btn primary" href="#unit-' + nu.n + '">Next station: ' + esc(NI.course.code(nu.n)) + " " + esc(nu.en) + "</a>" : '<a class="btn primary" href="#home">Back to the route map</a>') + "</nav>";
      return html;
    },
    mount(el, args) {
      const u = NI.course.unit(args[0]);
      if (!u) return;
      NI.views.bindAids(el);
      if (u.dialogue) NI.views.bindDialogue(el, u);
      if (u.builder) mountBuilder(el);
    },
    unmount() {
      NI.views.stopDialogue();
    },
  };

  // ---------------------------------------------------------------------------
  pages.phrases = {
    title: "Phrasebook",
    nav: "tools",
    render() {
      const P = NI.data.phrases;
      let html =
        '<header class="page-head"><h1>Phrasebook</h1><p>Ready-made phrases for the situations you meet first. Learn them as whole chunks; tap ★ to add one to your reviews.</p>' +
        '<nav class="chips" aria-label="Sections">' + P.map((s) => '<button class="chip" type="button" data-jump="ph-' + s.id + '">' + esc(s.en) + "</button>").join("") + "</nav></header>";
      for (const s of P) {
        html +=
          '<section class="phr-sec" id="ph-' + s.id + '"><h2>' + ui.jp(s.ja, { tokens: false }) + ' <span class="sub">' + esc(s.en) + '</span></h2><ul class="phrases">' +
          s.items
            .map((p, i) => {
              const id = NI.items.phraseId(s, i);
              const on = NI.store.hasItem(id);
              return (
                '<li><div class="ph-jp">' + ui.jp(p.jp) + ui.say(ui.sentenceAudio(p.jp)) + "</div>" +
                '<p class="en">' + esc(p.en) + "</p>" + (p.note ? '<p class="s-note">' + esc(p.note) + "</p>" : "") +
                '<button class="star' + (on ? " on" : "") + '" type="button" data-star="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? "Remove from reviews" : "Add to reviews") + '">' + ui.ICON.star + "</button></li>"
              );
            })
            .join("") +
          "</ul></section>";
      }
      return html;
    },
    mount(el) {
      el.addEventListener("click", (e) => {
        const s = e.target.closest("[data-star]");
        if (!s) return;
        const id = s.getAttribute("data-star");
        if (NI.store.hasItem(id)) {
          NI.store.removeItem(id);
          s.classList.remove("on");
          s.setAttribute("aria-pressed", "false");
          s.setAttribute("aria-label", "Add to reviews");
          ui.toast("Removed from your reviews.");
        } else {
          NI.store.addItems([id]);
          s.classList.add("on");
          s.setAttribute("aria-pressed", "true");
          s.setAttribute("aria-label", "Remove from reviews");
          ui.toast("Added. It will come up in your reviews.");
        }
      });
    },
  };

  // ---------------------------------------------------------------------------
  pages.words = {
    title: "Word list",
    nav: "tools",
    render() {
      return (
        '<header class="page-head"><h1>Word list <span class="sub">' + ui.jp("{単語|たんご}リスト", { tokens: false }) + "</span></h1>" +
        "<p>Every word in the course, in the order you meet it. Search in English, kana or romaji, and tap the bookmark to save a word to your <a href=\"#book\">word book</a>.</p>" +
        '<div class="row wrap"><label class="sr" for="w-q">Search words</label><input id="w-q" class="search" type="search" placeholder="Search: eat, たべる, taberu">' +
        '<div class="seg" role="group" aria-label="Filter"><button type="button" class="seg-b on" data-f="all">All</button><button type="button" class="seg-b" data-f="in">In review</button><button type="button" class="seg-b" data-f="new">Not yet</button></div></div></header>' +
        '<div id="w-list"></div>'
      );
    },
    mount(el) {
      const q = el.querySelector("#w-q");
      const list = el.querySelector("#w-list");
      let filter = "all";
      const draw = () => {
        const term = q.value.trim().toLowerCase();
        const kana = term ? NI.kana.fold(NI.kana.romajiToHiragana(term, true)) : "";
        let html = "";
        let shown = 0;
        for (const u of NI.course.units) {
          const words = u.words.filter((w) => {
            const inR = NI.store.hasItem(w.id);
            if (filter === "in" && !inR) return false;
            if (filter === "new" && inR) return false;
            if (!term) return true;
            return w.en.toLowerCase().indexOf(term) >= 0 || w.w.indexOf(term) >= 0 || (kana && NI.kana.fold(w.r).indexOf(kana) >= 0) || (kana && NI.kana.fold(NI.furi.reading(w.head)).indexOf(kana) >= 0);
          });
          if (!words.length) continue;
          shown += words.length;
          html += '<section class="u-sec"><h2><a href="#unit-' + u.n + '">' + ui.stationCode(u.n) + " " + esc(u.en) + "</a></h2>" + NI.views.wordList(words) + "</section>";
        }
        list.innerHTML = html || '<p class="empty">No words match “' + esc(q.value) + "”.</p>";
        list.setAttribute("aria-label", shown + " words");
      };
      q.addEventListener("input", draw);
      el.querySelectorAll("[data-f]").forEach((b) =>
        b.addEventListener("click", () => {
          filter = b.getAttribute("data-f");
          el.querySelectorAll("[data-f]").forEach((x) => x.classList.toggle("on", x === b));
          draw();
        })
      );
      draw();
    },
  };

  // ---------------------------------------------------------------------------
  pages.grammar = {
    title: "Grammar",
    nav: "tools",
    render() {
      const cell = (m) => "<td>" + ui.jp(m, { tokens: false, gaps: false }) + "</td>";
      const particles = NI.data.grammar.filter((g) => g.kind === "particle");
      let html = '<header class="page-head"><h1>Grammar reference</h1><p>The patterns from every unit in one place, plus tables you can come back to.</p></header>';

      html +=
        '<section class="u-sec"><h2>Particles at a glance</h2><div class="table-wrap"><table class="ref"><thead><tr><th>Particle</th><th>What it does</th><th>Unit</th></tr></thead><tbody>' +
        particles.map((g) => "<tr>" + '<td class="big-jp">' + ui.jp(g.s, { tokens: false }) + "</td><td>" + esc(g.en) + '</td><td><a href="#unit-' + g.u + '">' + esc(NI.course.code(g.u)) + "</a></td></tr>").join("") +
        "</tbody></table></div></section>";

      const verbs = [
        ["{飲|の}む", "v5", "drink"], ["{書|か}く", "v5", "write"], ["{話|はな}す", "v5", "speak"], ["{待|ま}つ", "v5", "wait"], ["{買|か}う", "v5", "buy"],
        ["{帰|かえ}る", "v5", "go home"], ["{急|いそ}ぐ", "v5", "hurry"], ["{遊|あそ}ぶ", "v5", "play"], ["{行|い}く", "v5k-s", "go"],
        ["{食|た}べる", "v1", "eat"], ["{見|み}る", "v1", "see"], ["する", "vs", "do"], ["{来|く}る", "vk", "come"],
      ];
      const vcols = [["dict", "dictionary"], ["masu", "〜ます"], ["masen", "〜ません"], ["mashita", "〜ました"], ["te", "て-form"], ["ta", "た-form"], ["nai", "ない-form"]];
      html +=
        '<section class="u-sec"><h2>Verb forms</h2><p>Groups: 1 = u-verbs, 2 = ru-verbs, 3 = irregular. 行く is group 1 with an irregular て-form.</p><div class="table-wrap"><table class="ref verbs"><thead><tr><th>Verb</th><th>Group</th>' +
        vcols.map((c) => "<th>" + esc(c[1]) + "</th>").join("") + "</tr></thead><tbody>" +
        verbs.map(([j, pos, en]) => {
          const f = NI.conj.forms({ j, pos });
          return "<tr><th scope=\"row\">" + esc(en) + "</th><td>" + NI.conj.group(pos) + "</td>" + vcols.map((c) => cell(f[c[0]])).join("") + "</tr>";
        }).join("") +
        "</tbody></table></div></section>";

      const adjs = [["{高|たか}い", "adj-i", "expensive"], ["いい", "adj-ix", "good"], ["{静|しず}か", "adj-na", "quiet"]];
      html +=
        '<section class="u-sec"><h2>Adjective forms</h2><div class="table-wrap"><table class="ref"><thead><tr><th></th><th>is</th><th>is not</th><th>was</th><th>was not</th><th>+ noun</th></tr></thead><tbody>' +
        adjs.map(([j, pos, en]) => {
          const f = NI.conj.forms({ j, pos });
          const row = pos === "adj-na" ? [j + "です", j + "じゃないです", j + "でした", j + "じゃなかったです", f.na + "{町|まち}"] : [j + "です", f.neg + "です", f.past + "です", f.pastneg + "です", j + "{町|まち}"];
          return '<tr><th scope="row">' + esc(en) + "</th>" + row.map(cell).join("") + "</tr>";
        }).join("") +
        "</tbody></table></div></section>";

      const C = NI.num.COUNTERS;
      html +=
        '<section class="u-sec"><h2>Numbers and counters</h2><p>The sound changes are the tricky part; the table shows them all.</p><div class="table-wrap"><table class="ref nums"><thead><tr><th></th><th>number</th><th>things 〜つ</th><th>people 〜人</th><th>o’clock 〜時</th><th>minutes 〜分</th><th>age 〜歳</th></tr></thead><tbody>' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => '<tr><th scope="row">' + n + "</th>" + [NI.num.toKana(n), C.tsu(n), C.nin(n), C.ji(n), C.fun(n), C.sai(n)].map((x) => '<td lang="ja">' + esc(x) + "</td>").join("") + "</tr>").join("") +
        '</tbody></table></div><p class="small muted">Big numbers: 百 ひゃく (100), 千 せん (1,000), 万 まん (10,000). 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3,000 さんぜん, 8,000 はっせん.</p></section>';

      html += '<section class="u-sec"><h2>Grammar by unit</h2><ol class="gindex">';
      for (const u of NI.course.units) {
        if (!u.grammar || !u.grammar.length) continue;
        html += '<li><a href="#unit-' + u.n + '">' + ui.stationCode(u.n) + " " + esc(u.en) + "</a><ul>" + u.grammar.map((g) => "<li>" + esc(g.t) + "</li>").join("") + "</ul></li>";
      }
      html += "</ol></section>";
      return html;
    },
  };

  // ---------------------------------------------------------------------------
  function toggle(key, label, desc) {
    const on = !!NI.store.settings[key];
    return '<label class="toggle" for="t-' + key + '"><input type="checkbox" id="t-' + key + '" data-set="' + key + '"' + (on ? " checked" : "") + "><span><b>" + label + "</b>" + (desc ? "<small>" + desc + "</small>" : "") + "</span></label>";
  }

  /* A daily reminder, as a repeating calendar event with an alert: a static
     site can't send notifications on its own, but every phone's calendar can.
     Google Calendar takes a link; Apple Calendar, Outlook and the rest take
     an .ics file. Times are local ("floating"), so 19:00 stays 19:00 when
     travelling. */
  const pad = (n) => String(n).padStart(2, "0");
  function reminderStart(time) {
    const [h, m] = String(time || "19:00").split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    return d;
  }
  const icsStamp = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  function reminderText() {
    const goal = Number(NI.store.settings.dailyGoal) || 60;
    return { title: "日本: time for Japanese", body: "Reviews first, then a lesson part: your daily goal is " + goal + " XP.", url: NI.move.base() + "#review" };
  }
  // Calendar lines wrap at 75 bytes, carrying on after a space.
  function fold(line) {
    let out = "";
    let n = 0;
    for (const ch of line) {
      const c = ch.codePointAt(0);
      const b = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      if (n + b > 75) {
        out += "\r\n ";
        n = 1;
      }
      out += ch;
      n += b;
    }
    return out;
  }
  function reminderIcs(time) {
    const start = reminderStart(time);
    const end = new Date(start.getTime() + 15 * 60000);
    const t = reminderText();
    const now = new Date();
    const utc = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const text = (s) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nihon//Daily reminder//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:nihon-daily-" + now.getTime() + "@patschgoo.github.io", "DTSTAMP:" + utc,
      "DTSTART:" + icsStamp(start), "DTEND:" + icsStamp(end), "RRULE:FREQ=DAILY",
      "SUMMARY:" + text(t.title), "DESCRIPTION:" + text(t.body + "\n" + t.url), "URL:" + t.url,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + text(t.title), "TRIGGER:PT0M", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR", "",
    ]
      .map(fold)
      .join("\r\n");
  }
  function reminderGoogle(time) {
    const start = reminderStart(time);
    const end = new Date(start.getTime() + 15 * 60000);
    const t = reminderText();
    const q = { action: "TEMPLATE", text: t.title, dates: icsStamp(start) + "/" + icsStamp(end), details: t.body + "\n" + t.url, recur: "RRULE:FREQ=DAILY" };
    return "https://calendar.google.com/calendar/render?" + Object.keys(q).map((k) => k + "=" + encodeURIComponent(q[k])).join("&");
  }

  // Options: the profile in use, and the others to switch to.
  // A segmented control made of radio buttons: [[value, label], …].
  function segRadio(name, current, options, label) {
    return (
      '<div class="seg seg-radio" role="radiogroup" aria-label="' + esc(label) + '">' +
      options.map(([v, t]) => '<label class="seg-b" for="' + name + "-" + esc(v) + '"><input class="sr" type="radio" id="' + name + "-" + esc(v) + '" name="' + name + '" value="' + esc(v) + '"' + (String(current) === String(v) ? " checked" : "") + "><span>" + t + "</span></label>").join("") +
      "</div>"
    );
  }

  // The profile: its icon, name and level, and a way to switch.
  function profileSection() {
    const cur = NI.store.profile;
    const L = NI.game.level(NI.store.state.xp);
    return (
      '<div class="card prof-card" id="opt-profile"><span class="prof-ic" aria-hidden="true">' + cur.icon + '</span><span class="prof-t"><b>' + esc(cur.name) + "</b>" +
      '<span class="small">Lv ' + L.n + " · " + ui.jp(L.title.ja, { tokens: false }) + " " + esc(L.title.en) + "</span>" + ui.progressBar(L.frac, "Progress to level " + (L.n + 1)) + "</span>" +
      '<button class="btn small ghost" type="button" data-profiles aria-haspopup="dialog">Switch</button></div>'
    );
  }

  // How the theme choice reads, given the device's own setting.
  function themeNote(v) {
    const dark = root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches;
    return v === "light" ? "Always light." : v === "dark" ? "Always dark." : "Matches your device, which is " + (dark ? "dark" : "light") + " right now.";
  }

  pages.options = {
    title: "Options",
    nav: "options",
    render() {
      const s = NI.store.settings;
      const sample = "{私|わたし}は コーヒーを {飲|の}みます。";
      let voices = "";
      if (!NI.speech.supported) {
        voices = '<p class="note">This browser has no speech synthesis, so audio is unavailable.</p>';
      } else {
        // Voices best first, with what kind each is; and, when the best here is
        // a basic one, where this device can get a more natural one.
        const best = NI.speech.best;
        const KIND = { natural: " · natural", online: " · online", basic: "" };
        const ua = navigator.userAgent;
        const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
        const tip =
          /iPhone|iPad|iPod/.test(ua) || ipad
            ? "<b>iPhone/iPad:</b> Settings → Accessibility → Spoken Content → Voices → Japanese, and download <b>Kyoko (Enhanced)</b>, <b>Otoya (Enhanced)</b> or <b>O-Ren (Premium)</b>. Then reload this page."
            : /Macintosh/.test(ua)
              ? "<b>Mac:</b> System Settings → Accessibility → Spoken Content → System voice → Manage Voices → Japanese, and add <b>Kyoko (Enhanced)</b> or <b>O-Ren (Premium)</b>. Then reload this page."
              : /Android/.test(ua)
                ? "<b>Android:</b> Settings → Text-to-speech (under System or Accessibility) → Google speech services → Install voice data → Japanese, and download a voice. Then reload this page."
                : /Windows/.test(ua)
                  ? "<b>Windows:</b> open this site in <b>Microsoft Edge</b>: its natural Japanese voices (Nanami, Keita) sound far better than the built-in ones."
                  : "";
        voices =
          '<select id="voice" aria-label="Voice"><option value="">Automatic' + (best ? " (" + esc(best.v.name) + ")" : "") + "</option>" +
          NI.speech.ranked.map(({ v, kind }) => '<option value="' + esc(v.voiceURI) + '"' + (s.voice === v.voiceURI ? " selected" : "") + ">" + esc(v.name + KIND[kind]) + "</option>").join("") +
          "</select>" +
          (NI.speech.hasVoice && best && best.kind !== "natural" && tip ? '<p class="note">For a more natural voice: ' + tip + "</p>" : "") +
          (NI.speech.hasVoice ? "" : '<p class="note">No Japanese voice found on this device. To add one: <b>Windows</b> Settings → Time &amp; language → Speech → Add voices → Japanese. <b>macOS</b> System Settings → Accessibility → Spoken Content → System voice → Manage voices → Japanese. <b>Android</b> install Google Speech Services and add Japanese. <b>iPhone/iPad</b> Settings → Accessibility → Spoken Content → Voices → Japanese. Then reload this page.</p>');
      }
      const plan = NI.plan.GOALS.find((g) => g.id === s.goal);
      const sec = (id, title, body) => '<section class="h-sec opt-sec" id="' + id + '"><div class="sec-head"><h2>' + title + '</h2></div><div class="card opt-card">' + body + "</div></section>";
      const row = (label, body, cls) => '<div class="opt-row' + (cls ? " " + cls : "") + '"><span class="opt-l">' + label + "</span>" + body + "</div>";
      const THEMES = [["system", "Match device"], ["light", "Light"], ["dark", "Dark"]];
      const SIZES = [["s", 18], ["m", 22], ["l", 27], ["xl", 32]];
      return (
        '<header class="page-head"><p class="crumb"><a href="#more">More</a></p><h1>Options<span class="sub">' + ui.jp("{設定|せってい}", { tokens: false }) + "</span></h1></header>" +
        (NI.store.persistent ? "" : '<p class="note">Your browser is blocking storage, so progress will be lost when you close this page.</p>') +
        '<div class="opt-cols"><div class="h-col">' +
        profileSection() +
        '<section class="h-sec opt-sec" id="opt-look"><div class="sec-head"><h2>Theme</h2></div><div class="card opt-card">' +
        '<div class="theme-tiles" role="radiogroup" aria-label="Theme">' +
        THEMES.map(([v, t]) => '<label class="theme-tile th-' + v + '" for="theme-' + v + '"><input class="sr" type="radio" id="theme-' + v + '" name="theme" value="' + v + '"' + (s.theme === v ? " checked" : "") + '><span class="th-prev" aria-hidden="true"><i></i><i></i><i></i></span><span class="th-t">' + t + "</span></label>").join("") +
        '</div><p class="small muted theme-note" aria-live="polite">' + themeNote(s.theme) + "</p></div></section>" +
        '<section class="h-sec opt-sec"><div class="sec-head"><h2>Text size</h2></div><div class="card opt-card">' +
        '<div class="size-btns" role="radiogroup" aria-label="Text size">' +
        SIZES.map(([v, px], i) => '<label class="size-b" for="textSize-' + v + '"><input class="sr" type="radio" id="textSize-' + v + '" name="textSize" value="' + v + '"' + (s.textSize === v ? " checked" : "") + '><span lang="ja" style="font-size:' + px + 'px" aria-hidden="true">あ</span><span class="sr">' + ["Small", "Medium", "Large", "Extra large"][i] + "</span></label>").join("") +
        "</div></div></section>" +
        sec(
          "opt-data",
          "Your progress",
          '<a class="list-row" href="#move"><span class="lr-t"><b>Move to another device</b></span><span class="lr-v">Link or file</span>' + ui.ICON.chev + "</a>" +
            (root.NI_EMBED ? "" : '<a class="list-row" href="#move-sync"><span class="lr-t"><b>Sync automatically</b>' + (NI.sync && NI.sync.connected ? "<span>With GitHub as " + esc(NI.sync.status.login) + "</span>" : "") + '</span><span class="pill' + (NI.sync && NI.sync.connected ? " ok" : "") + '">' + (NI.sync && NI.sync.connected ? "On" : "Off") + "</span>" + ui.ICON.chev + "</a>") +
            '<button class="list-row danger-row" type="button" data-reset><span class="lr-t"><b>Reset this profile’s progress</b><span>Lessons, reviews and the word book</span></span></button>'
        ) +
        sec(
          "opt-lessons",
          "Lessons and reviews",
          row("Cards in one review session", segRadio("reviewLimit", s.reviewLimit, [[20, "20"], [50, "50"], [100, "100"]], "Cards in one review session"), "stack") +
            toggle("autoNext", "Move on after a right answer", "Skip the Next button when you get it right") +
            toggle("retryMissed", "Missed questions come back", "Asked again, another way, at the end of a lesson") +
            toggle("relaxed", "Relaxed mode", "No clocks or hearts in games, a softer sound for mistakes")
        ) +
        '</div><div class="h-col">' +
        sec(
          "opt-reading",
          "Reading aids",
          '<div class="opt-row stack"><span class="opt-l">Furigana</span>' + segRadio("furigana", s.furigana, [["furigana", "Always"], ["hover", "On tap"], ["kana", "Kana only"]], "Furigana") +
            '<div class="preview" aria-live="polite">' + ui.jp(sample) + "</div></div>" +
            toggle("gloss", "Word meanings", "English under each Japanese word") +
            toggle("romaji", "Romaji", "Latin letters under each word") +
            toggle("particles", "Particle colours", "は topic, が subject, を object …") +
            toggle("handFont", "Handwriting-style font", "For big words in lessons") +
            toggle("kataHelp", "Katakana help", "Hiragana above katakana until you can read it") +
            toggle("gaps", "Space between phrases", "Small gaps make sentences easier to split") +
            toggle("romajiPop", "Romaji in word pop-ups", "Without romaji under every word") +
            toggle("tapSpeak", "Say words when you tap them", "Tap a word to see what it means and hear it") +
            toggle("selBar", "Listen and translate selected text", "Select Japanese for Listen, Slowly, Meaning and Translate")
        ) +
        sec(
          "opt-plan",
          "Plan & audio",
          '<a class="list-row" href="#plan"><span class="lr-t"><b>Your plan</b></span><span class="lr-v">' + (plan ? plan.icon + " " + esc(plan.t) : "Not set") + "</span>" + ui.ICON.chev + "</a>" +
            row("Daily goal", segRadio("dailyGoal", s.dailyGoal, NI.plan.DAILY.map(([xp, t]) => [xp, esc(t) + "<small>" + xp + " XP</small>"]), "Daily goal"), "stack") +
            row("Lesson focus", segRadio("focus", s.focus, NI.plan.FOCI.map(([v, t]) => [v, esc(t)]), "Lesson focus"), "stack wrap-seg") +
            '<div class="opt-row stack" id="opt-audio"><span class="opt-l">Voice</span>' + voices + "</div>" +
            '<div class="opt-row stack"><label class="opt-l" for="rate">Speaking speed <output id="rate-out">' + Number(s.rate).toFixed(2) + "×</output></label>" +
            '<input id="rate" type="range" min="0.5" max="1.2" step="0.05" value="' + esc(s.rate) + '">' +
            (NI.speech.supported ? '<button class="btn small ghost" type="button" data-test-voice>' + ui.ICON.speaker + "<span>Test the voice</span></button>" : "") + "</div>" +
            toggle("autoplay", "Play audio automatically", "Words and sentences are spoken as they appear") +
            toggle("sound", "Sound effects", "A chime for right answers, combos and rewards") +
            (navigator.vibrate ? toggle("buzz", "Vibration", "A short buzz for right and wrong answers") : "") +
            '<div class="opt-row stack remind"><span class="opt-l">Daily reminder</span><span class="small muted">A repeating event in your calendar, with an alert, so your phone reminds you every day.</span>' +
            '<div class="row wrap"><label class="remind-time" for="remind-at">At <input id="remind-at" type="time" value="' + esc(s.remindAt || "19:00") + '"></label>' +
            '<a class="btn small primary" data-remind-google target="_blank" rel="noopener" href="' + esc(reminderGoogle(s.remindAt)) + '">Google Calendar</a>' +
            (root.NI_EMBED ? "" : '<button class="btn small ghost" type="button" data-remind-ics>Apple, Outlook or other</button>') +
            "</div></div>"
        ) +
        "</div></div>" +
        '<p class="small muted opt-version"><span lang="ja">日本</span> version ' + NI.VERSION + " · settings are saved in this browser, for each learning profile" + (root.NI_EMBED ? "" : ' · <button class="btn small ghost" type="button" data-check-update>Check for a new version</button>') + "</p>"
      );
    },
    mount(el) {
      // The daily reminder: the time is kept with the profile's settings.
      const at = el.querySelector("#remind-at");
      const gLink = el.querySelector("[data-remind-google]");
      at.addEventListener("change", () => {
        NI.store.set("remindAt", at.value || "19:00", true);
        gLink.href = reminderGoogle(at.value);
      });
      gLink.addEventListener("click", () => {
        NI.store.set("remindAt", at.value || "19:00", true);
        gLink.href = reminderGoogle(at.value);
      });
      const ics = el.querySelector("[data-remind-ics]");
      if (ics)
        ics.addEventListener("click", () => {
          NI.store.set("remindAt", at.value || "19:00", true);
          try {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([reminderIcs(at.value)], { type: "text/calendar" }));
            a.download = "nihon-daily-reminder.ics";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              URL.revokeObjectURL(a.href);
              a.remove();
            }, 500);
            ui.toast("Open the file to add the reminder to your calendar.");
          } catch (e) {
            ui.toast("Saving a file isn't possible here. Use the Google Calendar link instead.");
          }
        });
      const upd = el.querySelector("[data-check-update]");
      if (upd) upd.addEventListener("click", () => NI.app.checkVersion(true));
      const preview = el.querySelector(".preview");
      const refreshPreview = () => (preview.innerHTML = ui.jp("{私|わたし}は コーヒーを {飲|の}みます。"));
      el.querySelectorAll('input[type="radio"]').forEach((r) =>
        r.addEventListener("change", () => {
          NI.store.set(r.name, r.name === "dailyGoal" || r.name === "reviewLimit" ? Number(r.value) : r.value);
          if (r.name === "theme") el.querySelector(".theme-note").textContent = themeNote(r.value);
          refreshPreview();
        })
      );
      el.querySelectorAll("[data-set]").forEach((c) =>
        c.addEventListener("change", () => {
          NI.store.set(c.getAttribute("data-set"), c.checked);
          refreshPreview();
        })
      );
      const rate = el.querySelector("#rate");
      rate.addEventListener("input", () => {
        el.querySelector("#rate-out").textContent = Number(rate.value).toFixed(2) + "×";
        NI.store.set("rate", Number(rate.value));
      });
      const voice = el.querySelector("#voice");
      if (voice) voice.addEventListener("change", () => NI.store.set("voice", voice.value));
      const test = el.querySelector("[data-test-voice]");
      if (test) test.addEventListener("click", () => NI.speech.speak("こんにちは。日本語の勉強、頑張ってください。"));
      el.querySelector("[data-reset]").addEventListener("click", () =>
        ui.confirm({ title: "Reset " + NI.store.profile.name + "'s progress?", body: "Finished lessons, every review card and the word book of this profile will be deleted. Settings and other profiles stay as they are.", ok: "Reset progress", danger: true }).then((yes) => {
          if (!yes) return;
          NI.store.reset();
          ui.toast("Progress reset.");
          NI.app.go("home");
        })
      );
    },
  };

  // Counts for the More and Tools tiles.
  function tileCounts() {
    const st = NI.store.state;
    const KP = NI.kanaPractice;
    let kana = null;
    if (KP) {
      let n = 0;
      let all = 0;
      const G = KP.groups();
      for (const sc of ["hira", "kata"]) {
        const g = (G[sc] || []).find((x) => x.id === "basic");
        if (!g) continue;
        const ks = [].concat(...g.cards.map((c) => c.kana));
        all += ks.length;
        n += ks.filter((k) => KP.level(k) === "known").length;
      }
      kana = n + "/" + all;
    }
    const kanji = NI.kanji ? NI.kanji.list().filter((x) => NI.kanji.level(x.k) === "known").length : 0;
    return {
      stamps: NI.game.stamps().filter((x) => x.done).length + "/" + NI.course.units.length,
      mistakes: Object.keys(st.mistakes).filter((r) => NI.items.get(r)).length,
      saved: Object.keys(NI.store.books.saved).length,
      stories: Object.keys(st.stories).length,
      kana,
      kanji,
      words: NI.course.words.length,
      profiles: NI.store.profiles.length,
    };
  }
  NI.tileCounts = tileCounts;

  pages.more = {
    title: "More",
    nav: "more",
    render() {
      const n = tileCounts();
      return (
        '<header class="page-head"><h1>More<span class="sub">' + ui.jp("その{他|た}", { tokens: false }) + "</span></h1></header>" +
        '<div class="tg-wrap">' +
        ui.tileGroup("Your progress", [
          ["#stamps", "🏅", "Stamp book", n.stamps, "shu"],
          ["#stats", "📊", "Statistics"],
          ["#mistakes", "📝", "Mistakes notebook", n.mistakes || "", "bad"],
        ]) +
        ui.tileGroup("Read & look up", [
          ["#book", "🔖", "Word book", n.saved || ""],
          ["#stories", "📖", "Stories", n.stories ? n.stories + " read" : ""],
          ["#kana", "あ", "Kana trainer", n.kana, "ok"],
          ["#kanji", "漢", "Kanji", n.kanji ? n.kanji + " known" : "", "ok"],
          ["#grammar", "📐", "Grammar reference"],
          ["#words", "📚", "Word list", n.words],
          ["#phrases", "💬", "Phrasebook"],
        ]) +
        ui.tileGroup("You & this device", [
          ["#profiles", esc(NI.store.profile.icon), "Learning profiles", n.profiles],
          ["#move", "📲", "Move to another device"],
          ["#guide", "🧭", "How this course works"],
          ["#options", "⚙️", "Options"],
        ]) +
        "</div>"
      );
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
