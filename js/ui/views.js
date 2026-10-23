/* Reusable views: station sign, word list, sentence list and the
   conversation player. */
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
      '<div class="w-jp">' + ui.wordHead(w, { tokens: false }) + "</div>" +
      '<div class="w-en"><span class="w-mean">' + esc(w.en) + "</span> " + ui.posTag(w) + (w.note ? '<span class="w-note">' + esc(w.note) + "</span>" : "") + "</div>" +
      '<div class="w-side">' + ui.say(ui.wordAudio(w), w.r) + tierBadge(w.id) + "</div>" +
      "</li>"
    );
  }

  function wordList(words) {
    return '<ul class="wordlist">' + words.map(wordRow).join("") + "</ul>";
  }

  function sentenceList(list) {
    return (
      '<ol class="sentences">' +
      list.map((s) => '<li><div class="s-jp">' + ui.jp(s.jp) + ui.say(ui.sentenceAudio(s.jp)) + '</div><p class="en">' + esc(s.en) + "</p>" + (s.note ? '<p class="s-note">' + esc(s.note) + "</p>" : "") + "</li>").join("") +
      "</ol>"
    );
  }

  function examples(ex) {
    if (!ex || !ex.length) return "";
    return '<ul class="examples">' + ex.map(([jp, en]) => '<li><div class="s-jp">' + ui.jp(jp) + ui.say(ui.sentenceAudio(jp)) + '</div><p class="en">' + esc(en) + "</p></li>").join("") + "</ul>";
  }

  // ---------------------------------------------------------------------------
  // Conversation

  const PITCH = [1.0, 1.28, 0.82, 1.12];

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
          ui.say(ui.sentenceAudio(l.jp), null, "small") +
          "</li>"
        );
      })
      .join("");
    return (
      '<div class="dialogue' + (d.chat ? " chat" : "") + (o.hideEn ? " hide-en" : "") + '">' +
      '<div class="dlg-head"><h3>' + esc(d.title) + "</h3>" + (d.setting ? '<p class="setting">' + esc(d.setting) + "</p>" : "") +
      '<div class="row wrap">' +
      (NI.speech.supported ? '<button class="btn small" type="button" data-dlg-play>' + ui.ICON.play + "<span>Play conversation</span></button>" : "") +
      '<button class="btn small ghost" type="button" data-dlg-en aria-pressed="' + (o.hideEn ? "false" : "true") + '">' + (o.hideEn ? "Show English" : "Hide English") + "</button>" +
      "</div></div>" +
      '<ol class="dlg-lines">' + lines + "</ol></div>"
    );
  }

  let playing = null;

  function stopDialogue() {
    if (playing) {
      playing.cancelled = true;
      playing = null;
    }
    NI.speech.stop();
    document.querySelectorAll(".dlg-line.playing").forEach((x) => x.classList.remove("playing"));
    document.querySelectorAll("[data-dlg-play]").forEach((b) => {
      b.innerHTML = ui.ICON.play + "<span>Play conversation</span>";
      b.setAttribute("aria-pressed", "false");
    });
  }

  function bindDialogue(scope, u) {
    const box = scope.querySelector(".dialogue");
    if (!box) return;
    const d = u.dialogue;
    const castKeys = Object.keys(d.cast);
    const enBtn = box.querySelector("[data-dlg-en]");
    enBtn.addEventListener("click", () => {
      const hidden = box.classList.toggle("hide-en");
      enBtn.textContent = hidden ? "Show English" : "Hide English";
      enBtn.setAttribute("aria-pressed", hidden ? "false" : "true");
    });
    const play = box.querySelector("[data-dlg-play]");
    if (!play) return;
    play.addEventListener("click", () => {
      if (playing) {
        stopDialogue();
        return;
      }
      const job = { cancelled: false };
      playing = job;
      play.innerHTML = ui.ICON.stop + "<span>Stop</span>";
      play.setAttribute("aria-pressed", "true");
      const order = d.lines.map((l, i) => ({ l, i })).filter((x) => x.l.who !== "*");
      let k = 0;
      const step = () => {
        if (job.cancelled) return;
        box.querySelectorAll(".dlg-line.playing").forEach((x) => x.classList.remove("playing"));
        if (k >= order.length) {
          stopDialogue();
          return;
        }
        const { l, i } = order[k++];
        const li = box.querySelector('[data-line="' + i + '"]');
        if (li) {
          li.classList.add("playing");
          li.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        const ok = NI.speech.speak(ui.sentenceAudio(l.jp), {
          pitch: PITCH[castKeys.indexOf(l.who) % PITCH.length],
          onend: () => setTimeout(step, 350),
        });
        if (!ok) stopDialogue();
      };
      step();
    });
  }

  NI.views = { sign, wordList, wordRow, sentenceList, examples, dialogue, bindDialogue, stopDialogue, tierBadge };
})(typeof window !== "undefined" ? window : globalThis);
