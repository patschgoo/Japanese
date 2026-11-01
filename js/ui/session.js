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

  /* The よくできました stamp teachers press on good work: a red double ring,
     slightly tilted. lines: the two lines of text inside. */
  function hanamaru(lines) {
    const [a, b] = lines || ["よく", "できました"];
    return '<span class="hanamaru" role="img" aria-label="' + esc(a + b) + ': well done"><span lang="ja">' + esc(a) + "<br>" + esc(b) + "</span></span>";
  }

  /* Progress as stops on a line: passed stops filled, the current one
     ringed. Past 16 stops it's a plain line. */
  function stops(i, n, label) {
    const many = n > 16;
    let dots = "";
    if (!many) for (let k = 0; k < n; k++) dots += '<i class="' + (k < i ? "past" : k === i ? "cur" : "") + '"></i>';
    const f = many ? i / n : n > 1 ? Math.min(1, i / (n - 1)) : 0;
    return '<div class="stops' + (many ? " many" : "") + '" role="progressbar" aria-label="' + esc(label || "Progress") + '" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + i + '" style="--f:' + f.toFixed(4) + '">' + dots + "</div>";
  }

  function shell(title, sub) {
    return (
      '<div class="sess-top line">' +
      '<button class="icon-btn" type="button" data-quit aria-label="Leave">' + ui.ICON.close + "</button>" +
      '<div class="sess-bar"></div>' +
      '<span class="sess-count" aria-live="polite"></span></div>' +
      '<div class="sess-meta"><span class="sess-title"><b>' + title + "</b>" + (sub ? "<span> · " + sub + "</span>" : "") + "</span>" +
      '<span class="sess-combo" hidden></span>' +
      '<span class="sess-xp" title="XP this session">0 XP</span></div>' +
      '<div class="sess-card"></div>' +
      '<div class="sess-foot" hidden></div>'
    );
  }

  /* The feedback card: a ◎ stamp and よくできました！ when right, a △ and
     もう少し with the answer when not. extra: "+10 XP" for a right answer. */
  function feedback(ok, solutionHtml, extra) {
    const next = '<button class="btn primary" type="button" data-next>Next</button>';
    if (ok === null) return '<div class="fb neutral"><button class="btn primary" type="button" data-next>Continue</button></div>';
    if (ok) return '<div class="fb ok"><span class="fb-mark" aria-hidden="true">◎</span><div class="fb-text"><b>' + ui.jp("よくできました！", { tokens: false }) + '</b><span class="fb-sub">Correct' + (extra ? " · " + extra : "") + "</span></div>" + next + "</div>";
    return '<div class="fb bad"><span class="fb-mark" aria-hidden="true">△</span><div class="fb-text"><b>' + ui.jp("もう{少|すこ}し", { tokens: false }) + '</b><span class="fb-sub">Not quite.' + (solutionHtml ? " The answer:" : "") + "</span>" + (solutionHtml ? '<div class="sol">' + solutionHtml + "</div>" : "") + "</div>" + next + "</div>";
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
      '<div class="lvl-text">' + (up ? '<span class="lvl-up">Level up!</span>' : "") + "<b>" + ui.jp(L.title.ja, { tokens: false, ro: true }) + " · " + esc(L.title.en) + "</b>" + ui.progressBar(L.frac, "Progress to the next level") +
      '<span class="small muted">' + (L.need - L.into) + " XP to level " + (L.n + 1) + "</span></div></div>"
    );
  }

  // The daily goal as a strip: reached (now: by what just happened) or how far.
  function goalLine(now) {
    const g = NI.game.goal();
    const streak = NI.store.streak();
    return (
      '<div class="goal-strip' + (g.done ? " done" : "") + (now ? " now" : "") + '"><span aria-hidden="true">🎯</span><span class="gs-t">' + (now ? "Daily goal reached! " : g.done ? "Daily goal reached · " : "Daily goal · ") + g.xp + " of " + g.target + " XP</span>" +
      (streak ? '<span class="gs-s" title="' + U.plural(streak, "day") + ' in a row">🔥 ' + streak + "</span>" : "") + "</div>"
    );
  }

  /* The XP card on finish screens. res is what NI.fx.gain() returned and
     lines are [label, xp] pairs; the missions bonus, new badges, a level-up
     and the daily goal are listed here instead of popping up as banners. */
  function xpBlock(res, lines, total) {
    const all = lines.concat(res.bonus ? [["Daily missions", res.bonus]] : []);
    const badges = res.badges || [];
    return (
      '<div class="card xp-sum">' +
      (all.length ? '<ul class="xp-lines">' + all.map(([t, n]) => "<li><span>" + esc(t) + "</span><b>+" + n + "</b></li>").join("") + "</ul>" : "") +
      '<p class="xp-big"><b>' + esc(total || "Total") + "</b><b>+" + res.xp + " XP</b></p>" +
      goalLine(res.goal) +
      levelLine(!!res.level) +
      (badges.length
        ? '<div class="new-badges"><p><b>New badge' + (badges.length > 1 ? "s" : "") + '</b> · <a href="#stamps">Stamp book</a></p><ul>' +
          badges.map((b) => '<li><span class="nb-icon" aria-hidden="true">' + b.icon + "</span><span><b>" + esc(b.t) + "</b>" + esc(b.d) + "</span></li>").join("") + "</ul></div>"
        : "") +
      (res.rest ? '<p class="rest-earned">🎫 <b>Rest day earned</b> for ' + NI.store.streak() + " days in a row: if you miss a day, it keeps your streak going.</p>" : "") +
      "</div>"
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

    // Looking up a meaning during a question (NI.lookup) counts as a hint.
    const onPeek = () => {
      if (!card.isConnected) return document.removeEventListener("ni-peek", onPeek);
      const ex = queue[i];
      const inner = card.firstElementChild;
      if (!ex || !inner || inner.dataset.answered || !foot.hidden || ex.hinted) return;
      ex.hinted = true;
      hints++;
      const h = card.querySelector("[data-hint]");
      if (h) h.disabled = true;
    };
    document.addEventListener("ni-peek", onPeek);

    function show() {
      if (i >= queue.length) return finish();
      const ex = queue[i];
      bar.innerHTML = stops(i, queue.length, "Progress");
      count.textContent = i + 1 + " of " + queue.length;
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
        // A missed item comes back once at the end (unless turned off); a retry is never retried.
        const key = ex.type + ":" + (ex.item || i);
        if (ex.retry && !ex.isRetry && !retried.has(key) && NI.store.settings.retryMissed !== false) {
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
      const extra = gained ? '<span class="fb-xp">+' + gained + " XP" + (ex.hinted ? " (hint)" : "") + "</span>" : "";
      foot.innerHTML = feedback(ok, ok === false && ex.solution ? ex.solution() : "", extra);
      foot.hidden = false;
      const b = foot.querySelector("[data-next]");
      b.addEventListener("click", next);
      setTimeout(() => b.focus({ preventScroll: true }), 0);
      // Options → continue by itself after a right answer.
      if (ok === true && NI.store.settings.autoNext) {
        const at = i;
        setTimeout(() => {
          if (i === at && card.isConnected && !foot.hidden) next();
        }, 1100);
      }
      foot.scrollIntoView({ block: "nearest" });
      // On a phone the feedback bar can cover the right answer: scroll it into view above the bar.
      const shown = card.querySelector(".opt.right") || card.querySelector(".kana-input");
      if (shown) {
        const gap = foot.getBoundingClientRect().top - shown.getBoundingClientRect().bottom;
        if (gap < 10) window.scrollBy(0, 10 - gap);
      }
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
        const lines = [["Correct answers", sum.xp], ["Part finished", X.lesson]];
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
          ? '<a class="btn primary big" href="#learn-' + u.n + "-" + nextPart.key + '">Next: ' + esc(nextPart.title) + "</a>"
          : nu
            ? '<a class="btn primary big" href="#unit-' + nu.n + '">Next station: ' + esc(NI.course.code(nu.n)) + "</a>"
            : '<a class="btn primary big" href="#home">Back to the route map</a>';
        const pct = sum.graded ? Math.round((sum.right / sum.graded) * 100) : 100;
        const line = NI.course.lineOf(u.n);
        const lineDone = line && line.units.every((n) => NI.game.stamps().find((s) => s.unit.n === n && s.done));
        const nDone = parts.filter((p) => NI.store.partDone(u.n, p.key)).length;
        return (
          '<div class="finish">' +
          '<div class="finish-head">' + hanamaru(pct >= 80 ? ["よく", "できました"] : ["がんばり", "ました"]) +
          "<h1>" + ui.jp(pct >= 80 ? "よくできました！" : "がんばりました！", { tokens: false }) + "</h1>" +
          '<p class="finish-en">' + (pct >= 80 ? "Well done!" : "Good effort!") + " " + (sum.graded ? "You got " + sum.right + " of " + sum.graded + " right" + (sum.bestCombo >= 3 ? ", with a combo of " + sum.bestCombo : "") + "." : "") + "</p></div>" +
          xpBlock(res, lines, "This lesson") +
          '<a class="card station-mini line-' + line.color + '" href="#unit-' + u.n + '"><span class="sm-top">' + ui.stationCode(u.n) + '<b class="sm-name">' + ui.jp(u.ja, { tokens: false, gaps: false }) + "</b></span>" +
          '<span class="tk-parts" aria-hidden="true">' + parts.map((p) => '<i class="' + (NI.store.partDone(u.n, p.key) ? "on" : p === nextPart ? "next" : "") + '"></i>').join("") + "</span>" +
          '<span class="sm-sub">' + esc(L.part.title) + " done · " + nDone + " of " + parts.length + " parts" + (nextPart ? " · next: " + esc(nextPart.title) : "") + "</span></a>" +
          (!wasStamped && nowStamped && NI.stampSvg
            ? '<div class="card stamp-earned"><div class="stamp-wrap">' + NI.stampSvg(u, { fresh: true }) + "</div><p><b>Station stamp collected!</b> " + esc(NI.course.code(u.n)) + " " + esc(u.en) + ' · <a href="#stamps">Stamp book</a></p></div>'
            : "") +
          (added ? '<p class="finish-note">' + U.plural(added, L.srs[0] && L.srs[0].startsWith("s:") ? "sentence" : "word") + " added to your reviews. The first review comes up in about 4 hours.</p>" : "") +
          (!nextPart ? '<p class="finish-note station-done">' + esc(NI.course.code(u.n)) + " complete. " + (nu ? "On to the next station." : "That's the end of the line: every unit done!") + "</p>" : "") +
          (lineDone && !wasStamped && nowStamped ? '<p class="finish-note station-done">Every stamp on ' + ui.jp(line.ja, { tokens: false }) + ' collected. Take the <a href="#exam-' + line.id + '">line exam</a> for a gold badge.</p>' : "") +
          '<div class="finish-btns">' + nextBtn + '<a class="btn ghost" href="#home">Back to home</a></div></div>'
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
    if (id.startsWith("j:")) return "recog";
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
    if (it.kind === "kanji") return NI.kanji.reviewFront(it);
    if (it.kind === "word") {
      if (mode === "produce") {
        return (
          '<p class="kicker">Say or type it in Japanese</p><p class="prompt-en">' + (it.em ? '<span class="em" aria-hidden="true">' + it.em + "</span> " : "") + esc(it.en) + '</p><p class="word-meta center">' + ui.posTag(it) + "</p>" +
          '<div class="answer-row"><label class="sr" for="rv-in">Your answer (optional)</label><input id="rv-in" class="kana-input" type="text" placeholder="optional: type in romaji or kana" lang="ja"></div>'
        );
      }
      if (mode === "listen") return '<p class="kicker">What does it mean?</p><div class="prompt-audio"><button class="big-play" type="button" data-say="' + esc(ui.wordAudio(it)) + '" aria-label="Play the word">' + ui.ICON.speaker + "</button></div>";
      // With furigana on tap, the reading is part of the question.
      const ask = NI.store.settings.furigana === "hover" && NI.furi.reading(it.head) !== NI.furi.base(it.head) ? "How is it read, and what does it mean?" : "What does it mean?";
      return '<div class="prompt-word hand rv-word"' + ui.fit(it.head) + ">" + ui.jp(it.head, { tokens: false }) + '</div><p class="rv-ask">' + ask + "</p>";
    }
    if (mode === "listen") return '<p class="kicker">What does it mean?</p><div class="prompt-audio"><button class="big-play" type="button" data-say="' + esc(ui.sentenceAudio(it.jp)) + '" aria-label="Play the sentence">' + ui.ICON.speaker + "</button></div>";
    return '<p class="kicker">What does it mean?</p><div class="prompt-sentence">' + ui.jp(it.jp) + ui.say(ui.sentenceAudio(it.jp)) + "</div>";
  }

  /* Which train a card rides, the five trains as a ladder, and where a
     right answer takes it. */
  function tierHead(st) {
    const T = NI.srs.TIERS;
    const t = NI.srs.tierOf(st ? st.st : 1);
    if (!t) return "";
    const ti = T.indexOf(t);
    const up = st ? NI.srs.tierOf(Math.min(NI.srs.MAX, st.st + 1)) : null;
    const nextT = T[ti + 1];
    const note = !nextT ? "The fastest train: remember it to keep it here" : up && up !== t ? "Remember it and it moves up to " + nextT.ja + " " + nextT.en : "Remember it twice to move up to " + nextT.ja + " " + nextT.en;
    return (
      '<div class="rv-tier"><span class="tier big tier-' + t.id + '"><span lang="ja">' + esc(t.ja) + "</span> " + esc(t.en) + " train</span>" +
      '<span class="ladder" aria-hidden="true">' + T.map((x, i) => '<span class="tier' + (i < ti ? " past tier-" + x.id : i === ti ? " on tier-" + x.id : "") + '" lang="ja">' + esc(x.ja) + "</span>").join("") + "</span>" +
      '<span class="rv-note">' + esc(note) + "</span></div>"
    );
  }

  function back(it, mode) {
    if (it.kind === "kanji") return NI.kanji.reviewBack(it);
    if (it.kind === "word") {
      const ex = NI.items.bestExample(it);
      const exHtml = ex ? '<div class="word-ex">' + ui.jp(ex.jp) + ui.say(ui.sentenceAudio(ex.jp)) + ui.breakdownBtn(ex.jp, ex.en) + '<p class="en">' + esc(ex.en) + "</p></div>" : "";
      // The word is already on the card: show how it's read and what it means.
      if (mode === "recog") {
        const kana = NI.furi.reading(it.head);
        return (
          '<div class="rv-back">' + (kana !== NI.furi.base(it.head) ? '<p class="rv-kana" lang="ja">' + esc(kana) + "</p>" : "") +
          '<p class="word-en">' + (it.em ? '<span class="em" aria-hidden="true">' + it.em + "</span> " : "") + esc(it.en) + "</p>" +
          '<p class="rv-tools">' + ui.posTag(it) + ui.say(ui.wordAudio(it), it.r) + NI.book.star(it.id) + "</p>" +
          (it.dict ? '<p class="word-note">Dictionary form ' + ui.jp(it.dict, { tokens: false }) + "</p>" : "") +
          (it.note ? '<p class="word-note">' + esc(it.note) + "</p>" : "") + exHtml + "</div>"
        );
      }
      return (
        '<div class="rv-back">' + (it.em ? '<div class="em-big" aria-hidden="true">' + it.em + "</div>" : "") + '<div class="word-big hand"' + ui.fit(it.head) + ">" + ui.wordHead(it, { tokens: false }) + "</div>" + ui.say(ui.wordAudio(it), it.r) + NI.book.star(it.id) +
        '<p class="word-en">' + esc(it.en) + "</p>" + (it.note ? '<p class="word-note">' + esc(it.note) + "</p>" : "") + exHtml + "</div>"
      );
    }
    return '<div class="rv-back"><div class="prompt-sentence">' + ui.jp(it.jp) + ui.say(ui.sentenceAudio(it.jp)) + ui.breakdownBtn(it.jp, it.en) + '</div><p class="word-en">' + esc(it.en) + "</p>" + (it.note ? '<p class="word-note">' + esc(it.note) + "</p>" : "") + "</div>";
  }

  function audioFor(it, mode) {
    if (it.kind === "kanji") return null;
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

  // Review cards due on each of the next seven days; today includes any overdue.
  function dueWeek() {
    const srs = NI.store.state.srs;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const out = [];
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
      out.push({ d, n, i });
    }
    return out;
  }

  // The week ahead as seven bars: today solid, the rest lighter.
  function weekChart(ahead) {
    const max = Math.max(1, ...ahead.map((x) => x.n));
    const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      '<div class="wk-chart" role="img" aria-label="' + esc(ahead.map((x) => (x.i ? DAY[x.d.getDay()] : "Today") + " " + x.n).join(", ")) + '">' +
      ahead.map((x) => '<span class="wc-col' + (x.i ? "" : " today") + '"><b>' + x.n + '</b><i style="height:' + Math.max(4, Math.round((x.n / max) * 100)) + '%"></i><span>' + (x.i ? DAY[x.d.getDay()] : "Today") + "</span></span>").join("") +
      "</div>"
    );
  }

  /* Review with nothing (more) due: a done card, the week ahead and ways to
     practise anyway. o.done: after a review, with o.summary (its XP). */
  function nothingDue(o) {
    o = o || {};
    const srs = NI.store.state.srs;
    const now = Date.now();
    const any = Object.keys(srs).length > 0;
    const next = NI.srs.nextDue(srs, now);
    const step = NI.nextStep();
    const today = NI.store.today().r || 0;
    const ahead = dueWeek();
    const total = ahead.reduce((a, x) => a + x.n, 0);
    const mis = Object.keys(NI.store.state.mistakes).filter((r) => NI.items.get(r)).length;
    const row = (href, icon, t, sub, chip, attr) =>
      "<" + (href ? 'a href="' + href + '"' : 'button type="button" ' + attr) + ' class="list-row"><span class="lr-ic" aria-hidden="true">' + icon + '</span><span class="lr-t"><b>' + t + "</b><span>" + sub + "</span></span>" + (chip || "") + ui.ICON.chev + "</" + (href ? "a" : "button") + ">";
    const sub = o.done
      ? o.extra ? "Practice done. Your schedule hasn’t changed." : "Reviews done. You remembered " + o.good + " of " + o.firsts + "."
      : any ? "Nothing to review right now." : "Reviews start once you finish your first lesson part.";
    return (
      '<header class="page-head"><h1>Review<span class="sub">' + ui.jp("{復習|ふくしゅう}", { tokens: false }) + "</span></h1></header>" +
      '<div class="rv-done-wrap"><section class="card rv-done"><span class="rv-check" aria-hidden="true">' + ui.ICON.check + "</span>" +
      "<h2>" + ui.jp(any ? "お{疲|つか}れ{様|さま}でした！" : "まだ カードが ありません", { tokens: false }) + "</h2>" +
      '<p class="rv-done-t">' + sub + "</p>" +
      (any ? '<p class="rv-done-s">' + (next ? "Next review in " + U.formatInterval(next - now) : "Nothing scheduled") + (today ? " · " + U.plural(today, "card") + " reviewed today" : "") + "</p>" : "") +
      (!any && step ? '<a class="btn primary" href="#learn-' + step.u.n + "-" + step.p.key + '">Start ' + esc(NI.course.code(step.u.n)) + " " + esc(step.p.title) + "</a>" : "") +
      "</section>" +
      (o.summary || "") +
      (any ? '<section class="h-sec"><div class="sec-head"><h2>Due in the week ahead</h2><span class="meta">' + U.plural(total, "card") + '</span></div><div class="card">' + weekChart(ahead) + "</div></section>" : "") +
      '<section class="h-sec"><div class="sec-head"><h2>Practise anyway</h2></div><div class="card list-card">' +
      (any ? row("", "🚃", "Extra practice", "15 cards · your schedule stays the same", "", "data-extra") : "") +
      row("#mistakes", "📝", "Mistakes notebook", mis ? "Get each one right twice to clear it" : "Empty: nothing to fix", mis ? '<span class="pill bad">' + mis + "</span>" : "") +
      (any ? row("#cards-rev", "🃏", "Flashcards", "The words in your reviews", "") : "") +
      row("#listen", "🎧", "Listen on the go", "Hands-free audio with pauses to answer", "") +
      row("#play", "🎮", "Play a game", "Time Attack, Kana Rain and more", "") +
      "</div></section></div>"
    );
  }

  function bindNothingDue(box) {
    const ex = box.querySelector("[data-extra]");
    if (ex) ex.addEventListener("click", () => runReview(box, true));
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
      box.innerHTML = nothingDue();
      bindNothingDue(box);
      return;
    }
    const LIMIT = Number(NI.store.settings.reviewLimit) || 50;
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
      bar.innerHTML = stops(i, queue.length, "Review progress");
      count.textContent = i + 1 + " of " + queue.length;
      card.innerHTML = '<div class="ex rv rv-' + mode + '">' + (it.kind === "kanji" ? "" : tierHead(st)) + front(it, mode) + '<div class="rv-reveal"></div></div>';
      foot.hidden = false;
      foot.innerHTML = '<div class="fb neutral"><span></span><button class="btn primary" type="button" data-reveal>Show answer</button></div>';
      foot.querySelector("[data-reveal]").addEventListener("click", reveal);
      const input = card.querySelector(".kana-input");
      if (input) {
        const ime = NI.kana.bindIme(input);
        if (NI.keys) NI.keys.attach(input, { kana: true, enter: "Show answer" });
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
      card.querySelector(".rv-reveal").innerHTML = back(it, mode);
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
        if (q.first && !q.id.startsWith("j:")) NI.store.addMistake(q.id);
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
      const more = NI.srs.dueIds(NI.store.state.srs, Date.now()).length;
      const sumHtml =
        (res.xp ? xpBlock(res, [[extra ? "Practice" : "Reviews", res.xp - res.bonus]], extra ? "This practice" : "This review") : "") +
        (more && !extra ? '<a class="btn primary big" href="#review">Review ' + U.plural(more, "more card") + "</a>" : "");
      box.innerHTML = nothingDue({ done: true, extra, good, firsts, summary: sumHtml });
      bindNothingDue(box);
      NI.fx.reward(res, { inline: true });
      NI.fx.play("chime");
      if (remaining > 0 && !more) NI.app.renderNav();
      root.scrollTo(0, 0);
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

  NI.session = { hanamaru, setKeys, feedback, shell, stops, runExercises, ring, xpBlock, levelLine, goalLine, dueWeek, weekChart };
})(typeof window !== "undefined" ? window : globalThis);
