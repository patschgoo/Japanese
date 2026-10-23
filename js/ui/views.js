/* Reusable views: station sign, word list, sentence list, the reading-aids
   toolbar and the line player used by conversations and stories (play all,
   or shadow: listen, then repeat in the pause). */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;

  function tierBadge(id) {
    const it = NI.store.item(id);
    if (!it) return "";
    const t = NI.srs.tierOf(it.st);
    return t ? '<span class="tier tier-' + t.id + '" title="Review stage: ' + esc(t.en) + '">' + esc(t.ja) + "</span>" : "";
  }

  function sign(u) {
    const line = NI.course.lineOf(u.n);
    const prev = NI.course.unit(u.n - 1);
    const next = NI.course.unit(u.n + 1);
    const link = (x, dir) =>
      x
        ? '<a class="' + dir + '" href="#unit-' + x.n + '">' + (dir === "prev" ? ui.ICON.arrowL : "") + '<span class="sn-code">' + esc(NI.course.code(x.n)) + '</span><span class="sn-name">' + ui.jp(x.ja, { tokens: false, gaps: false }) + "</span>" + (dir === "next" ? ui.ICON.arrowR : "") + "</a>"
        : '<span class="' + dir + ' end">' + (dir === "prev" ? "Start of the line" : "End of the line") + "</span>";
    return (
      '<header class="sign line-' + line.color + '">' +
      '<div class="sign-top">' + ui.stationCode(u.n) + '<span class="sign-line">' + ui.jp(line.ja, { tokens: false }) + " · " + esc(line.en) + "</span></div>" +
      '<h1 class="sign-name">' + ui.jp(u.ja, { tokens: false, gaps: true }) + "</h1>" +
      '<p class="sign-en">' + esc(u.en) + "</p>" +
      '<div class="sign-band" aria-hidden="true"></div>' +
      '<nav class="sign-nav" aria-label="Neighbouring units">' + link(prev, "prev") + link(next, "next") + "</nav>" +
      "</header>"
    );
  }

  function wordRow(w) {
    return (
      '<li class="w-row">' +
      '<div class="w-jp">' + ui.em(w) + ui.wordHead(w, { tokens: false }) + "</div>" +
      '<div class="w-en"><span class="w-mean">' + esc(w.en) + "</span> " + ui.posTag(w) + (w.note ? '<span class="w-note">' + esc(w.note) + "</span>" : "") + "</div>" +
      '<div class="w-side">' + ui.say(ui.wordAudio(w), w.r) + tierBadge(w.id) + "</div>" +
      "</li>"
    );
  }

  function wordList(words) {
    return '<ul class="wordlist">' + words.map(wordRow).join("") + "</ul>";
  }

  const tools = (jp, en) => '<span class="s-tools">' + ui.say(ui.sentenceAudio(jp)) + ui.breakdownBtn(jp, en) + "</span>";

  function sentenceList(list) {
    return (
      '<ol class="sentences">' +
      list.map((s) => '<li><div class="s-jp">' + ui.jp(s.jp) + tools(s.jp, s.en) + '</div><p class="en">' + esc(s.en) + "</p>" + (s.note ? '<p class="s-note">' + esc(s.note) + "</p>" : "") + "</li>").join("") +
      "</ol>"
    );
  }

  function examples(ex) {
    if (!ex || !ex.length) return "";
    return '<ul class="examples">' + ex.map(([jp, en]) => '<li><div class="s-jp">' + ui.jp(jp) + tools(jp, en) + '</div><p class="en">' + esc(en) + "</p></li>").join("") + "</ul>";
  }

  /* Reading aids: switches for word meanings under the text and particle
     colours. They only toggle classes, so the page doesn't reload. */
  function aids(extra) {
    const s = NI.store.settings;
    const chip = (key, label, title) =>
      '<button class="chip aid' + (s[key] ? " on" : "") + '" type="button" data-aid="' + key + '" aria-pressed="' + !!s[key] + '" title="' + esc(title) + '">' + label + "</button>";
    return (
      '<div class="aids" role="group" aria-label="Reading aids"><span class="aids-label">Reading aids</span>' +
      chip("gloss", "Aa Word meanings", "Show the English meaning under each Japanese word") +
      chip("particles", '<span class="pdot" aria-hidden="true"></span>Particle colours', "Colour-code particles: は topic, が subject, を object …") +
      chip("furiOff", "Hide furigana", "Hide readings above kanji (tap a word to see it)") +
      (extra || "") +
      "</div>"
    );
  }

  function bindAids(scope) {
    scope.querySelectorAll("[data-aid]").forEach((b) =>
      b.addEventListener("click", () => {
        const key = b.getAttribute("data-aid");
        const s = NI.store.settings;
        if (key === "furiOff") {
          const next = s.furigana === "hover" ? "furigana" : "hover";
          NI.store.set("furigana", next, true);
        } else NI.store.set(key, !s[key], true);
        NI.app.applySettings();
        const on = key === "furiOff" ? NI.store.settings.furigana === "hover" : !!NI.store.settings[key];
        scope.querySelectorAll('[data-aid="' + key + '"]').forEach((x) => {
          x.classList.toggle("on", on);
          x.setAttribute("aria-pressed", on);
        });
      })
    );
    scope.querySelectorAll('[data-aid="furiOff"]').forEach((x) => {
      const on = NI.store.settings.furigana === "hover";
      x.classList.toggle("on", on);
      x.setAttribute("aria-pressed", on);
    });
  }

  // ---------------------------------------------------------------------------
  // Line player: plays items in order; in shadow mode it leaves a pause after
  // each line for the learner to repeat it aloud.

  let playing = null;

  function stopPlayer() {
    if (playing) {
      playing.cancelled = true;
      if (playing.timer) clearTimeout(playing.timer);
      if (playing.onStop) playing.onStop();
      playing = null;
    }
    NI.speech.stop();
    document.querySelectorAll(".playing, .your-turn").forEach((x) => x.classList.remove("playing", "your-turn"));
  }

  /* items: [{ el, text, pitch }]; opts: { shadow, onDone, onStop } */
  function playLines(items, opts) {
    stopPlayer();
    const o = opts || {};
    const job = { cancelled: false, onStop: o.onStop };
    playing = job;
    let k = 0;
    const rate = Number(NI.store.settings.rate) || 0.9;
    const step = () => {
      if (job.cancelled) return;
      document.querySelectorAll(".playing, .your-turn").forEach((x) => x.classList.remove("playing", "your-turn"));
      if (k >= items.length) {
        playing = null;
        if (o.onDone) o.onDone();
        if (o.onStop) o.onStop();
        return;
      }
      const it = items[k++];
      if (it.el) {
        it.el.classList.add("playing");
        it.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      const ok = NI.speech.speak(it.text, {
        pitch: it.pitch,
        onend: () => {
          if (job.cancelled) return;
          if (!o.shadow) {
            job.timer = setTimeout(step, 350);
            return;
          }
          // Your turn: about as long as the line took, plus a breath.
          const ms = Math.max(1600, Math.min(7000, (it.text.length * 230) / rate + 700));
          if (it.el) {
            it.el.classList.remove("playing");
            it.el.classList.add("your-turn");
            it.el.style.setProperty("--turn", ms + "ms");
          }
          job.timer = setTimeout(step, ms);
        },
      });
      if (!ok) stopPlayer();
    };
    step();
    return job;
  }

  // ---------------------------------------------------------------------------
  // Conversation

  const PITCH = [1.0, 1.28, 0.82, 1.12];

  function playerButtons() {
    if (!NI.speech.supported) return "";
    return (
      '<button class="btn small" type="button" data-play>' + ui.ICON.play + "<span>Play all</span></button>" +
      '<button class="btn small ghost" type="button" data-shadow title="Listen to each line, then repeat it in the pause">' + ui.ICON.repeat + "<span>Shadow</span></button>"
    );
  }

  function dialogue(u, opts) {
    const d = u.dialogue;
    const o = opts || {};
    const castKeys = Object.keys(d.cast);
    const lines = d.lines
      .map((l, i) => {
        if (l.who === "*") return '<li class="dlg-narr">' + esc(l.en) + "</li>";
        const who = d.cast[l.who];
        const side = castKeys.indexOf(l.who) % 2 === 0 ? "l" : "r";
        return (
          '<li class="dlg-line side-' + side + " sp-" + castKeys.indexOf(l.who) + '" data-line="' + i + '">' +
          '<span class="who">' + ui.jp(who.ja, { tokens: false, gaps: false }) + '<span class="who-en">' + esc(who.en) + "</span></span>" +
          '<div class="bubble"><div class="b-jp">' + ui.jp(l.jp) + '</div><p class="en">' + esc(l.en) + "</p></div>" +
          '<span class="dlg-tools">' + ui.say(ui.sentenceAudio(l.jp), null, "small") + ui.breakdownBtn(l.jp, l.en) + "</span>" +
          "</li>"
        );
      })
      .join("");
    return (
      '<div class="dialogue' + (d.chat ? " chat" : "") + (o.hideEn ? " hide-en" : "") + '">' +
      '<div class="dlg-head"><h3>' + esc(d.title) + "</h3>" + (d.setting ? '<p class="setting">' + esc(d.setting) + "</p>" : "") +
      '<div class="row wrap">' + playerButtons() +
      '<button class="btn small ghost" type="button" data-dlg-en aria-pressed="' + (o.hideEn ? "false" : "true") + '">' + (o.hideEn ? "Show English" : "Hide English") + "</button>" +
      (o.roleplay && NI.roleplay && NI.roleplay.roles(u).length ? '<a class="btn small ghost" href="#roleplay-' + u.n + '"><span aria-hidden="true">🎭</span><span>Role-play</span></a>' : "") +
      "</div></div>" +
      '<ol class="dlg-lines">' + lines + "</ol></div>"
    );
  }

  /* Wires Play / Shadow / Hide English for a block of lines.
     items() returns the player items; onShadowDone runs after a full shadow. */
  function bindPlayer(box, items, onShadowDone) {
    const play = box.querySelector("[data-play]");
    const shadow = box.querySelector("[data-shadow]");
    const reset = () => {
      if (play) play.innerHTML = ui.ICON.play + "<span>Play all</span>";
      if (shadow) shadow.innerHTML = ui.ICON.repeat + "<span>Shadow</span>";
      box.classList.remove("shadowing");
    };
    const start = (isShadow, btn) => {
      if (playing) {
        stopPlayer();
        return;
      }
      btn.innerHTML = ui.ICON.stop + "<span>Stop</span>";
      box.classList.toggle("shadowing", isShadow);
      playLines(items(), { shadow: isShadow, onStop: reset, onDone: isShadow ? onShadowDone : null });
    };
    if (play) play.addEventListener("click", () => start(false, play));
    if (shadow) shadow.addEventListener("click", () => start(true, shadow));
    const enBtn = box.querySelector("[data-dlg-en]");
    if (enBtn)
      enBtn.addEventListener("click", () => {
        const hidden = box.classList.toggle("hide-en");
        enBtn.textContent = hidden ? "Show English" : "Hide English";
        enBtn.setAttribute("aria-pressed", hidden ? "false" : "true");
      });
  }

  function shadowDone() {
    NI.store.log("sh", 1);
    NI.fx.gain(10);
    ui.toast("Nice shadowing! +10 XP");
  }

  function bindDialogue(scope, u) {
    const box = scope.querySelector(".dialogue");
    if (!box) return;
    const d = u.dialogue;
    const castKeys = Object.keys(d.cast);
    bindPlayer(
      box,
      () =>
        d.lines
          .map((l, i) => ({ l, i }))
          .filter((x) => x.l.who !== "*")
          .map(({ l, i }) => ({ el: box.querySelector('[data-line="' + i + '"]'), text: ui.sentenceAudio(l.jp), pitch: PITCH[castKeys.indexOf(l.who) % PITCH.length] })),
      shadowDone
    );
  }

  NI.views = { sign, wordList, wordRow, sentenceList, examples, dialogue, bindDialogue, bindPlayer, playLines, playerButtons, shadowDone, stopDialogue: stopPlayer, stopPlayer, tierBadge, aids, bindAids };
})(typeof window !== "undefined" ? window : globalThis);
