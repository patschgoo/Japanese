/* Sound effects and small celebrations. Sounds are synthesised with the Web
   Audio API (no audio files) and stay silent when sound is off or the browser
   refuses audio; animations respect "reduce motion". */
(function (root) {
  "use strict";
  const NI = root.NI;
  const doc = root.document;
  let ctx = null;

  function audio() {
    if (!NI.store.settings.sound) return null;
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function tone(freq, start, dur, type, vol) {
    const c = audio();
    if (!c) return;
    try {
      const t0 = c.currentTime + start;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (e) {
      /* audio unavailable */
    }
  }

  const SOUNDS = {
    right: () => {
      tone(880, 0, 0.12);
      tone(1320, 0.07, 0.18);
    },
    wrong: () => {
      if (NI.store.settings.relaxed) return tone(392, 0, 0.25, "sine", 0.035);
      tone(233, 0, 0.16, "triangle", 0.07);
      tone(185, 0.1, 0.22, "triangle", 0.06);
    },
    combo: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.15, "sine", 0.06)),
    level: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, "triangle", 0.07)),
    badge: () => {
      tone(1047, 0, 0.2, "sine", 0.07);
      tone(1568, 0.11, 0.35, "sine", 0.06);
    },
    tick: () => tone(1400, 0, 0.035, "square", 0.025),
    // The Westminster chime Japanese schools ring between lessons.
    chime: () => [659, 523, 587, 392, 392, 587, 659, 523].forEach((f, i) => tone(f, i * 0.2, 0.45, "sine", 0.05)),
  };

  function play(name) {
    if (SOUNDS[name]) SOUNDS[name]();
  }

  const calm = () => root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // A little burst of paper confetti in the line colours.
  function confetti(anchor) {
    if (calm() || !doc.body) return;
    const box = doc.createElement("div");
    box.className = "confetti";
    box.setAttribute("aria-hidden", "true");
    const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: root.innerWidth / 2, top: root.innerHeight / 3, width: 0 };
    box.style.left = r.left + r.width / 2 + "px";
    box.style.top = r.top + "px";
    const colours = ["var(--line-h)", "var(--line-m)", "var(--line-d)", "var(--line-k)", "var(--line-t)", "var(--line-s)"];
    for (let i = 0; i < 28; i++) {
      const p = doc.createElement("i");
      const a = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * 110;
      p.style.setProperty("--dx", Math.cos(a) * d + "px");
      p.style.setProperty("--dy", Math.sin(a) * d - 40 + "px");
      p.style.setProperty("--rot", Math.random() * 540 - 270 + "deg");
      p.style.background = colours[i % colours.length];
      p.style.animationDelay = Math.random() * 0.08 + "s";
      box.appendChild(p);
    }
    doc.body.appendChild(box);
    setTimeout(() => box.remove(), 1400);
  }

  /* Reward banners drop in at the top of the screen and fade on their own.
     At most two show at once; the rest wait their turn. Tap one to dismiss it. */
  const MAX_SHOWN = 2;
  const waiting = [];
  function stackEl() {
    let stack = doc.getElementById("rewards");
    if (!stack) {
      stack = doc.createElement("div");
      stack.id = "rewards";
      stack.setAttribute("aria-live", "polite");
      doc.body.appendChild(stack);
    }
    return stack;
  }
  function showNext() {
    const stack = stackEl();
    while (waiting.length && stack.querySelectorAll(".reward:not(.out)").length < MAX_SHOWN) {
      const [html, cls] = waiting.shift();
      const b = doc.createElement("div");
      b.className = "reward " + (cls || "");
      b.innerHTML = html;
      let gone = false;
      const close = () => {
        if (gone) return;
        gone = true;
        b.classList.add("out");
        setTimeout(() => {
          b.remove();
          showNext();
        }, 400);
      };
      b.addEventListener("click", close);
      stack.appendChild(b);
      setTimeout(close, 3200);
    }
  }
  function banner(html, cls) {
    if (!doc.body) return;
    waiting.push([html, cls]);
    showNext();
  }

  /* Shows what a session or action earned: { xp, level, badges, bonus, goal }.
     level is the new level object when the learner levelled up. With
     { inline: true } only the sounds play: the caller shows the rest itself. */
  function reward(r, opts) {
    if (!r) return;
    const ui = NI.ui;
    const inline = opts && opts.inline;
    if (r.level) {
      play("level");
      if (!inline) {
        confetti();
        banner('<span class="rw-icon" aria-hidden="true">⬆️</span><span><b>Level ' + r.level.n + "!</b> " + ui.jp(r.level.title.ja, { tokens: false }) + " · " + ui.esc(r.level.title.en) + "</span>", "rw-level");
      }
    } else if ((r.badges || []).length) play("badge");
    if (inline) return;
    for (const b of r.badges || []) banner('<span class="rw-icon" aria-hidden="true">' + b.icon + "</span><span><b>Badge: " + ui.esc(b.t) + "</b> " + ui.esc(b.d) + "</span>", "rw-badge");
    if (r.bonus) banner('<span class="rw-icon" aria-hidden="true">🎯</span><span><b>Daily missions complete!</b> +' + r.bonus + " XP</span>", "rw-bonus");
    if (r.goal) banner('<span class="rw-icon" aria-hidden="true">🎉</span><span><b>Daily goal reached!</b> Come back tomorrow to keep your streak.</span>', "rw-goal");
  }

  /* Gives XP and works out everything that follows from it: level-ups, newly
     earned badges, the missions bonus and the daily goal. Returns the summary
     for reward(). opts: { badges, quiet (no sound or banner), inline (sound
     only, for finish screens that list the rewards themselves) }. */
  function gain(xp, opts) {
    const o = opts || {};
    const before = NI.game.level(NI.store.state.xp).n;
    const goalBefore = NI.game.goal().done;
    NI.store.addXp(xp);
    const bonus = NI.game.missionBonus();
    const after = NI.game.level(NI.store.state.xp);
    const badges = NI.game.check().concat(o.badges || []);
    const res = { xp: xp + bonus, bonus, badges, level: after.n > before ? after : null, goal: !goalBefore && NI.game.goal().done };
    if (!o.quiet) reward(res, { inline: o.inline });
    return res;
  }

  NI.fx = { play, confetti, banner, reward, gain };
})(typeof window !== "undefined" ? window : globalThis);
