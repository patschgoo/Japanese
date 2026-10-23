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

  // How many review cards ride each train type, local to shinkansen.
  function tierSummary() {
    const srs = NI.store.state.srs;
    const ids = Object.keys(srs);
    if (!ids.length) return "";
    const n = {};
    for (const id of ids) {
      const t = NI.srs.tierOf(srs[id].st);
      if (t) n[t.id] = (n[t.id] || 0) + 1;
    }
    return (
      '<p class="tiers" aria-label="Review cards by stage">' +
      NI.srs.TIERS.map((t) => '<span class="tier tier-' + t.id + '" title="' + esc(t.en) + '">' + esc(t.ja) + ' <b>' + (n[t.id] || 0) + "</b></span>").join("") +
      '<a class="small" href="#guide">What are these?</a></p>'
    );
  }

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

  function planCard() {
    const s = NI.store.settings;
    const chip = (name, v, label, on) => '<button class="chip' + (on ? " on" : "") + '" type="button" data-plan="' + name + '" data-v="' + v + '" aria-pressed="' + !!on + '">' + label + "</button>";
    return (
      '<section class="welcome plan" aria-labelledby="welcome-h">' +
      '<h2 id="welcome-h">' + ui.jp("ようこそ！", { tokens: false }) + " Let’s set up your plan</h2>" +
      "<p>This course is for people who can already read <b>hiragana</b>. Four quick questions, and the course adapts to you. You can change any of it later in Options.</p>" +
      '<div class="plan-q"><b>1. Can you read katakana?</b> <span class="small muted">(the script for words like コーヒー)</span><div class="chips">' +
      chip("kata", "yes", "Yes", !s.kataHelp && NI.store.state.onboarded) + chip("kata", "no", "Not yet", s.kataHelp) + "</div></div>" +
      '<div class="plan-q"><b>2. Why are you learning?</b><div class="chips">' + PLAN.GOALS.map((g) => chip("goal", g.id, g.icon + " " + esc(g.t), s.goal === g.id)).join("") + "</div></div>" +
      '<div class="plan-q"><b>3. How much time do you have most days?</b><div class="chips">' + PLAN.DAILY.map(([xp, t, d]) => chip("daily", xp, esc(t) + " · " + esc(d), Number(s.dailyGoal) === xp)).join("") + "</div></div>" +
      '<div class="plan-q"><b>4. What do you want to get better at first?</b><div class="chips">' + PLAN.FOCI.map(([v, t]) => chip("focus", v, esc(t), s.focus === v)).join("") + "</div></div>" +
      '<p class="plan-tip small" aria-live="polite"></p>' +
      '<div class="row wrap"><button class="btn primary" type="button" data-plan-save>Start learning</button><button class="btn ghost small" type="button" data-plan-skip>Skip for now</button></div>' +
      '<p class="small muted">Rusty on hiragana? <a href="#kana-hira">Take the 2-minute hiragana check</a>. Curious about the method? <a href="#guide">Read how this course works</a>.</p>' +
      "</section>"
    );
  }

  function mountPlan(el) {
    const box = el.querySelector(".plan");
    if (!box) return;
    const tip = box.querySelector(".plan-tip");
    const showTip = () => {
      const g = PLAN.GOALS.find((x) => x.id === NI.store.settings.goal);
      tip.textContent = g ? "Tip for you: " + g.tip : "";
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
      NI.app.render();
    });
    box.querySelector("[data-plan-skip]").addEventListener("click", () => {
      NI.store.setPlanned();
      NI.app.render();
    });
  }

  function wotdCard() {
    const w = NI.game.wordOfTheDay();
    if (!w) return "";
    const ex = NI.items.bestExample(w);
    return (
      '<section class="wotd" aria-labelledby="wotd-h"><h2 id="wotd-h">' + ui.jp("{今日|きょう}の{言葉|ことば}", { tokens: false }) + ' <span class="sub">Word of the day</span></h2>' +
      '<div class="wotd-word">' + (w.em ? '<span class="em-big" aria-hidden="true">' + w.em + "</span>" : "") + '<span class="hand">' + ui.wordHead(w, { tokens: false }) + "</span>" + ui.say(ui.wordAudio(w), w.r) + "</div>" +
      '<p class="wotd-en">' + esc(w.en) + " " + ui.posTag(w) + "</p>" +
      (ex ? '<div class="word-ex">' + ui.jp(ex.jp) + '<span class="s-tools">' + ui.say(ui.sentenceAudio(ex.jp)) + ui.breakdownBtn(ex.jp, ex.en) + '</span><p class="en">' + esc(ex.en) + "</p></div>" : "") +
      '<p class="small"><a href="#unit-' + w.unit + '">From ' + esc(NI.course.code(w.unit)) + "</a></p></section>"
    );
  }

  // Once a goal is set, the home page keeps its tip and shortcuts in view.
  function routeCard() {
    const g = PLAN.GOALS.find((x) => x.id === NI.store.settings.goal);
    if (!g || !NI.store.state.planned) return "";
    return (
      '<section class="route-strip" aria-label="Your route"><span class="rs-icon" aria-hidden="true">' + g.icon + "</span>" +
      "<div><b>Your route: " + esc(g.t) + '</b> <span class="small muted">' + esc(g.tip) + "</span>" +
      '<p class="route-links">' + g.go.map(([h, t]) => '<a href="' + h + '">' + esc(t) + "</a>").join(" · ") + ' · <a href="#guide-routes">Other routes</a></p></div></section>'
    );
  }

  pages.home = {
    title: "Route map",
    nav: "home",
    render() {
      const c = counts();
      const step = nextStep();
      const g = NI.game.goal();
      const L = NI.game.level(NI.store.state.xp);
      const h = new Date().getHours();
      const greet = h >= 4 && h < 11 ? ["おはようございます", "Good morning"] : h >= 11 && h < 18 ? ["こんにちは", "Hello"] : ["こんばんは", "Good evening"];
      const reviewBtn = c.due
        ? '<a class="btn primary" href="#review">Review ' + U.plural(c.due, "card") + "</a>"
        : '<span class="muted small">' + (c.next ? "Next review in " + U.formatInterval(c.next - Date.now()) : "Reviews appear after your first lesson") + "</span>";
      const stepBtn = step
        ? '<a class="btn ' + (c.due ? "ghost" : "primary") + '" href="#learn-' + step.u.n + "-" + step.p.key + '">' + (NI.store.state.parts && Object.keys(NI.store.state.parts).length ? "Continue: " : "Start: ") + esc(NI.course.code(step.u.n)) + " " + esc(step.p.title) + "</a>"
        : '<span class="muted small">Every unit is complete. お疲れ様でした！</span>';
      let html =
        '<section class="today">' +
        '<div class="today-main"><p class="eyebrow">' + ui.jp("{今日|きょう}", { tokens: false }) + " · Today</p>" +
        '<h1 class="greet">' + ui.jp(greet[0], { tokens: false }) + ui.say(greet[0], greet[1]) + '<span class="greet-en">' + greet[1] + "</span></h1>" +
        '<div class="today-actions">' + reviewBtn + stepBtn + '<a class="btn ghost" href="#play">Play</a></div></div>' +
        '<div class="today-goal"><div class="ring-box big">' + NI.session.ring(g.frac, g.done ? "✓" : g.xp + '<small>/' + g.target + "</small>") + "</div>" +
        '<div class="tg-text"><b>' + (g.done ? "Goal reached!" : "Daily goal") + '</b><span class="small muted">' + g.xp + " of " + g.target + " XP today</span>" +
        '<a class="lvl-chip" href="#stamps" title="Level ' + L.n + '"><span class="lvl-badge">Lv ' + L.n + "</span>" + ui.jp(L.title.ja, { tokens: false }) + "</a></div></div>" +
        '<dl class="stats">' +
        '<div><dt>Due now</dt><dd>' + c.due + "</dd></div>" +
        '<div><dt>Words learned</dt><dd>' + c.words + "</dd></div>" +
        '<div><dt>Day streak</dt><dd>' + c.streak + (c.streak ? ' <span aria-hidden="true">🔥</span>' : "") + "</dd></div>" +
        "</dl>" +
        '<div class="today-week">' + NI.weekDots() + "</div>" +
        tierSummary() + "</section>";

      if (!NI.store.state.planned) html += planCard();
      html += '<div class="home-row">' + NI.missionsCard() + wotdCard() + "</div>" + routeCard();

      html += '<section class="routemap" aria-label="Course route map">';
      const stampEm = {};
      for (const st of NI.game.stamps()) stampEm[st.unit.n] = st.em;
      NI.course.lines.forEach((line, li) => {
        const units = line.units.map((n) => NI.course.unit(n)).filter(Boolean);
        const done = units.filter((u) => partsDone(u) === NI.course.parts(u).length).length;
        const pct = NI.store.state.exams[line.id];
        html +=
          '<section class="line line-' + line.color + (pct >= 80 ? " gold" : "") + '" aria-labelledby="line-' + line.id + '">' +
          '<header class="line-head"><span class="line-badge" aria-hidden="true">' + line.id + "</span>" +
          '<div><h2 id="line-' + line.id + '">' + ui.jp(line.ja, { tokens: false }) + ' <span class="line-en">' + esc(line.en) + "</span>" + (pct >= 80 ? ' <span class="gold-badge" title="Line exam passed">★</span>' : "") + "</h2>" +
          '<p class="line-blurb">' + esc(line.blurb) + ' <span class="muted">' + done + "/" + units.length + " stations</span>" +
          (done === units.length && units.length && !(pct >= 80) ? ' · <a href="#exam-' + line.id + '">Take the line exam</a>' : "") + "</p></div></header>" +
          '<ol class="stations">';
        for (const u of units) {
          const parts = NI.course.parts(u);
          const d = partsDone(u);
          const cur = step && step.u.n === u.n;
          const state = d === parts.length ? "done" : cur ? "current" : d > 0 ? "started" : "todo";
          html +=
            '<li class="station ' + state + '"><a href="#unit-' + u.n + '">' +
            '<span class="node" aria-hidden="true"></span>' +
            ui.stationCode(u.n) +
            '<span class="st-text"><span class="st-name">' + ui.jp(u.ja, { tokens: false, gaps: false }) + '</span><span class="st-en">' + esc(u.en) + "</span></span>" +
            (cur ? '<span class="here" title="You are here">' + ui.jp("{現在地|げんざいち}", { tokens: false }) + "</span>" : "") +
            (state === "done" ? '<span class="mini-stamp" title="Stamp collected" aria-label="Stamp collected">' + esc(stampEm[u.n]) + "</span>" : "") +
            '<span class="st-prog" aria-label="' + d + " of " + parts.length + ' parts done">' +
            parts.map((p) => '<i class="' + (NI.store.partDone(u.n, p.key) ? "on" : "") + '"></i>').join("") +
            "</span></a></li>";
        }
        html += "</ol></section>";
        const nextLine = NI.course.lines[li + 1];
        if (nextLine) html += '<div class="transfer" aria-hidden="true"><span>' + ui.jp("{乗|の}り{換|か}え", { tokens: false }) + "</span> Transfer to " + ui.jp(nextLine.ja, { tokens: false }) + "</div>";
      });
      html += "</section>";

      html +=
        '<section class="home-links">' +
        '<a class="card-link" href="#play"><b>🎮 Play</b><span>Time Attack, Kana Rain, Memory Match and Sentence Sprint, plus your mistakes notebook.</span></a>' +
        '<a class="card-link" href="#reader"><b>🔎 Reader & dictionary</b><span>Paste any Japanese to see readings and meanings, word by word.</span></a>' +
        '<a class="card-link" href="#maker"><b>🛠️ Sentence Maker</b><span>Build your own correct sentences: polite or casual, past or negative.</span></a>' +
        '<a class="card-link" href="#stories"><b>📖 Stories</b><span>Short graded stories with audio, written with the words you know.</span></a>' +
        '<a class="card-link" href="#stamps"><b>🏅 Stamp book</b><span>Station stamps, badges, your level and records.</span></a>' +
        '<a class="card-link" href="#guide"><b>🧭 How this course works</b><span>The research behind it, and how to learn in a way that suits you.</span></a>' +
        "</section>";
      return html;
    },
    mount(el) {
      mountPlan(el);
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
      [c.j + "から{来|き}ました。", "I'm from " + c.en + "."],
      [j.j + "です。", "I'm " + (/^[aeiou]/i.test(j.en) ? "an " : "a ") + j.en.replace(/ \(.*\)$/, "") + "."],
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

  function copyText(text) {
    const done = () => ui.toast("Copied.");
    try {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text));
    } catch (e) {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
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
    ui.toast(ok ? "Copied." : "Select the text and copy it manually.");
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
      let html = NI.views.sign(u);
      html += '<div class="unit-intro"><p class="goal"><b>Goal</b> ' + esc(u.goal) + '</p><p class="intro">' + esc(u.intro) + "</p></div>";
      html += NI.views.aids();
      html +=
        '<section class="steps" aria-label="Lesson parts"><ol class="step-list">' +
        parts
          .map((p, i) => {
            const done = NI.store.partDone(u.n, p.key);
            const isNext = next && next.key === p.key;
            const sub = p.words ? U.plural(p.words.length, "word") : p.key === "s" ? "Grammar in sentences" : "Listen, read, answer";
            return (
              '<li class="step ' + (done ? "done" : isNext ? "next" : "todo") + '">' +
              '<span class="step-n" aria-hidden="true">' + (done ? ui.ICON.check : i + 1) + "</span>" +
              '<div class="step-text"><b>' + esc(p.title) + "</b><span>" + esc(sub) + "</span></div>" +
              '<a class="btn small ' + (isNext ? "primary" : "ghost") + '" href="#learn-' + u.n + "-" + p.key + '">' + (done ? "Practise again" : "Start") + "</a></li>"
            );
          })
          .join("") +
        "</ol>" +
        '<p class="small muted">Read the words, grammar and examples below first, or jump straight into a lesson. Finished parts go into your reviews.</p></section>';

      html += '<section class="u-sec" aria-labelledby="w-h"><h2 id="w-h">Words <span class="count">' + u.words.length + "</span></h2>" + NI.views.wordList(u.words) + "</section>";

      if (u.grammar && u.grammar.length) {
        html +=
          '<section class="u-sec" aria-labelledby="g-h"><h2 id="g-h">Grammar</h2>' +
          u.grammar.map((g) => '<article class="gpoint"><h3>' + esc(g.t) + '</h3><div class="gbody">' + ui.rich(g.body) + "</div>" + NI.views.examples(g.ex) + "</article>").join("") +
          "</section>";
      }
      html += '<section class="u-sec" aria-labelledby="s-h"><h2 id="s-h">Example sentences</h2><p class="small muted">Tap any word for its meaning.</p>' + NI.views.sentenceList(u.sentences) + "</section>";
      if (u.dialogue) html += '<section class="u-sec" aria-labelledby="d-h"><h2 id="d-h">Conversation</h2>' + NI.views.dialogue(u) + "</section>";
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
        '<header class="page-head"><h1>Word list <span class="sub">' + ui.jp("{単語帳|たんごちょう}", { tokens: false }) + "</span></h1>" +
        "<p>Every word in the course, in the order you meet it. Search in English, kana or romaji.</p>" +
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
  function radio(name, value, current, label, desc) {
    const id = name + "-" + value;
    return '<label class="radio" for="' + id + '"><input type="radio" id="' + id + '" name="' + name + '" value="' + value + '"' + (String(current) === String(value) ? " checked" : "") + "><span><b>" + label + "</b>" + (desc ? "<small>" + desc + "</small>" : "") + "</span></label>";
  }
  function toggle(key, label, desc) {
    const on = !!NI.store.settings[key];
    return '<label class="toggle" for="t-' + key + '"><input type="checkbox" id="t-' + key + '" data-set="' + key + '"' + (on ? " checked" : "") + "><span><b>" + label + "</b>" + (desc ? "<small>" + desc + "</small>" : "") + "</span></label>";
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
        voices =
          '<label for="voice">Voice</label><select id="voice"><option value="">Automatic</option>' +
          NI.speech.voices.map((v) => '<option value="' + esc(v.voiceURI) + '"' + (s.voice === v.voiceURI ? " selected" : "") + ">" + esc(v.name) + "</option>").join("") +
          "</select>" +
          (NI.speech.hasVoice ? "" : '<p class="note">No Japanese voice found on this device. To add one: <b>Windows</b> Settings → Time &amp; language → Speech → Add voices → Japanese. <b>macOS</b> System Settings → Accessibility → Spoken Content → System voice → Manage voices → Japanese. <b>Android</b> install Google Speech Services and add Japanese. <b>iPhone/iPad</b> Settings → Accessibility → Spoken Content → Voices → Japanese. Then reload this page.</p>');
      }
      return (
        '<header class="page-head"><h1>Options</h1><p>Settings are saved in this browser.' + (NI.store.persistent ? "" : " <b>Your browser is blocking storage, so progress will be lost when you close this page.</b>") + "</p></header>" +
        '<section class="u-sec opt-sec"><h2>Your plan</h2>' +
        "<p>Your goal and focus shape what lessons practise most; the daily goal sets your XP target.</p>" +
        '<fieldset><legend>Why are you learning?</legend><div class="chips">' +
        NI.plan.GOALS.map((g) => '<button class="chip' + (s.goal === g.id ? " on" : "") + '" type="button" data-opt-goal="' + g.id + '" aria-pressed="' + (s.goal === g.id) + '">' + g.icon + " " + esc(g.t) + "</button>").join("") +
        '</div><p class="small muted plan-tip">' + esc((NI.plan.GOALS.find((g) => g.id === s.goal) || {}).tip || "") + "</p></fieldset>" +
        '<fieldset><legend>Daily goal</legend>' + NI.plan.DAILY.map(([xp, t, d]) => radio("dailyGoal", xp, s.dailyGoal, t + " · " + xp + " XP", d)).join("") + "</fieldset>" +
        '<fieldset><legend>Lesson focus</legend>' + NI.plan.FOCI.map(([v, t, d]) => radio("focus", v, s.focus, t, d)).join("") + "</fieldset>" +
        toggle("relaxed", "Relaxed mode", "No clocks or lives in games, and a softer sound for mistakes. Lessons and reviews never time you anyway.") +
        "</section>" +
        '<section class="u-sec opt-sec"><h2>Reading</h2>' +
        '<div class="preview" aria-live="polite">' + ui.jp(sample) + "</div>" +
        '<fieldset><legend>Kanji and furigana</legend>' +
        radio("furigana", "furigana", s.furigana, "Kanji with furigana", "Recommended: the reading sits above every kanji.") +
        radio("furigana", "hover", s.furigana, "Furigana on tap", "Readings appear when you hover over or tap a word.") +
        radio("furigana", "kana", s.furigana, "Kana only", "No kanji at all.") +
        "</fieldset>" +
        toggle("kataHelp", "Katakana help", "Show hiragana above katakana until you can read it.") +
        toggle("gaps", "Space between phrases", "Japanese has no spaces; small gaps make sentences easier to split at first.") +
        toggle("gloss", "Word meanings under Japanese", "A small English gloss under every word. Great for reading longer texts; turn it off to test yourself.") +
        toggle("particles", "Colour-code particles", "は topic, が subject, を object, に/へ direction, で place or means…") +
        '<fieldset><legend>Text size</legend>' + radio("textSize", "s", s.textSize, "Small") + radio("textSize", "m", s.textSize, "Medium") + radio("textSize", "l", s.textSize, "Large") + radio("textSize", "xl", s.textSize, "Extra large") + "</fieldset>" +
        "</section>" +
        '<section class="u-sec opt-sec"><h2>Audio</h2>' +
        toggle("autoplay", "Play audio automatically", "Words and sentences are spoken as they appear.") +
        toggle("sound", "Sound effects", "A chime for right answers, combos and rewards.") +
        '<label for="rate">Speed <output id="rate-out">' + Number(s.rate).toFixed(2) + "×</output></label>" +
        '<input id="rate" type="range" min="0.5" max="1.2" step="0.05" value="' + esc(s.rate) + '">' +
        voices +
        (NI.speech.supported ? '<div class="row"><button class="btn small ghost" type="button" data-test-voice>' + ui.ICON.speaker + "<span>Test the voice</span></button></div>" : "") +
        "</section>" +
        '<section class="u-sec opt-sec"><h2>Appearance</h2><fieldset><legend>Theme</legend>' +
        radio("theme", "system", s.theme, "Match my device") + radio("theme", "light", s.theme, "Light") + radio("theme", "dark", s.theme, "Dark") +
        "</fieldset></section>" +
        '<section class="u-sec opt-sec"><h2>Your progress</h2>' +
        "<p>Progress lives in this browser only. To move it to another device, copy the backup text and paste it there.</p>" +
        '<div class="row wrap"><button class="btn small" type="button" data-export>Copy backup</button>' + (root.NI_EMBED ? "" : '<button class="btn small ghost" type="button" data-download>Download backup</button>') + "</div>" +
        '<label for="import-text">Restore from a backup</label><textarea id="import-text" rows="3" placeholder="Paste backup text here"></textarea>' +
        '<div class="row wrap"><button class="btn small" type="button" data-import>Restore</button><button class="btn small danger" type="button" data-reset>Reset all progress</button></div>' +
        "</section>"
      );
    },
    mount(el) {
      const preview = el.querySelector(".preview");
      const refreshPreview = () => (preview.innerHTML = ui.jp("{私|わたし}は コーヒーを {飲|の}みます。"));
      el.querySelectorAll('input[type="radio"]').forEach((r) =>
        r.addEventListener("change", () => {
          NI.store.set(r.name, r.name === "dailyGoal" ? Number(r.value) : r.value);
          refreshPreview();
        })
      );
      el.querySelectorAll("[data-opt-goal]").forEach((b) =>
        b.addEventListener("click", () => {
          const g = NI.plan.GOALS.find((x) => x.id === b.getAttribute("data-opt-goal"));
          NI.store.set("goal", g.id, true);
          NI.store.set("focus", g.focus);
          NI.store.setPlanned();
          NI.app.render();
          ui.toast("Plan updated: " + g.t + ". " + PLAN.focusLine(g.focus));
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
      el.querySelector("[data-export]").addEventListener("click", () => copyText(NI.store.exportJson()));
      const dl = el.querySelector("[data-download]");
      if (dl) dl.addEventListener("click", () => {
        try {
          const blob = new Blob([NI.store.exportJson()], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "nihongo-ippo-backup-" + NI.util.dayKey() + ".json";
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
          }, 500);
        } catch (e) {
          ui.toast("Download isn't available here. Use Copy backup instead.");
        }
      });
      el.querySelector("[data-import]").addEventListener("click", () => {
        const text = el.querySelector("#import-text").value.trim();
        if (!text) return ui.toast("Paste a backup first.");
        try {
          NI.store.importJson(text);
          ui.toast("Progress restored.");
          NI.app.go("home");
        } catch (e) {
          ui.toast(e.message || "That backup couldn't be read.");
        }
      });
      el.querySelector("[data-reset]").addEventListener("click", () =>
        ui.confirm({ title: "Reset all progress?", body: "Finished lessons and every review card will be deleted. Settings stay as they are.", ok: "Reset progress", danger: true }).then((yes) => {
          if (!yes) return;
          NI.store.reset();
          ui.toast("Progress reset.");
          NI.app.go("home");
        })
      );
    },
  };

  pages.more = {
    title: "More",
    nav: "more",
    render() {
      const link = (href, t, d) => '<a class="card-link" href="' + href + '"><b>' + t + "</b><span>" + d + "</span></a>";
      return (
        '<header class="page-head"><h1>More</h1></header><section class="home-links">' +
        link("#stamps", "🏅 Stamp book", "Station stamps, badges, your level and records.") +
        link("#mistakes", "📝 Mistakes notebook", "Everything you got wrong, ready to practise.") +
        link("#stories", "📖 Stories", "Graded stories with audio.") +
        link("#kana", "あ Kana trainer", "Katakana charts, drills, loanwords and look-alikes.") +
        link("#guide", "🧭 How this course works", "The research behind the course, and routes for different learners.") +
        link("#grammar", "📐 Grammar reference", "Particles, verb and adjective forms, numbers and counters.") +
        link("#words", "📚 Word list", "Every word in the course, searchable.") +
        link("#phrases", "💬 Phrasebook", "Survival phrases by situation.") +
        link("#options", "⚙️ Options", "Your plan, reading aids, audio, theme and backups.") +
        "</section>"
      );
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
