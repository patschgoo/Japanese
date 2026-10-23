/* Write kana by hand: trace a character over a grey guide, or write it from
   memory, then compare with the model. Learners who write new characters by
   hand recognise them better later than those who only type them. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const K = NI.kana;

  const ROUNDS = 10;

  function body() {
    const D = NI.data.kana;
    const kata = !NI.store.settings.kataHelp;
    return (
      "<p>Writing a character by hand helps you remember it far better than only looking at it. Trace the grey guide first; when it feels easy, turn the guide off and write from memory. Stroke order isn’t checked here: the usual rule is top to bottom, left to right.</p>" +
      '<div class="drill-setup write-setup">' +
      '<fieldset><legend>Script</legend>' +
      '<label class="check"><input type="radio" name="wr-script" value="hira"' + (kata ? "" : " checked") + "> hiragana</label>" +
      '<label class="check"><input type="radio" name="wr-script" value="kata"' + (kata ? " checked" : "") + "> katakana</label></fieldset>" +
      '<label for="wr-set">Characters</label><select id="wr-set"><option value="mix">10 at random from the basic 46</option>' +
      D.ROWS.map((r) => '<option value="' + r.id + '">' + esc(r.cells.filter(Boolean).map((c) => c[0]).join(" ")) + "</option>").join("") +
      "</select>" +
      '<label class="toggle"><input type="checkbox" id="wr-guide" checked><span><b>Show a guide to trace</b><small>Turn off to write from memory</small></span></label>' +
      '<button class="btn primary" type="button" data-wr-start>Start writing</button></div>' +
      '<div class="write-box" hidden></div>'
    );
  }

  function pick(set) {
    const D = NI.data.kana;
    const all = D.ROWS.flatMap((r) => r.cells.filter(Boolean));
    if (set === "mix") return U.sample(all, ROUNDS);
    const row = D.ROWS.find((r) => r.id === set);
    return row ? row.cells.filter(Boolean) : U.sample(all, ROUNDS);
  }

  // A drawing pad: pointer strokes on a canvas sized for the screen's pixels.
  function pad(canvas) {
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let strokes = 0;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = root.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(6, r.width / 26);
      ctx.strokeStyle = getComputedStyle(canvas).color;
    };
    fit();
    const at = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      strokes++;
      const [x, y] = at(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.1, y + 0.1);
      ctx.stroke();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      const [x, y] = at(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    });
    const up = () => (drawing = false);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return {
      clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes = 0;
      },
      get strokes() {
        return strokes;
      },
      fit,
    };
  }

  function mount(el) {
    const start = el.querySelector("[data-wr-start]");
    const setup = el.querySelector(".write-setup");
    const box = el.querySelector(".write-box");
    if (!start) return;
    start.addEventListener("click", () => {
      const script = el.querySelector('input[name="wr-script"]:checked').value;
      const guide = el.querySelector("#wr-guide").checked;
      const list = pick(el.querySelector("#wr-set").value).map(([h, ro]) => ({ k: script === "kata" ? K.toKatakana(h) : h, ro }));
      const intro = el.querySelector(".kana-body > p");
      setup.hidden = true;
      if (intro) intro.hidden = true;
      box.hidden = false;
      run(box, list, guide, () => {
        box.hidden = true;
        setup.hidden = false;
        if (intro) intro.hidden = false;
      });
      box.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function run(box, list, guide, back) {
    let i = 0;
    let right = 0;
    box.innerHTML =
      '<div class="w-head"><button class="icon-btn" type="button" data-wr-quit aria-label="Stop">' + ui.ICON.close + '</button><span class="w-count small muted"></span></div>' +
      '<div class="w-prompt"><span class="w-ro"></span><span class="w-say"></span></div>' +
      '<div class="w-pad"><span class="w-guide" lang="ja" aria-hidden="true"></span><canvas aria-label="Writing area: draw the character here"></canvas></div>' +
      '<div class="row center wrap w-btns"></div>';
    const P = pad(box.querySelector("canvas"));
    const g = box.querySelector(".w-guide");
    const btns = box.querySelector(".w-btns");
    box.querySelector("[data-wr-quit]").addEventListener("click", back);

    function show() {
      if (i >= list.length) return finish();
      const it = list[i];
      P.fit();
      P.clear();
      box.querySelector(".w-count").textContent = i + 1 + " / " + list.length;
      box.querySelector(".w-ro").textContent = it.ro;
      box.querySelector(".w-say").innerHTML = ui.say(K.toHiragana(it.k), it.ro);
      g.textContent = it.k;
      g.className = "w-guide" + (guide ? " on" : "");
      btns.innerHTML = '<button class="btn ghost" type="button" data-clear>Clear</button><button class="btn primary" type="button" data-check>Check</button>';
      btns.querySelector("[data-clear]").addEventListener("click", () => P.clear());
      btns.querySelector("[data-check]").addEventListener("click", check);
      if (NI.speech.supported && NI.store.settings.autoplay) NI.speech.speak(K.toHiragana(it.k));
    }

    function check() {
      if (!P.strokes) return ui.toast("Write the character first.");
      g.className = "w-guide model";
      btns.innerHTML = '<span class="small muted">Does yours match the red model?</span><button class="btn ghost" type="button" data-self="0">Not quite</button><button class="btn primary" type="button" data-self="1">I got it</button>';
      btns.querySelectorAll("[data-self]").forEach((b) =>
        b.addEventListener("click", () => {
          const ok = b.getAttribute("data-self") === "1";
          if (ok) right++;
          NI.store.kanaResult(list[i].k, ok);
          NI.store.log("wr", 1);
          NI.fx.play(ok ? "right" : "wrong");
          i++;
          show();
        })
      );
    }

    function finish() {
      const xp = right * NI.game.XP.written;
      const res = NI.fx.gain(xp, { inline: true });
      NI.fx.play("chime");
      box.innerHTML =
        '<div class="finish">' + (right === list.length ? NI.session.hanamaru() : "") + "<h2>" + right + " / " + list.length + "</h2>" +
        "<p>" + (right === list.length ? "Beautiful handwriting!" : "Keep writing: a few characters a day add up.") + (guide ? " Next time, try it without the guide." : "") + "</p>" +
        (xp ? NI.session.xpBlock(res, [["Characters written", xp]]) : "") +
        '<div class="row center wrap"><button class="btn primary" type="button" data-again>Write more</button></div></div>';
      box.querySelector("[data-again]").addEventListener("click", back);
    }

    show();
  }

  NI.kanaWrite = { body, mount };
})(typeof window !== "undefined" ? window : globalThis);
