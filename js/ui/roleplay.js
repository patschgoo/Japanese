/* Role-play: take one part in a unit's conversation. The other lines are
   played aloud; at your turn you see what you want to say in English and
   pick the Japanese line (or say it, then check). Practising your own lines
   in context is output practice, and saying them aloud helps them stick. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const pages = (NI.pages = NI.pages || {});
  const PITCH = [1.0, 1.28, 0.82, 1.12];

  const reached = () => {
    const step = NI.nextStep();
    return step ? step.u.n : 999;
  };

  // Speakers with at least two lines can be played.
  function roles(u) {
    const d = u.dialogue;
    const count = {};
    for (const l of d.lines) if (l.who !== "*") count[l.who] = (count[l.who] || 0) + 1;
    return Object.keys(d.cast).filter((k) => count[k] >= 2);
  }

  /* Two wrong lines for a turn: from this conversation or earlier ones, of a
     similar length, and clearly different from the right line. */
  function distractors(u, line, rng) {
    const want = NI.furi.base(line.jp);
    const pool = [];
    for (const v of NI.course.units) {
      if (v.n > u.n || !v.dialogue) continue;
      for (const l of v.dialogue.lines) {
        if (l.who === "*" || !l.jp) continue;
        const b = NI.furi.base(l.jp);
        if (b === want || l.en === line.en || U.similarity(b, want) > 0.6) continue;
        pool.push({ l, d: Math.abs(b.length - want.length) + (v.n === u.n ? 0 : 3) + rng() * 4 });
      }
    }
    pool.sort((a, b) => a.d - b.d);
    const out = [];
    for (const p of pool) {
      if (out.length >= 2) break;
      if (!out.some((o) => NI.furi.base(o.jp) === NI.furi.base(p.l.jp))) out.push(p.l);
    }
    return out;
  }

  function hub() {
    const r = reached();
    let html =
      '<header class="page-head"><h1>Role-play <span class="sub">' + ui.jp("ロールプレイ", { tokens: false }) + "</span></h1>" +
      "<p>Step into a conversation from the course. Your partner’s lines are spoken; when it’s your turn, you choose what to say, or say it out loud.</p></header>" +
      '<ul class="story-list rp-list">';
    for (const u of NI.course.units) {
      if (!u.dialogue || !roles(u).length) continue;
      const line = NI.course.lineOf(u.n);
      const open = u.n <= Math.max(r, 2);
      const cast = roles(u).map((k) => NI.furi.base(u.dialogue.cast[k].ja)).join(" · ");
      html +=
        '<li class="story-item line-' + (line ? line.color : "h") + (open ? "" : " ahead") + '"><a href="#roleplay-' + u.n + '">' +
        '<span class="line-badge" aria-hidden="true">' + esc(line ? line.id : "") + "</span>" +
        '<span class="st-text"><b>' + esc(u.dialogue.title) + "</b><span>" + esc(NI.course.code(u.n)) + " · " + esc(cast) + "</span></span>" +
        (open ? "" : '<span class="tag">Later</span>') + "</a></li>";
    }
    return html + "</ul>";
  }

  pages.roleplays = { title: "Role-play", nav: "play", render: hub };

  pages.roleplay = {
    session: true,
    nav: "play",
    title(args) {
      const u = NI.course.unit(args[0]);
      return u && u.dialogue ? "Role-play: " + u.dialogue.title : "Role-play";
    },
    render(args) {
      const u = NI.course.unit(args[0]);
      if (!u || !u.dialogue || !roles(u).length) return '<p class="empty">There’s no conversation to play here. <a href="#roleplays">All role-plays</a></p>';
      return '<div class="session rp" id="rp"></div>';
    },
    mount(el, args) {
      const u = NI.course.unit(args[0]);
      const box = el.querySelector("#rp");
      if (box) setup(box, u);
    },
    unmount() {
      const box = document.getElementById("rp");
      if (box && box._stop) box._stop();
      NI.speech.stop();
      NI.session.setKeys(null);
    },
  };

  function head(u) {
    return (
      '<div class="sess-top"><button class="icon-btn" type="button" data-quit aria-label="Leave">' + ui.ICON.close + "</button>" +
      '<div class="sess-title"><b>🎭 ' + esc(u.dialogue.title) + "</b><span>" + esc(NI.course.code(u.n)) + " · Role-play</span></div>" +
      '<span class="sess-xp">0 XP</span></div><div class="sess-bar"></div>'
    );
  }

  function setup(box, u) {
    const d = u.dialogue;
    const rs = roles(u);
    const canSay = NI.speech.supported;
    box.innerHTML =
      head(u) +
      '<div class="rp-setup">' +
      (d.setting ? '<p class="setting">' + esc(d.setting) + "</p>" : "") +
      '<fieldset class="g-opts"><legend>Who do you want to be?</legend>' +
      rs.map((k, i) => '<label class="radio"><input type="radio" name="rp-who" value="' + esc(k) + '"' + (i === 0 ? " checked" : "") + "><span><b>" + ui.jp(d.cast[k].ja, { tokens: false, gaps: false }) + "</b><small>" + esc(d.cast[k].en) + "</small></span></label>").join("") +
      "</fieldset>" +
      '<fieldset class="g-opts"><legend>Your lines</legend>' +
      '<label class="radio"><input type="radio" name="rp-mode" value="pick" checked><span><b>Pick what to say</b><small>Choose the right Japanese for what you want to say</small></span></label>' +
      '<label class="radio"><input type="radio" name="rp-mode" value="say"><span><b>Say it yourself</b><small>Say your line out loud, then check it' + (NI.speech.canRecognize ? " (with the microphone if you like)" : "") + "</small></span></label>" +
      "</fieldset>" +
      (canSay ? "" : '<p class="note">Your device has no Japanese voice, so your partner’s lines are shown but not spoken.</p>') +
      '<div class="row center"><button class="btn primary big" type="button" data-start>Start</button></div></div>';
    box.querySelector("[data-quit]").addEventListener("click", () => NI.app.go("roleplays"));
    box.querySelector("[data-start]").addEventListener("click", () => {
      const who = box.querySelector('input[name="rp-who"]:checked').value;
      const mode = box.querySelector('input[name="rp-mode"]:checked').value;
      play(box, u, who, mode);
    });
  }

  function play(box, u, me, mode) {
    const d = u.dialogue;
    const castKeys = Object.keys(d.cast);
    const rng = U.rng(Date.now());
    let k = 0;
    let right = 0;
    let turns = 0;
    let xp = 0;
    let stopped = false;
    let timer = null;
    box.innerHTML = head(u) + '<ol class="dlg-lines rp-lines" aria-live="polite"></ol><div class="rp-turn" hidden></div>';
    const list = box.querySelector(".rp-lines");
    const turn = box.querySelector(".rp-turn");
    const xpEl = box.querySelector(".sess-xp");
    const bar = box.querySelector(".sess-bar");
    box._stop = () => {
      stopped = true;
      clearTimeout(timer);
      NI.speech.stop();
    };
    box.querySelector("[data-quit]").addEventListener("click", () => NI.app.go("roleplays"));

    function bubble(l, cls) {
      const who = d.cast[l.who];
      const side = l.who === me ? "r" : "l";
      const li = document.createElement("li");
      li.className = "dlg-line side-" + side + " sp-" + castKeys.indexOf(l.who) + (cls ? " " + cls : "");
      li.innerHTML =
        '<span class="who">' + ui.jp(who.ja, { tokens: false, gaps: false }) + '<span class="who-en">' + esc(l.who === me ? "you" : who.en) + "</span></span>" +
        '<div class="bubble"><div class="b-jp">' + ui.jp(l.jp) + '</div><p class="en">' + esc(l.en) + "</p></div>" +
        '<span class="dlg-tools">' + ui.say(ui.sentenceAudio(l.jp), null, "small") + ui.breakdownBtn(l.jp, l.en) + "</span>";
      list.appendChild(li);
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return li;
    }

    function speak(l, then) {
      const pitch = PITCH[castKeys.indexOf(l.who) % PITCH.length];
      const ok = NI.speech.supported && NI.speech.speak(ui.sentenceAudio(l.jp), { pitch, onend: () => !stopped && (timer = setTimeout(then, 300)) });
      if (!ok) timer = setTimeout(then, 900 + NI.furi.base(l.jp).length * 90);
    }

    function next() {
      if (stopped) return;
      bar.innerHTML = ui.progressBar(k / d.lines.length, "Conversation");
      if (k >= d.lines.length) return finish();
      const l = d.lines[k++];
      if (l.who === "*") {
        const li = document.createElement("li");
        li.className = "dlg-narr";
        li.textContent = l.en;
        list.appendChild(li);
        timer = setTimeout(next, 500);
        return;
      }
      if (l.who !== me) {
        const li = bubble(l, "playing");
        speak(l, () => {
          li.classList.remove("playing");
          next();
        });
        return;
      }
      yourTurn(l);
    }

    function score(ok) {
      turns++;
      if (ok) {
        right++;
        xp += NI.game.XP.roleLine;
        xpEl.textContent = xp + " XP";
      }
      NI.fx.play(ok ? "right" : "wrong");
    }

    function after(l, ok) {
      turn.hidden = true;
      turn.innerHTML = "";
      const li = bubble(l, ok ? "playing" : "playing missed");
      speak(l, () => {
        li.classList.remove("playing");
        next();
      });
    }

    function yourTurn(l) {
      turn.hidden = false;
      const cue = '<p class="kicker">Your turn: say this in Japanese</p><p class="rp-cue">' + esc(l.en) + "</p>";
      if (mode === "pick") {
        const opts = U.shuffle([l].concat(distractors(u, l, rng)), rng);
        turn.innerHTML = cue + '<div class="opts">' + opts.map((o, i) => '<button class="opt" type="button" data-i="' + i + '"><span class="key" aria-hidden="true">' + (i + 1) + '</span><span class="opt-body">' + ui.jp(o.jp, { tokens: false }) + "</span></button>").join("") + "</div>";
        const btns = Array.from(turn.querySelectorAll(".opt"));
        const ci = opts.indexOf(l);
        btns.forEach((b) =>
          b.addEventListener("click", () => {
            if (turn.dataset.lock) return;
            turn.dataset.lock = "1";
            const ok = Number(b.dataset.i) === ci;
            btns.forEach((x, j) => {
              x.disabled = true;
              if (j === ci) x.classList.add("right");
              else if (x === b) x.classList.add("wrong");
            });
            score(ok);
            timer = setTimeout(() => {
              delete turn.dataset.lock;
              after(l, ok);
            }, ok ? 500 : 1300);
          })
        );
        NI.session.setKeys((e) => {
          if (/^[1-3]$/.test(e.key) && !turn.hidden) {
            const b = btns[Number(e.key) - 1];
            if (b && !b.disabled) b.click();
          }
        });
        btns[0].focus({ preventScroll: true });
      } else {
        turn.innerHTML =
          cue + '<p class="small muted center">Say it out loud in Japanese, then check.</p>' +
          '<div class="row center wrap rp-say"><button class="btn primary" type="button" data-show>I said it — show me</button></div>' +
          NI.speakCheck.block("Say it to the microphone");
        const show = turn.querySelector("[data-show]");
        let heard = null;
        const reveal = () => {
          const row = turn.querySelector(".rp-say");
          row.innerHTML =
            '<div class="sol center">' + ui.jp(l.jp, { tokens: false }) + "</div>" +
            '<div class="row center wrap"><button class="btn ghost" type="button" data-self="0">Not quite</button><button class="btn primary" type="button" data-self="1">I got it</button></div>';
          row.querySelectorAll("[data-self]").forEach((b) =>
            b.addEventListener("click", () => {
              const ok = b.getAttribute("data-self") === "1";
              NI.store.log("sp", 1);
              score(ok);
              after(l, ok);
            })
          );
          row.querySelector('[data-self="' + (heard != null && heard < 0.7 ? 0 : 1) + '"]').focus({ preventScroll: true });
        };
        show.addEventListener("click", reveal);
        NI.speakCheck.bind(turn, l.jp, (s) => {
          heard = s;
          if (turn.querySelector("[data-show]")) reveal();
        });
        show.focus({ preventScroll: true });
      }
      turn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function finish() {
      NI.session.setKeys(null);
      NI.store.log("rp", 1);
      const lines = [["Your lines", xp], ["Conversation finished", NI.game.XP.roleplay]];
      const res = NI.fx.gain(xp + NI.game.XP.roleplay, { inline: true });
      NI.fx.play("chime");
      if (right === turns && turns) NI.fx.confetti(box);
      const other = roles(u).find((r) => r !== me);
      const end = document.createElement("div");
      end.className = "finish";
      end.innerHTML =
        "<h2>" + ui.jp(right === turns ? "よくできました！" : "お{疲|つか}れ{様|さま}でした！", { tokens: false }) + "</h2>" +
        '<p class="finish-en">You got ' + right + " of " + turns + " of your lines right.</p>" +
        NI.session.xpBlock(res, lines) +
        '<div class="row center wrap">' +
        (other ? '<button class="btn primary" type="button" data-swap>Play as ' + esc(NI.furi.base(d.cast[other].ja)) + "</button>" : "") +
        '<a class="btn ghost" href="#unit-' + u.n + '">Back to the unit</a><a class="btn ghost" href="#roleplays">More role-plays</a></div>';
      box.appendChild(end);
      end.scrollIntoView({ block: "start", behavior: "smooth" });
      const swap = end.querySelector("[data-swap]");
      if (swap) swap.addEventListener("click", () => play(box, u, other, mode));
    }

    next();
  }

  NI.roleplay = { roles, distractors };
})(typeof window !== "undefined" ? window : globalThis);
