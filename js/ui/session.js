/* Lesson, practice and review sessions. They take over the main area, show one
   card at a time, and answer to the keyboard: 1–4 pick an option, Enter
   continues, Space reveals a review card, H asks for a hint.
   The game layer lives here too: XP per answer, combos, hints that cost half
   the XP, the mistakes notebook, and a reward screen at the end. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const pages = (NI.pages = NI.pages || {});
  let keyHandler = null;

  function setKeys(fn) {
    if (keyHandler) document.removeEventListener("keydown", keyHandler);
    keyHandler = fn;
    if (fn) document.addEventListener("keydown", fn);
  }

  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

  // はなまる: the spiral flower Japanese teachers draw on excellent work.
  function hanamaru() {
    const cx = 60;
    const cy = 60;
    const pts = [];
    for (let t = 0; t <= Math.PI * 6.2; t += 0.12) {
      const r = 3 + t * 1.45;
      pts.push((cx + r * Math.cos(t)).toFixed(1) + " " + (cy + r * Math.sin(t)).toFixed(1));
    }
    const petals = [];
    for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.04) {
      const r = 38 + 9 * Math.abs(Math.sin(t * 3.5));
      petals.push((cx + r * Math.cos(t)).toFixed(1) + " " + (cy + r * Math.sin(t)).toFixed(1));
    }
    return (
      '<svg class="hanamaru" viewBox="0 0 120 120" role="img" aria-label="Hanamaru: a flower circle for excellent work">' +
      '<path class="hm-spiral" d="M' + pts.join(" L") + '" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="hm-petals" d="M' + petals.join(" L") + 'Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    );
  }

  function shell(title, sub) {
    return (
      '<div class="sess-top">' +
      '<button class="icon-btn" type="button" data-quit aria-label="Leave">' + ui.ICON.close + "</button>" +
      '<div class="sess-title"><b>' + title + "</b>" + (sub ? "<span>" + sub + "</span>" : "") + "</div>" +
      '<span class="sess-combo" hidden></span>' +
      '<span class="sess-xp" title="XP this session">0 XP</span>' +
      '<span class="sess-count" aria-live="polite"></span></div>' +
      '<div class="sess-bar"></div>' +
      '<div class="sess-card"></div>' +
      '<div class="sess-foot" hidden></div>'
    );
  }

  function feedback(ok, solutionHtml, extra) {
    if (ok === null) return '<div class="fb neutral"><span></span><button class="btn primary" type="button" data-next>Continue</button></div>';
    if (ok) return '<div class="fb ok"><span class="stamp" aria-hidden="true">○</span><div class="fb-text"><b>' + ui.jp("{正解|せいかい}！", { tokens: false }) + " Correct</b>" + (extra || "") + "</div>" + '<button class="btn primary" type="button" data-next>Continue</button></div>';
    return '<div class="fb bad"><span class="stamp" aria-hidden="true">×</span><div class="fb-text"><b>Not quite.</b>' + (solutionHtml ? '<div class="sol">' + solutionHtml + "</div>" : "") + "</div>" + '<button class="btn primary" type="button" data-next>Continue</button></div>';
  }

  // ---------------------------------------------------------------------------
  // Hints: an exercise's own hint(), or a generic one for options and typing.

  function hintKind(ex, inner) {
    if (ex.noHint) return null;
    if (typeof ex.hint === "function") return "own";
    const box = inner.querySelector(".opts[data-ci]");
    if (box && box.querySelectorAll(".opt").length > 2) return "options";
    if (inner.querySelector(".kana-input[data-ans]")) return "input";
    return null;
  }

  function applyHint(ex, inner, kind) {
    if (kind === "own") return ex.hint(inner);
    if (kind === "options") {
      const box = inner.querySelector(".opts[data-ci]");
      const ci = Number(box.getAttribute("data-ci"));
      const wrong = Array.from(box.querySelectorAll(".opt")).filter((b) => Number(b.dataset.i) !== ci && !b.disabled);
      U.shuffle(wrong).slice(0, Math.max(1, wrong.length - 1)).forEach((b) => {
        b.disabled = true;
        b.classList.add("struck");
      });
      return;
    }
    const input = inner.querySelector(".kana-input[data-ans]");
    const ans = input.getAttribute("data-ans");
    const show = ans.slice(0, Math.max(1, Math.ceil(ans.length / 3)));
    let tip = inner.querySelector(".hint-text");
    if (!tip) {
      tip = document.createElement("p");
      tip.className = "hint-text";
      input.closest(".answer-row").after(tip);
    }
    tip.innerHTML = 'It starts with <b lang="ja">' + esc(show) + "</b>…";
    input.focus();
  }

  // ---------------------------------------------------------------------------
  // Reward screen pieces

  function ring(frac, inner) {
    const r = 26;
    const c = 2 * Math.PI * r;
    const f = U.clamp(frac, 0, 1);
    return (
      '<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="' + r + '" class="ring-bg"/>' +
      '<circle cx="32" cy="32" r="' + r + '" class="ring-fg" stroke-dasharray="' + (c * f).toFixed(1) + " " + c.toFixed(1) + '"/></svg>' +
      (inner ? '<span class="ring-in">' + inner + "</span>" : "")
    );
  }

  // up: the learner has just reached this level.
  function levelLine(up) {
    const L = NI.game.level(NI.store.state.xp);
    return (
      '<div class="lvl-row' + (up ? " up" : "") + '"><span class="lvl-badge">Lv ' + L.n + "</span>" +
      '<div class="lvl-text">' + (up ? '<span class="lvl-up">Level up!</span>' : "") + "<b>" + ui.jp(L.title.ja, { tokens: false }) + " · " + esc(L.title.en) + "</b>" + ui.progressBar(L.frac, "Progress to the next level") +
      '<span class="small muted">' + (L.need - L.into) + " XP to level " + (L.n + 1) + "</span></div></div>"
    );
  }

  // now: the goal was reached by what just happened.
  function goalLine(now) {
    const g = NI.game.goal();
    return (
      '<div class="goal-row' + (now ? " now" : "") + '"><div class="ring-box">' + ring(g.frac, g.done ? "✓" : Math.round(g.frac * 100) + "%") + "</div>" +
      "<div><b>" + (now ? "Daily goal reached! 🎉" : g.done ? "Daily goal reached" : "Daily goal") + "</b><span>" + g.xp + " / " + g.target + " XP today · " + U.plural(NI.store.streak(), "day") + " streak</span></div></div>"
    );
  }

  /* The XP summary on finish screens. res is what NI.fx.gain() returned and
     lines are [label, xp] pairs; the missions bonus, new badges, a level-up
     and the daily goal are listed here instead of popping up as banners. */
  function xpBlock(res, lines) {
    const all = lines.concat(res.bonus ? [["Daily missions", res.bonus]] : []);
    const badges = res.badges || [];
    return (
      '<div class="xp-sum"><p class="xp-big">+' + res.xp + " XP</p>" +
      (all.length ? '<ul class="xp-lines">' + all.map(([t, n]) => "<li><span>" + esc(t) + "</span><b>+" + n + "</b></li>").join("") + "</ul>" : "") +
      levelLine(!!res.level) +
      (badges.length
        ? '<div class="new-badges"><p><b>New badge' + (badges.length > 1 ? "s" : "") + '</b> · <a href="#stamps">Stamp book</a></p><ul>' +
          badges.map((b) => '<li><span class="nb-icon" aria-hidden="true">' + b.icon + "</span><span><b>" + esc(b.t) + "</b>" + esc(b.d) + "</span></li>").join("") + "</ul></div>"
        : "") +
      goalLine(res.goal) + "</div>"
    );
  }

  // ---------------------------------------------------------------------------
  /* Runs exercises one card at a time.
     o: { title, sub, exercises, quitTo, quitBody, practice, exam, onFinish(sum) }
     onFinish gets { right, graded, misses, bestCombo, xp, hints } and returns
     the finish screen's HTML. */
  function runExercises(box, o) {
    const queue = o.exercises.slice();
    let i = 0;
    let right = 0;
    let graded = 0;
    let misses = 0;
    let combo = 0;
    let bestCombo = 0;
    let xp = 0;
    let hints = 0;
    const retried = new Set();
    box.innerHTML = shell(o.title, o.sub);
    const card = box.querySelector(".sess-card");
    const foot = box.querySelector(".sess-foot");
    const bar = box.querySelector(".sess-bar");
    const count = box.querySelector(".sess-count");
    const xpEl = box.querySelector(".sess-xp");
    const comboEl = box.querySelector(".sess-combo");
    const X = NI.game.XP;

    box.querySelector("[data-quit]").addEventListener("click", () => {
      if (!graded) return NI.app.go(o.quitTo);
      ui.confirm({ title: "Leave now?", body: o.quitBody || "Your answers so far won't be saved.", ok: "Leave", cancel: "Keep going" }).then((yes) => yes && NI.app.go(o.quitTo));
    });

    function show() {
      if (i >= queue.length) return finish();
      const ex = queue[i];
      bar.innerHTML = ui.progressBar(i / queue.length, "Progress");
      count.textContent = i + 1 + " / " + queue.length;
      card.innerHTML = '<div class="ex ex-' + ex.type + '">' + ex.html() + "</div>";
      foot.hidden = true;
      foot.innerHTML = "";
      const inner = card.firstElementChild;
      ex.mount(inner, { done: (ok) => answered(ex, ok) });
      const kind = o.exam ? null : hintKind(ex, inner);
      if (kind) {
        const row = document.createElement("div");
        row.className = "hint-row";
        row.innerHTML = '<button class="btn small ghost" type="button" data-hint title="Hint (H)"><span aria-hidden="true">💡</span> Hint <small>half XP</small></button>';
        card.appendChild(row);
        row.querySelector("[data-hint]").addEventListener("click", (e) => {
          if (inner.dataset.answered || ex.hinted) return;
          ex.hinted = true;
          hints++;
          e.currentTarget.disabled = true;
          applyHint(ex, inner, kind);
        });
      }
      if (NI.store.settings.autoplay && ex.autoplay) {
        const t = ex.autoplay();
        if (t) setTimeout(() => NI.speech.speak(t), 120);
      }
      const first = inner.querySelector("input, .opt, .tile, .m-cell");
      if (first && first.tagName !== "INPUT") first.focus({ preventScroll: true });
      card.scrollIntoView({ block: "nearest" });
    }

    function burst(text) {
      const b = document.createElement("div");
      b.className = "combo-burst";
      b.textContent = text;
      card.appendChild(b);
      setTimeout(() => b.remove(), 1100);
    }

    function answered(ex, ok) {
      const hintRow = card.querySelector(".hint-row");
      if (hintRow) hintRow.remove();
      let gained = 0;
      if (ok === true) {
        right++;
        graded++;
        combo++;
        bestCombo = Math.max(bestCombo, combo);
        gained = ex.hinted ? X.hinted : X.correct;
        if (combo >= 5) gained += X.combo;
        xp += gained;
        if (o.practice && ex.ref) {
          NI.store.log("mp", 1);
          NI.store.fixMistake(ex.ref);
        }
        if (combo >= 5 && combo % 5 === 0) {
          NI.fx.play("combo");
          burst(combo + " in a row!");
        } else NI.fx.play("right");
      } else if (ok === false) {
        graded++;
        misses++;
        combo = 0;
        NI.fx.play("wrong");
        if (ex.ref) NI.store.addMistake(ex.ref);
        if (o.practice && ex.ref) NI.store.log("mp", 1);
        // A missed item comes back once at the end; a retry is never retried.
        const key = ex.type + ":" + (ex.item || i);
        if (ex.retry && !ex.isRetry && !retried.has(key)) {
          retried.add(key);
          const again = ex.retry();
          again.isRetry = true;
          queue.push(again);
        }
      }
      xpEl.textContent = xp + " XP";
      if (gained) {
        xpEl.classList.remove("pulse");
        void xpEl.offsetWidth;
        xpEl.classList.add("pulse");
      }
      comboEl.hidden = combo < 3;
      comboEl.innerHTML = '<span aria-hidden="true">🔥</span> ' + combo;
      comboEl.setAttribute("aria-label", combo + " in a row");
      const extra = gained ? ' <span class="fb-xp">+' + gained + " XP" + (ex.hinted ? " (hint)" : "") + "</span>" : "";
      foot.innerHTML = feedback(ok, ok === false && ex.solution ? ex.solution() : "", extra);
      foot.hidden = false;
      const b = foot.querySelector("[data-next]");
      b.addEventListener("click", next);
      setTimeout(() => b.focus({ preventScroll: true }), 0);
      foot.scrollIntoView({ block: "nearest" });
    }

    function next() {
      i++;
      show();
    }

    function finish() {
      setKeys(null);
      NI.store.logMax("cmb", bestCombo);
      box.innerHTML = o.onFinish({ right, graded, misses, bestCombo, xp, hints });
      if (o.mount) o.mount(box);
    }

    setKeys((e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (!foot.hidden && e.key === "Enter" && !typing(e)) {
        e.preventDefault();
        next();
        return;
      }
      if (typing(e)) return;
      if ((e.key === "h" || e.key === "H") && foot.hidden) {
        const h = card.querySelector("[data-hint]:not([disabled])");
        if (h) {
          e.preventDefault();
          h.click();
        }
        return;
      }
      if (/^[1-9]$/.test(e.key) && foot.hidden) {
        const opt = card.querySelectorAll(".opt")[Number(e.key) - 1];
        if (opt && !opt.disabled) {
          e.preventDefault();
          opt.click();
        }
      }
    });
    show();
  }

  // ---------------------------------------------------------------------------
  // Lessons

  function runLesson(box, u, partKey) {
    const L = NI.exercises.lesson(u, partKey);
    if (!L) {
      box.innerHTML = '<p class="empty">This lesson part doesn\'t exist. <a href="#unit-' + u.n + '">Back to the unit</a></p>';
      return;
    }
    const wasStamped = NI.game.stamps().find((s) => s.unit.n === u.n).done;
    runExercises(box, {
      title: esc(NI.course.code(u.n)) + " · " + esc(L.part.title),
      sub: esc(u.en),
      exercises: L.exercises,
      quitTo: "unit-" + u.n,
      quitBody: "Your answers in this lesson won't be saved.",
      onFinish(sum) {
        NI.store.markPart(u.n, partKey);
        const added = NI.store.addItems(L.srs);
        NI.store.log("x", sum.graded);
        NI.store.log("p", 1);
        const X = NI.game.XP;
        const perfect = sum.graded >= 3 && sum.misses === 0;
        const lines = [["Answers", sum.xp], ["Lesson complete", X.lesson]];
        if (perfect) {
          lines.push(["No mistakes", X.perfect]);
          NI.store.log("pf", 1);
        }
        const events = [];
        if (perfect) events.push(...NI.game.event("perfect"));
        const hour = new Date().getHours();
        if (hour < 7 && hour >= 4) events.push(...NI.game.event("early"));
        if (hour >= 22) events.push(...NI.game.event("night"));
        const total = lines.reduce((a, l) => a + l[1], 0);
        const res = NI.fx.gain(total, { badges: events, inline: true });
        NI.fx.play("chime");
        if (perfect || res.level) NI.fx.confetti(box);
        const nowStamped = NI.game.stamps().find((s) => s.unit.n === u.n).done;
        const parts = NI.course.parts(u);
        const nextPart = parts.find((p) => !NI.store.partDone(u.n, p.key));
        const nu = NI.course.unit(u.n + 1);
        const nextBtn = nextPart
          ? '<a class="btn primary" href="#learn-' + u.n + "-" + nextPart.key + '">Next: ' + esc(nextPart.title) + "</a>"
          : nu
            ? '<a class="btn primary" href="#unit-' + nu.n + '">Next station: ' + esc(NI.course.code(nu.n)) + "</a>"
            : '<a class="btn primary" href="#home">Back to the route map</a>';
        const pct = sum.graded ? Math.round((sum.right / sum.graded) * 100) : 100;
        const line = NI.course.lineOf(u.n);
        const lineDone = line && line.units.every((n) => NI.game.stamps().find((s) => s.unit.n === n && s.done));
        return (
          '<div class="finish">' + hanamaru() +
          "<h2>" + ui.jp(pct >= 80 ? "よくできました！" : "がんばりました！", { tokens: false }) + "</h2>" +
          '<p class="finish-en">' + (pct >= 80 ? "Well done!" : "Good effort!") + " " + (sum.graded ? "You got " + sum.right + " of " + sum.graded + " right" + (sum.bestCombo >= 3 ? ", with " + sum.bestCombo + " in a row" : "") + "." : "") + "</p>" +
          xpBlock(res, lines) +
          (!wasStamped && nowStamped && NI.stampSvg
            ? '<div class="stamp-earned"><div class="stamp-wrap">' + NI.stampSvg(u, { fresh: true }) + "</div><p><b>Station stamp collected!</b> " + esc(NI.course.code(u.n)) + " " + esc(u.en) + ' · <a href="#stamps">Stamp book</a></p></div>'
            : "") +
          (added ? '<p class="small">' + U.plural(added, L.srs[0] && L.srs[0].startsWith("s:") ? "sentence" : "word") + " added to your reviews. The first review comes up in about 4 hours.</p>" : "") +
          (!nextPart ? '<p class="station-done">' + esc(NI.course.code(u.n)) + " complete. " + (nu ? "On to the next station." : "That's the end of the line: every unit done!") + "</p>" : "") +
          (lineDone && !wasStamped && nowStamped ? '<p class="station-done">Every stamp on ' + ui.jp(line.ja, { tokens: false }) + ' collected. Take the <a href="#exam-' + line.id + '">line exam</a> for a gold badge.</p>' : "") +
          '<div class="row center wrap">' + nextBtn + '<a class="btn ghost" href="#unit-' + u.n + '">Back to the unit</a></div></div>'
        );
      },
    });
  }

  pages.learn = {
    session: true,
    nav: "home",
    title(args) {
      const u = NI.course.unit(args[0]);
      return u ? NI.course.code(u.n) + " lesson" : "Lesson";
    },
    render(args) {
      return NI.course.unit(args[0]) ? '<div class="session" id="sess"></div>' : '<p class="empty">Unit not found. <a href="#home">Back to the route map</a></p>';
    },
    mount(el, args) {
      const u = NI.course.unit(args[0]);
      if (u) runLesson(el.querySelector("#sess"), u, args[1] || "w1");
    },
    unmount() {
      setKeys(null);
      NI.speech.stop();
    },
  };

  // ---------------------------------------------------------------------------
  // Mistakes practice and line exams

  pages.practice = {
    session: true,
    nav: "play",
    title: "Practise your mistakes",
    render() {
      return '<div class="session" id="sess"></div>';
    },
    mount(el) {
      const box = el.querySelector("#sess");
      const refs = Object.keys(NI.store.state.mistakes)
        .filter((r) => NI.items.get(r))
        .sort((a, b) => NI.store.state.mistakes[b].n - NI.store.state.mistakes[a].n)
        .slice(0, 12);
      if (!refs.length) {
        box.innerHTML = '<div class="finish"><h2>' + ui.jp("{間違|まちが}いなし！", { tokens: false }) + '</h2><p>Your mistakes notebook is empty. Anything you get wrong in lessons lands here so you can practise it again.</p><div class="row center"><a class="btn primary" href="#play">Back to Play</a></div></div>';
        return;
      }
      runExercises(box, {
        title: "Mistakes notebook",
        sub: "Get each one right twice to clear it",
        exercises: NI.exercises.practice(refs),
        practice: true,
        quitTo: "mistakes",
        quitBody: "Items you've already cleared stay cleared.",
        onFinish(sum) {
          const res = NI.fx.gain(sum.xp, { inline: true });
          const left = Object.keys(NI.store.state.mistakes).length;
          return (
            '<div class="finish">' + hanamaru() + "<h2>" + ui.jp("{復習|ふくしゅう}できました！", { tokens: false }) + "</h2>" +
            '<p class="finish-en">You got ' + sum.right + " of " + sum.graded + " right. " + (left ? U.plural(left, "item") + " left in the notebook." : "The notebook is empty!") + "</p>" +
            xpBlock(res, [["Answers", sum.xp]]) +
            '<div class="row center wrap">' + (left ? '<a class="btn primary" href="#practice">Practise again</a>' : "") + '<a class="btn ' + (left ? "ghost" : "primary") + '" href="#mistakes">Back to the notebook</a></div></div>'
          );
        },
      });
    },
    unmount() {
      setKeys(null);
      NI.speech.stop();
    },
  };

  pages.exam = {
    session: true,
    nav: "play",
    title(args) {
      const line = NI.course.lines.find((l) => l.id === args[0]);
      return line ? line.en + " exam" : "Line exam";
    },
    render(args) {
      return NI.course.lines.find((l) => l.id === args[0]) ? '<div class="session" id="sess"></div>' : '<p class="empty">That line doesn\'t exist. <a href="#play">Back to Play</a></p>';
    },
    mount(el, args) {
      const line = NI.course.lines.find((l) => l.id === args[0]);
      if (!line) return;
      const box = el.querySelector("#sess");
      const start = () =>
        runExercises(box, {
          title: esc(line.en) + " exam",
          sub: "20 questions · pass with 80%",
          exercises: NI.exercises.exam(line),
          exam: true,
          quitTo: "play",
          quitBody: "The exam won't be scored.",
          onFinish(sum) {
            const pct = sum.graded ? Math.round((sum.right / sum.graded) * 100) : 0;
            const pass = pct >= 80;
            const first = pass && !(NI.store.state.exams[line.id] >= 80);
            NI.store.setExam(line.id, pct);
            const lines = [["Answers", sum.xp]];
            if (first) lines.push(["Exam passed", NI.game.XP.exam]);
            const res = NI.fx.gain(lines.reduce((a, l) => a + l[1], 0), { inline: true });
            if (pass) {
              NI.fx.play("level");
              NI.fx.confetti(box);
            }
            return (
              '<div class="finish">' + (pass ? hanamaru() : "") +
              "<h2>" + ui.jp(pass ? "{合格|ごうかく}！" : "もう{一度|いちど}！", { tokens: false }) + "</h2>" +
              '<p class="finish-en">' + (pass ? "Passed" : "Not this time") + ": " + sum.right + " of " + sum.graded + " (" + pct + "%)." + (pass ? " " + esc(line.en) + " has its gold badge." : " You need 80%. Review the line's units and try again.") + "</p>" +
              xpBlock(res, lines) +
              '<div class="row center wrap"><button class="btn primary" type="button" data-again>Take it again</button><a class="btn ghost" href="#play">Back to Play</a></div></div>'
            );
          },
          mount(b) {
            const again = b.querySelector("[data-again]");
            if (again) again.addEventListener("click", start);
          },
        });
      start();
    },
    unmount() {
      setKeys(null);
      NI.speech.stop();
    },
  };

  // ---------------------------------------------------------------------------
  // Reviews

  function modeFor(id, st) {
    const h = (U.hash(id) + (st ? st.n : 0)) % 3;
    const voice = NI.speech.supported && NI.speech.hasVoice;
    if (id.startsWith("v:")) {
      if (!st || st.st <= 2) return "recog";
      if (voice && h === 2) return "listen";
      return h === 0 ? "recog" : "produce";
    }
    if (st && st.st >= 3 && voice && h === 2) return "listen";
    return "recog";
  }

  function front(it, mode) {
    if (it.kind === "word") {
      if (mode === "produce") {
        return (
          '<p class="kicker">Say or type it in Japanese</p><p class="prompt-en">' + (it.em ? '<span class="em" aria-hidden="true">' + it.em + "</span> " : "") + esc(it.en) + '</p><p class="word-meta center">' + ui.posTag(it) + "</p>" +
          '<div class="answer-row"><label class="sr" for="rv-in">Your answer (optional)</label><input id="rv-in" class="kana-input" type="text" placeholder="optional: type in romaji or kana" lang="ja"></div>'
        );
      }
      if (mode === "listen") return '<p class="kicker">What does it mean?</p><div class="prompt-audio"><button class="big-play" type="button" data-say="' + esc(ui.wordAudio(it)) + '" aria-label="Play the word">' + ui.ICON.speaker + "</button></div>";
      return '<p class="kicker">What does it mean?</p><div class="prompt-word hand">' + ui.jp(it.head, { tokens: false }) + ui.say(ui.wordAudio(it), it.r) + "</div>";
    }
    if (mode === "listen") return '<p class="kicker">What does it mean?</p><div class="prompt-audio"><button class="big-play" type="button" data-say="' + esc(ui.sentenceAudio(it.jp)) + '" aria-label="Play the sentence">' + ui.ICON.speaker + "</button></div>";
    return '<p class="kicker">What does it mean?</p><div class="prompt-sentence">' + ui.jp(it.jp) + ui.say(ui.sentenceAudio(it.jp)) + "</div>";
  }

  function back(it) {
    if (it.kind === "word") {
      const ex = NI.items.bestExample(it);
      return (
        '<div class="rv-back">' + (it.em ? '<div class="em-big" aria-hidden="true">' + it.em + "</div>" : "") + '<div class="word-big hand">' + ui.wordHead(it, { tokens: false }) + "</div>" + ui.say(ui.wordAudio(it), it.r) +
        '<p class="word-en">' + esc(it.en) + "</p>" + (it.note ? '<p class="word-note">' + esc(it.note) + "</p>" : "") +
        (ex ? '<div class="word-ex">' + ui.jp(ex.jp) + ui.say(ui.sentenceAudio(ex.jp)) + ui.breakdownBtn(ex.jp, ex.en) + '<p class="en">' + esc(ex.en) + "</p></div>" : "") + "</div>"
      );
    }
    return '<div class="rv-back"><div class="prompt-sentence">' + ui.jp(it.jp) + ui.say(ui.sentenceAudio(it.jp)) + ui.breakdownBtn(it.jp, it.en) + '</div><p class="word-en">' + esc(it.en) + "</p>" + (it.note ? '<p class="word-note">' + esc(it.note) + "</p>" : "") + "</div>";
  }

  function audioFor(it, mode) {
    if (it.kind === "word") return mode === "produce" ? null : ui.wordAudio(it);
    return ui.sentenceAudio(it.jp);
  }

  let pendingReviewXp = 0;
  let reviewBest = 0;
  // XP from reviews is kept even if the learner stops half-way.
  function settleReviewXp(quiet) {
    NI.store.logMax("cmb", reviewBest);
    reviewBest = 0;
    const xp = pendingReviewXp;
    pendingReviewXp = 0;
    return NI.fx.gain(xp, { quiet });
  }

  function runReview(box, extra) {
    const now = Date.now();
    const srs = NI.store.state.srs;
    let ids;
    if (extra) {
      ids = U.shuffle(Object.keys(srs).filter((id) => NI.items.get(id)))
        .sort((a, b) => srs[a].st - srs[b].st)
        .slice(0, 15);
    } else {
      ids = NI.srs.dueIds(srs, now).filter((id) => NI.items.get(id));
    }
    if (!ids.length) {
      const next = NI.srs.nextDue(srs, now);
      const any = Object.keys(srs).length > 0;
      const step = NI.nextStep();
      box.innerHTML =
        '<div class="finish empty-review"><h2>' + ui.jp("{今日|きょう}は おしまい", { tokens: false }) + "</h2>" +
        "<p>" + (any ? "Nothing to review right now." + (next ? " The next card is due in " + U.formatInterval(next - now) + "." : "") : "Reviews start once you finish your first lesson part.") + "</p>" +
        '<div class="row center wrap">' +
        (step ? '<a class="btn primary" href="#learn-' + step.u.n + "-" + step.p.key + '">Learn: ' + esc(NI.course.code(step.u.n)) + " " + esc(step.p.title) + "</a>" : "") +
        (any ? '<button class="btn ghost" type="button" data-extra>Practise anyway</button>' : "") +
        '<a class="btn ghost" href="#play">Play a game</a>' +
        "</div>" + (any ? '<p class="small muted">Extra practice doesn’t change your review schedule.</p>' : "") + "</div>";
      const ex = box.querySelector("[data-extra]");
      if (ex) ex.addEventListener("click", () => runReview(box, true));
      return;
    }
    const LIMIT = 50;
    const queue = ids.slice(0, LIMIT).map((id) => ({ id, first: !extra }));
    const remaining = ids.length - queue.length;
    let i = 0;
    let good = 0;
    let firsts = 0;
    let combo = 0;
    let sessionXp = 0;
    box.innerHTML = shell(extra ? "Extra practice" : "Review", extra ? "Schedule unchanged" : U.plural(queue.length, "card") + " due");
    const card = box.querySelector(".sess-card");
    const foot = box.querySelector(".sess-foot");
    const bar = box.querySelector(".sess-bar");
    const count = box.querySelector(".sess-count");
    const xpEl = box.querySelector(".sess-xp");
    const comboEl = box.querySelector(".sess-combo");
    let revealed = false;
    let mode = "recog";
    let typedOk = null;

    box.querySelector("[data-quit]").addEventListener("click", () => {
      if (!firsts) return NI.app.go("home");
      ui.confirm({ title: "Stop reviewing?", body: "The cards you've answered (and their XP) are saved.", ok: "Stop", cancel: "Keep going" }).then((yes) => yes && NI.app.go("home"));
    });

    function show() {
      if (i >= queue.length) return finish();
      const q = queue[i];
      const it = NI.items.get(q.id);
      const st = NI.store.item(q.id);
      mode = modeFor(q.id, st);
      revealed = false;
      typedOk = null;
      bar.innerHTML = ui.progressBar(i / queue.length, "Review progress");
      count.textContent = i + 1 + " / " + queue.length;
      card.innerHTML = '<div class="ex rv rv-' + mode + '">' + front(it, mode) + '<div class="rv-reveal"></div></div>';
      foot.hidden = false;
      foot.innerHTML = '<div class="fb neutral"><span></span><button class="btn primary" type="button" data-reveal>Show answer</button></div>';
      foot.querySelector("[data-reveal]").addEventListener("click", reveal);
      const input = card.querySelector(".kana-input");
      if (input) {
        const ime = NI.kana.bindIme(input);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            ime.finalize();
            reveal();
          }
        });
        input._ime = ime;
        setTimeout(() => input.focus(), 30);
      }
      const a = audioFor(it, mode);
      if (a && NI.store.settings.autoplay) setTimeout(() => NI.speech.speak(a), 120);
    }

    function reveal() {
      if (revealed) return;
      revealed = true;
      const q = queue[i];
      const it = NI.items.get(q.id);
      const input = card.querySelector(".kana-input");
      if (input) {
        const val = input._ime.finalize().trim();
        input.disabled = true;
        if (val) {
          const f = NI.kana.fold(val);
          typedOk = NI.exercises.acceptedForWord(it).some((x) => NI.kana.fold(x) === f);
          input.classList.add(typedOk ? "right" : "wrong");
        }
      }
      card.querySelector(".rv-reveal").innerHTML = back(it);
      if (mode !== "recog" && NI.store.settings.autoplay) NI.speech.speak(it.kind === "word" ? ui.wordAudio(it) : ui.sentenceAudio(it.jp));
      const st = NI.store.item(q.id) || NI.srs.fresh(Date.now());
      const pv = NI.srs.preview(st, Date.now());
      const lab = (g) => (q.first ? "<small>" + U.formatInterval(pv[g]) + "</small>" : "");
      foot.innerHTML =
        '<div class="grades" role="group" aria-label="How well did you remember?">' +
        '<button class="btn grade again' + (typedOk === false ? " hint" : "") + '" type="button" data-g="0"><span class="key">1</span>Again' + lab(0) + "</button>" +
        '<button class="btn grade good' + (typedOk === true ? " hint" : "") + '" type="button" data-g="2"><span class="key">2</span>Good' + lab(2) + "</button>" +
        '<button class="btn grade easy" type="button" data-g="3"><span class="key">3</span>Easy' + lab(3) + "</button></div>";
      foot.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => grade(Number(b.getAttribute("data-g")))));
      const focusBtn = foot.querySelector(typedOk === false ? '[data-g="0"]' : '[data-g="2"]');
      setTimeout(() => focusBtn.focus({ preventScroll: true }), 0);
      foot.scrollIntoView({ block: "nearest" });
    }

    function grade(g) {
      const q = queue[i];
      if (q.first) {
        NI.store.grade(q.id, g);
        firsts++;
        if (g > 0) good++;
        const X = NI.game.XP;
        const n = X.review + (g > 0 ? X.remembered : 0);
        pendingReviewXp += n;
        sessionXp += n;
        xpEl.textContent = sessionXp + " XP";
      }
      if (g > 0) {
        combo++;
        reviewBest = Math.max(reviewBest, combo);
        if (combo >= 5 && combo % 5 === 0) NI.fx.play("combo");
        else NI.fx.play("right");
      } else {
        combo = 0;
        if (q.first) NI.store.addMistake(q.id);
      }
      comboEl.hidden = combo < 3;
      comboEl.innerHTML = '<span aria-hidden="true">🔥</span> ' + combo;
      if (g === 0) queue.splice(Math.min(i + 4, queue.length), 0, { id: q.id, first: false });
      i++;
      show();
    }

    function finish() {
      setKeys(null);
      const res = settleReviewXp(true);
      const next = NI.srs.nextDue(NI.store.state.srs, Date.now());
      const more = NI.srs.dueIds(NI.store.state.srs, Date.now()).length;
      box.innerHTML =
        '<div class="finish">' + hanamaru() + "<h2>" + ui.jp("お{疲|つか}れ{様|さま}でした！", { tokens: false }) + "</h2>" +
        '<p class="finish-en">' + (extra ? "Practice done." : "Reviews done. You remembered " + good + " of " + firsts + ".") + "</p>" +
        (res.xp ? xpBlock(res, [["Reviews", res.xp - res.bonus]]) : "") +
        (!extra && next ? "<p>Next review in " + U.formatInterval(next - Date.now()) + ".</p>" : "") +
        '<div class="row center wrap">' +
        (more && !extra ? '<a class="btn primary" href="#review">Review ' + U.plural(more, "more card") + "</a>" : "") +
        '<a class="btn ' + (more && !extra ? "ghost" : "primary") + '" href="#home">Back to the route map</a></div></div>';
      NI.fx.reward(res, { inline: true });
      NI.fx.play("chime");
      if (remaining > 0 && !more) NI.app.renderNav();
    }

    setKeys((e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (typing(e)) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        reveal();
      } else if (revealed && /^[123]$/.test(e.key)) {
        e.preventDefault();
        grade(e.key === "1" ? 0 : e.key === "2" ? 2 : 3);
      }
    });
    show();
  }

  pages.review = {
    session: true,
    nav: "review",
    title: "Review",
    render() {
      return '<div class="session" id="sess"></div>';
    },
    mount(el) {
      runReview(el.querySelector("#sess"), false);
    },
    unmount() {
      setKeys(null);
      NI.speech.stop();
      if (pendingReviewXp) settleReviewXp(false);
    },
  };

  NI.session = { hanamaru, setKeys, feedback, shell, runExercises, ring, xpBlock, levelLine, goalLine };
})(typeof window !== "undefined" ? window : globalThis);
