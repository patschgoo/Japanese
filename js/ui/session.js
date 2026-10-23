/* Lesson and review sessions. Both take over the main area, show one card at
   a time, and answer to the keyboard: 1–4 pick an option, Enter continues,
   Space reveals a review card. */
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
      '<span class="sess-count" aria-live="polite"></span></div>' +
      '<div class="sess-bar"></div>' +
      '<div class="sess-card"></div>' +
      '<div class="sess-foot" hidden></div>'
    );
  }

  function feedback(ok, solutionHtml) {
    if (ok === null) return '<div class="fb neutral"><span></span><button class="btn primary" type="button" data-next>Continue</button></div>';
    if (ok) return '<div class="fb ok"><span class="stamp" aria-hidden="true">○</span><div class="fb-text"><b>' + ui.jp("{正解|せいかい}！", { tokens: false }) + " Correct</b></div>" + '<button class="btn primary" type="button" data-next>Continue</button></div>';
    return '<div class="fb bad"><span class="stamp" aria-hidden="true">×</span><div class="fb-text"><b>Not quite.</b>' + (solutionHtml ? '<div class="sol">' + solutionHtml + "</div>" : "") + "</div>" + '<button class="btn primary" type="button" data-next>Continue</button></div>';
  }

  // ---------------------------------------------------------------------------
  function runLesson(box, u, partKey) {
    const L = NI.exercises.lesson(u, partKey);
    if (!L) {
      box.innerHTML = '<p class="empty">This lesson part doesn\'t exist. <a href="#unit-' + u.n + '">Back to the unit</a></p>';
      return;
    }
    const queue = L.exercises.slice();
    let i = 0;
    let right = 0;
    let graded = 0;
    const retried = new Set();
    box.innerHTML = shell(esc(NI.course.code(u.n)) + " · " + esc(L.part.title), esc(u.en));
    const card = box.querySelector(".sess-card");
    const foot = box.querySelector(".sess-foot");
    const bar = box.querySelector(".sess-bar");
    const count = box.querySelector(".sess-count");

    box.querySelector("[data-quit]").addEventListener("click", () =>
      ui.confirm({ title: "Leave this lesson?", body: "Your answers in this lesson won't be saved.", ok: "Leave", cancel: "Keep going" }).then((yes) => yes && NI.app.go("unit-" + u.n))
    );

    function show() {
      if (i >= queue.length) return finish();
      const ex = queue[i];
      bar.innerHTML = ui.progressBar(i / queue.length, "Lesson progress");
      count.textContent = i + 1 + " / " + queue.length;
      card.innerHTML = '<div class="ex ex-' + ex.type + '">' + ex.html() + "</div>";
      foot.hidden = true;
      foot.innerHTML = "";
      const inner = card.firstElementChild;
      ex.mount(inner, { done: (ok) => answered(ex, ok) });
      if (NI.store.settings.autoplay && ex.autoplay) {
        const t = ex.autoplay();
        if (t) setTimeout(() => NI.speech.speak(t), 120);
      }
      const first = inner.querySelector("input, .opt, .tile, .m-cell");
      if (first && first.tagName !== "INPUT") first.focus({ preventScroll: true });
      card.scrollIntoView({ block: "nearest" });
    }

    function answered(ex, ok) {
      if (ok === true) {
        right++;
        graded++;
      } else if (ok === false) {
        graded++;
        // A missed item comes back once at the end; a retry is never retried.
        const key = ex.type + ":" + (ex.item || i);
        if (ex.retry && !ex.isRetry && !retried.has(key)) {
          retried.add(key);
          const again = ex.retry();
          again.isRetry = true;
          queue.push(again);
        }
      }
      foot.innerHTML = feedback(ok, ok === false && ex.solution ? ex.solution() : "");
      foot.hidden = false;
      foot.querySelector("[data-next]").addEventListener("click", next);
      const b = foot.querySelector("[data-next]");
      setTimeout(() => b.focus({ preventScroll: true }), 0);
      foot.scrollIntoView({ block: "nearest" });
    }

    function next() {
      i++;
      show();
    }

    function finish() {
      setKeys(null);
      NI.store.markPart(u.n, partKey);
      const added = NI.store.addItems(L.srs);
      NI.store.log("x", graded);
      const parts = NI.course.parts(u);
      const nextPart = parts.find((p) => !NI.store.partDone(u.n, p.key));
      const nu = NI.course.unit(u.n + 1);
      const nextBtn = nextPart
        ? '<a class="btn primary" href="#learn-' + u.n + "-" + nextPart.key + '">Next: ' + esc(nextPart.title) + "</a>"
        : nu
          ? '<a class="btn primary" href="#unit-' + nu.n + '">Next station: ' + esc(NI.course.code(nu.n)) + "</a>"
          : '<a class="btn primary" href="#home">Back to the route map</a>';
      const pct = graded ? Math.round((right / graded) * 100) : 100;
      box.innerHTML =
        '<div class="finish">' + hanamaru() +
        '<h2>' + ui.jp(pct >= 80 ? "よくできました！" : "がんばりました！", { tokens: false }) + "</h2>" +
        '<p class="finish-en">' + (pct >= 80 ? "Well done!" : "Good effort!") + " " + (graded ? "You got " + right + " of " + graded + " right." : "") + "</p>" +
        (added ? "<p>" + U.plural(added, L.srs[0] && L.srs[0].startsWith("s:") ? "sentence" : "word") + " added to your reviews. The first review comes up in about 4 hours.</p>" : "") +
        (!nextPart ? '<p class="station-done">' + esc(NI.course.code(u.n)) + " complete. " + (nu ? "On to the next station." : "That's the end of the line: every unit done!") + "</p>" : "") +
        '<div class="row center wrap">' + nextBtn + '<a class="btn ghost" href="#unit-' + u.n + '">Back to the unit</a></div></div>';
    }

    setKeys((e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (!foot.hidden && e.key === "Enter" && !typing(e)) {
        e.preventDefault();
        next();
        return;
      }
      if (typing(e)) return;
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
          '<p class="kicker">Say or type it in Japanese</p><p class="prompt-en">' + esc(it.en) + '</p><p class="word-meta center">' + ui.posTag(it) + "</p>" +
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
        '<div class="rv-back"><div class="word-big hand">' + ui.wordHead(it, { tokens: false }) + "</div>" + ui.say(ui.wordAudio(it), it.r) +
        '<p class="word-en">' + esc(it.en) + "</p>" + (it.note ? '<p class="word-note">' + esc(it.note) + "</p>" : "") +
        (ex ? '<div class="word-ex">' + ui.jp(ex.jp) + ui.say(ui.sentenceAudio(ex.jp)) + '<p class="en">' + esc(ex.en) + "</p></div>" : "") + "</div>"
      );
    }
    return '<div class="rv-back"><div class="prompt-sentence">' + ui.jp(it.jp) + ui.say(ui.sentenceAudio(it.jp)) + '</div><p class="word-en">' + esc(it.en) + "</p>" + (it.note ? '<p class="word-note">' + esc(it.note) + "</p>" : "") + "</div>";
  }

  function audioFor(it, mode) {
    if (it.kind === "word") return mode === "produce" ? null : ui.wordAudio(it);
    return ui.sentenceAudio(it.jp);
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
    box.innerHTML = shell(extra ? "Extra practice" : "Review", extra ? "Schedule unchanged" : U.plural(queue.length, "card") + " due");
    const card = box.querySelector(".sess-card");
    const foot = box.querySelector(".sess-foot");
    const bar = box.querySelector(".sess-bar");
    const count = box.querySelector(".sess-count");
    let revealed = false;
    let mode = "recog";
    let typedOk = null;

    box.querySelector("[data-quit]").addEventListener("click", () => {
      if (!firsts) return NI.app.go("home");
      ui.confirm({ title: "Stop reviewing?", body: "The cards you've answered are saved.", ok: "Stop", cancel: "Keep going" }).then((yes) => yes && NI.app.go("home"));
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
      const lab = (g) => (q.first ? '<small>' + U.formatInterval(pv[g]) + "</small>" : "");
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
      }
      if (g === 0) queue.splice(Math.min(i + 4, queue.length), 0, { id: q.id, first: false });
      i++;
      show();
    }

    function finish() {
      setKeys(null);
      const next = NI.srs.nextDue(NI.store.state.srs, Date.now());
      const more = NI.srs.dueIds(NI.store.state.srs, Date.now()).length;
      box.innerHTML =
        '<div class="finish">' + hanamaru() + "<h2>" + ui.jp("お{疲|つか}れ{様|さま}でした！", { tokens: false }) + "</h2>" +
        '<p class="finish-en">' + (extra ? "Practice done." : "Reviews done. You remembered " + good + " of " + firsts + ".") + "</p>" +
        (!extra && next ? "<p>Next review in " + U.formatInterval(next - Date.now()) + ".</p>" : "") +
        '<div class="row center wrap">' +
        (more && !extra ? '<a class="btn primary" href="#review">Review ' + U.plural(more, "more card") + "</a>" : "") +
        '<a class="btn ' + (more && !extra ? "ghost" : "primary") + '" href="#home">Back to the route map</a></div></div>';
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
    },
  };

  NI.session = { hanamaru, setKeys, feedback, shell };
})(typeof window !== "undefined" ? window : globalThis);
