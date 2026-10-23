/* Listen on the go: hands-free audio of words and sentences for walking,
   commuting or chores. Each item plays in Japanese, leaves a pause to recall
   the meaning (or, English first, to say it in Japanese), then gives the
   answer. The screen stays awake while it plays, where the browser allows. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const pages = (NI.pages = NI.pages || {});

  const reached = () => {
    const step = NI.nextStep();
    return step ? Math.max(1, step.u.n) : NI.course.units.length;
  };

  // Where the items come from: "rev", "w:3", "s:3", "d:3" or "t:h1".
  function sources() {
    const r = reached();
    const out = [];
    if (Object.keys(NI.store.state.srs).length) out.push(["rev", "Your review cards (weakest first)"]);
    for (const u of NI.course.units) {
      if (u.n > r) break;
      out.push(["w:" + u.n, NI.course.code(u.n) + " words · " + u.en]);
      out.push(["s:" + u.n, NI.course.code(u.n) + " sentences · " + u.en]);
      if (u.dialogue) out.push(["d:" + u.n, NI.course.code(u.n) + " conversation · " + u.dialogue.title]);
    }
    for (const st of NI.course.stories) if (st.unit <= Math.max(r, 5)) out.push(["t:" + st.id, "Story · " + st.en]);
    return out;
  }

  const wordItem = (w) => ({ jp: w.head, audio: ui.wordAudio(w), en: w.en });
  const lineItem = (l) => ({ jp: l.jp, audio: ui.sentenceAudio(l.jp), en: l.en });

  function items(src) {
    const [kind, arg] = src.split(":");
    if (kind === "rev") {
      const srs = NI.store.state.srs;
      return Object.keys(srs)
        .map((id) => [id, NI.items.get(id)])
        .filter(([, it]) => it && (it.kind === "word" || it.jp))
        .sort((a, b) => (srs[a[0]].st || 0) - (srs[b[0]].st || 0))
        .slice(0, 30)
        .map(([, it]) => (it.kind === "word" ? wordItem(it) : lineItem(it)));
    }
    if (kind === "t") {
      const st = NI.course.story(arg);
      return st ? st.lines.map(lineItem) : [];
    }
    const u = NI.course.unit(arg);
    if (!u) return [];
    if (kind === "w") return u.words.filter((w) => w.en).map(wordItem);
    if (kind === "s") return u.sentences.map(lineItem);
    if (kind === "d" && u.dialogue) return u.dialogue.lines.filter((l) => l.jp).map(lineItem);
    return [];
  }

  pages.listen = {
    title: "Listen on the go",
    nav: "play",
    render() {
      const s = NI.store.state.intro.listen || {};
      const list = sources();
      const radio = (name, v, cur, label, desc) =>
        '<label class="radio"><input type="radio" name="' + name + '" value="' + v + '"' + (String(cur) === String(v) ? " checked" : "") + "><span><b>" + label + "</b>" + (desc ? "<small>" + desc + "</small>" : "") + "</span></label>";
      return (
        '<header class="page-head"><h1>Listen on the go <span class="sub">' + ui.jp("{聞|き}き{流|なが}し", { tokens: false }) + "</span></h1>" +
        "<p>Hands-free practice for walking, commuting or doing the dishes. Each word or sentence plays in Japanese, then a pause for you to recall it, then the answer.</p></header>" +
        (NI.speech.canListen
          ? '<section class="u-sec ls-setup">' +
            '<label for="ls-src">What to listen to</label><select id="ls-src">' +
            list.map(([v, t]) => '<option value="' + esc(v) + '"' + (s.src === v ? " selected" : "") + ">" + esc(t) + "</option>").join("") +
            "</select>" +
            '<fieldset><legend>Order</legend>' +
            radio("ls-order", "jp", s.order || "jp", "Japanese first", "Hear it, recall the meaning, then hear the English") +
            radio("ls-order", "en", s.order || "jp", "English first", "Hear the English, say it in Japanese, then hear the answer") +
            "</fieldset>" +
            '<fieldset><legend>Pause to answer</legend><div class="seg-row">' +
            radio("ls-pause", 2, s.pause || 4, "2 s") + radio("ls-pause", 4, s.pause || 4, "4 s") + radio("ls-pause", 6, s.pause || 4, "6 s") +
            "</div></fieldset>" +
            '<label class="toggle"><input type="checkbox" id="ls-twice"' + (s.twice !== false ? " checked" : "") + "><span><b>Japanese twice</b><small>Hear each Japanese item a second time at the end</small></span></label>" +
            '<label class="toggle"><input type="checkbox" id="ls-shuffle"' + (s.shuffle ? " checked" : "") + "><span><b>Shuffle</b></span></label>" +
            '<div class="row"><button class="btn primary big" type="button" data-ls-start>' + ui.ICON.play + "<span>Start listening</span></button></div></section>" +
            '<section class="ls-player" hidden aria-live="polite">' +
            '<p class="ls-count small muted"></p><div class="ls-jp"></div><p class="ls-en"></p><p class="ls-step small muted"></p>' +
            '<div class="row center wrap ls-ctl">' +
            '<button class="btn ghost" type="button" data-ls="prev" aria-label="Previous">⏮</button>' +
            '<button class="btn primary" type="button" data-ls="pause">Pause</button>' +
            '<button class="btn ghost" type="button" data-ls="next" aria-label="Next">⏭</button>' +
            '<button class="btn ghost" type="button" data-ls="stop">Stop</button></div>' +
            '<label class="toggle center-toggle"><input type="checkbox" id="ls-text" checked><span><b>Show the text</b><small>Turn off to practise by ear only</small></span></label>' +
            "</section>"
          : '<p class="note">This needs a Japanese voice on your device. Options → Audio explains how to add one.</p>')
      );
    },
    mount(el) {
      const start = el.querySelector("[data-ls-start]");
      if (!start) return;
      const setup = el.querySelector(".ls-setup");
      const player = el.querySelector(".ls-player");
      const $ = (sel) => el.querySelector(sel);
      let list = [];
      let i = 0;
      let run = 0; // bumps on every stop/skip so stale callbacks do nothing
      let paused = false;
      let heard = 0;
      let lock = null;
      let o = {};

      const wake = async () => {
        try {
          if (navigator.wakeLock && !lock) lock = await navigator.wakeLock.request("screen");
        } catch (e) {
          lock = null;
        }
      };
      const sleep = () => {
        if (lock) lock.release().catch(() => {});
        lock = null;
      };
      const onVis = () => {
        if (document.visibilityState === "visible" && player && !player.hidden && !paused) wake();
      };
      document.addEventListener("visibilitychange", onVis);

      function show(it) {
        $(".ls-count").textContent = i + 1 + " / " + list.length;
        $(".ls-jp").innerHTML = ui.jp(it.jp, { tokens: false });
        $(".ls-en").textContent = it.en;
        // Whatever you're asked to recall stays hidden until it's spoken.
        $(".ls-en").hidden = o.order === "jp";
        $(".ls-jp").hidden = o.order === "en";
      }

      // Runs the steps of one item: speech and pauses, then the next item.
      function playItem() {
        const my = ++run;
        if (i >= list.length) return done();
        const it = list[i];
        show(it);
        const say = (text, cb) => NI.speech.speak(text, { onend: () => my === run && cb() }) || cb();
        const sayEn = (text, cb) => NI.speech.speakEn(text, { onend: () => my === run && cb() }) || cb();
        const wait = (ms, cb) => setTimeout(() => my === run && cb(), ms);
        const step = (t) => ($(".ls-step").textContent = t);
        const pause = o.pause * 1000;
        const end = () => {
          heard++;
          NI.store.log("ls", 1);
          wait(700, () => {
            i++;
            playItem();
          });
        };
        const reveal = () => ($(".ls-en").hidden = false);
        if (o.order === "jp") {
          step("Listen…");
          say(it.audio, () => {
            step("What does it mean?");
            wait(pause, () => {
              reveal();
              step("");
              sayEn(it.en, () => (o.twice ? wait(400, () => say(it.audio, end)) : end()));
            });
          });
        } else {
          step("How do you say it in Japanese?");
          sayEn(it.en, () =>
            wait(pause, () => {
              step("");
              $(".ls-jp").hidden = false;
              say(it.audio, () => (o.twice ? wait(500, () => say(it.audio, end)) : end()));
            })
          );
        }
      }

      function stop() {
        run++;
        NI.speech.stop();
        sleep();
        if (heard) NI.fx.gain(heard * NI.game.XP.listen);
        if (heard) ui.toast("Listened to " + U.plural(heard, "item") + ". +" + heard * NI.game.XP.listen + " XP");
        heard = 0;
        player.hidden = true;
        setup.hidden = false;
      }

      function done() {
        $(".ls-step").textContent = "All done! お疲れ様でした。";
        NI.fx.play("chime");
        setTimeout(stop, 1200);
      }

      start.addEventListener("click", () => {
        o = {
          src: $("#ls-src").value,
          order: el.querySelector('input[name="ls-order"]:checked').value,
          pause: Number(el.querySelector('input[name="ls-pause"]:checked').value),
          twice: $("#ls-twice").checked,
          shuffle: $("#ls-shuffle").checked,
        };
        NI.store.setIntro("listen", o);
        list = items(o.src);
        if (o.shuffle) list = U.shuffle(list);
        if (!list.length) return ui.toast("Nothing to play there yet.");
        i = 0;
        heard = 0;
        paused = false;
        setup.hidden = true;
        player.hidden = false;
        $('[data-ls="pause"]').textContent = "Pause";
        wake();
        playItem();
      });
      el.querySelectorAll("[data-ls]").forEach((b) =>
        b.addEventListener("click", () => {
          const a = b.getAttribute("data-ls");
          if (a === "stop") return stop();
          if (a === "pause") {
            paused = !paused;
            b.textContent = paused ? "Resume" : "Pause";
            if (paused) {
              run++;
              NI.speech.stop();
              sleep();
            } else {
              wake();
              playItem();
            }
            return;
          }
          run++;
          NI.speech.stop();
          i = Math.max(0, Math.min(list.length - 1, i + (a === "next" ? 1 : -1)));
          paused = false;
          $('[data-ls="pause"]').textContent = "Pause";
          playItem();
        })
      );
      $("#ls-text").addEventListener("change", (e) => player.classList.toggle("ear-only", !e.target.checked));
      this._cleanup = () => {
        document.removeEventListener("visibilitychange", onVis);
        if (!player.hidden) stop();
      };
    },
    unmount() {
      if (this._cleanup) this._cleanup();
      this._cleanup = null;
      NI.speech.stop();
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
