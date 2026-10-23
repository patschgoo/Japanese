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
  pages.home = {
    title: "Route map",
    nav: "home",
    render() {
      const c = counts();
      const step = nextStep();
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
        '<div class="today-actions">' + reviewBtn + stepBtn + "</div></div>" +
        '<dl class="stats">' +
        '<div><dt>Due now</dt><dd>' + c.due + "</dd></div>" +
        '<div><dt>Words learned</dt><dd>' + c.words + "</dd></div>" +
        '<div><dt>Day streak</dt><dd>' + c.streak + "</dd></div>" +
        "</dl></section>";

      if (!NI.store.state.onboarded) {
        html +=
          '<section class="welcome" aria-labelledby="welcome-h">' +
          '<h2 id="welcome-h">' + ui.jp("ようこそ！", { tokens: false }) + " Welcome</h2>" +
          "<p>This course is for people who can already read <b>hiragana</b>. It takes you from greetings to real conversations in 20 short units, with spaced reviews so the words stick.</p>" +
          "<p><b>Can you read katakana</b> (the script for words like コーヒー)? If not, the course shows hiragana above it until you've learned it.</p>" +
          '<div class="row wrap"><button class="btn primary" type="button" data-onboard="yes">Yes, I can read katakana</button><button class="btn ghost" type="button" data-onboard="no">Not yet</button></div>' +
          '<p class="small muted">Rusty on hiragana? <a href="#kana-hira">Take the 2-minute hiragana check</a>. Curious about the method? <a href="#guide">Read how this course works</a>.</p>' +
          "</section>";
      }

      html += '<section class="routemap" aria-label="Course route map">';
      NI.course.lines.forEach((line, li) => {
        const units = line.units.map((n) => NI.course.unit(n)).filter(Boolean);
        const done = units.filter((u) => partsDone(u) === NI.course.parts(u).length).length;
        html +=
          '<section class="line line-' + line.color + '" aria-labelledby="line-' + line.id + '">' +
          '<header class="line-head"><span class="line-badge" aria-hidden="true">' + line.id + "</span>" +
          '<div><h2 id="line-' + line.id + '">' + ui.jp(line.ja, { tokens: false }) + ' <span class="line-en">' + esc(line.en) + "</span></h2>" +
          '<p class="line-blurb">' + esc(line.blurb) + ' <span class="muted">' + done + "/" + units.length + " stations</span></p></div></header>" +
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
        '<a class="card-link" href="#guide"><b>How this course works</b><span>The method behind it: what to learn first, and how to make it stick.</span></a>' +
        '<a class="card-link" href="#kana"><b>Kana trainer</b><span>Katakana charts, drills, loanwords and look-alike characters.</span></a>' +
        '<a class="card-link" href="#phrases"><b>Phrasebook</b><span>90 survival phrases for restaurants, shops, trains and emergencies.</span></a>' +
        "</section>";
      return html;
    },
    mount(el) {
      el.querySelectorAll("[data-onboard]").forEach((b) =>
        b.addEventListener("click", () => {
          const can = b.getAttribute("data-onboard") === "yes";
          NI.store.set("kataHelp", !can);
          NI.store.setOnboarded();
          ui.toast(can ? "Katakana help is off. You can change it in Options." : "Hiragana will appear above katakana. Try the Kana trainer when you're ready.");
          NI.app.render();
        })
      );
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
    nav: "phrases",
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
    nav: "more",
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
    nav: "grammar",
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
        '<section class="u-sec opt-sec"><h2>Reading</h2>' +
        '<div class="preview" aria-live="polite">' + ui.jp(sample) + "</div>" +
        '<fieldset><legend>Kanji and furigana</legend>' +
        radio("furigana", "furigana", s.furigana, "Kanji with furigana", "Recommended: the reading sits above every kanji.") +
        radio("furigana", "hover", s.furigana, "Furigana on tap", "Readings appear when you hover over or tap a word.") +
        radio("furigana", "kana", s.furigana, "Kana only", "No kanji at all.") +
        "</fieldset>" +
        toggle("kataHelp", "Katakana help", "Show hiragana above katakana until you can read it.") +
        toggle("gaps", "Space between phrases", "Japanese has no spaces; small gaps make sentences easier to split at first.") +
        "</section>" +
        '<section class="u-sec opt-sec"><h2>Audio</h2>' +
        toggle("autoplay", "Play audio automatically", "Words and sentences are spoken as they appear.") +
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
          NI.store.set(r.name, r.value);
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
        link("#guide", "How this course works", "What to learn first, and why spaced practice works.") +
        link("#grammar", "Grammar reference", "Particles, verb and adjective forms, numbers and counters.") +
        link("#words", "Word list", "Every word in the course, searchable.") +
        link("#phrases", "Phrasebook", "Survival phrases by situation.") +
        link("#options", "Options", "Furigana, katakana help, audio, theme and backups.") +
        "</section>"
      );
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
