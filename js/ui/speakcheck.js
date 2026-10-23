/* Pronunciation check with the browser's speech recognition: say a sentence
   and see what was heard, with the sounds that were missed marked. Explicit
   feedback like this is what makes speech-recognition practice work best. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;

  const NOTE = "This uses your browser’s speech recognition, which may send the audio to its provider (such as Google or Apple) to turn it into text.";
  const ERRORS = {
    "not-allowed": "Microphone access is blocked. Allow it in your browser’s site settings to use this.",
    "service-not-allowed": "Speech recognition isn’t available in this browser.",
    "no-speech": "I didn’t hear anything. Try again, a little closer to the microphone.",
    "audio-capture": "No microphone was found.",
    network: "Speech recognition needs an internet connection.",
  };

  // { score 0–1, heard, marks: [{ ch, ok }] } for the best of the transcripts.
  function score(markup, texts) {
    const want = NI.kana.fold(NI.furi.reading(markup));
    const written = NI.kana.fold(NI.furi.base(markup));
    let best = { score: 0, heard: texts[0] || "", kana: "" };
    for (const t of texts) {
      const kana = NI.lex.kanaOf(t);
      const s = Math.max(NI.util.similarity(want, kana), NI.util.similarity(written, NI.kana.fold(t)));
      if (s > best.score) best = { score: s, heard: t, kana };
    }
    best.marks = NI.util.align(want, best.kana);
    return best;
  }

  // A check button with its result area, or "" where recognition isn't supported.
  function block(label) {
    if (!NI.speech.canRecognize) return "";
    return (
      '<div class="asr"><button class="btn small" type="button" data-asr>' + ui.ICON.mic + "<span>" + esc(label || "Check my pronunciation") + "</span></button>" +
      '<div class="asr-out" aria-live="polite"></div></div>'
    );
  }

  function verdict(s) {
    if (s >= 0.9) return ["good", ui.jp("{完璧|かんぺき}！", { tokens: false }) + " Spot on."];
    if (s >= 0.7) return ["close", "Close! Listen to the model once more, then try again."];
    return ["try", "Not quite yet. Listen, then try it slowly."];
  }

  /* Wires the [data-asr] button inside scope to check markup. onScore(s) runs
     after each attempt with the score from 0 to 1. */
  function bind(scope, markup, onScore) {
    const btn = scope.querySelector("[data-asr]");
    if (!btn) return;
    const out = btn.parentElement.querySelector(".asr-out");
    const label = btn.querySelector("span").textContent;
    let noted = false;
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.classList.add("listening");
      btn.querySelector("span").textContent = "Listening… say it now";
      if (!noted) {
        out.innerHTML = '<p class="small muted">' + esc(NOTE) + "</p>";
        noted = true;
      }
      NI.speech.recognize((res) => {
        btn.disabled = false;
        btn.classList.remove("listening");
        btn.querySelector("span").textContent = label === "Check my pronunciation" ? "Try again" : label;
        if (res.error || !res.texts.length) {
          out.innerHTML = '<p class="asr-msg">' + esc(ERRORS[res.error] || ERRORS["no-speech"]) + "</p>";
          return;
        }
        const r = score(markup, res.texts);
        const [cls, text] = verdict(r.score);
        if (r.score >= 0.9) NI.store.log("ag", 1);
        out.innerHTML =
          '<p class="asr-verdict ' + cls + '"><b>' + Math.round(r.score * 100) + "%</b> " + text + "</p>" +
          '<p class="asr-heard small">I heard: <span lang="ja">' + esc(r.heard) + "</span></p>" +
          (r.score < 1
            ? '<p class="asr-marks" lang="ja" aria-label="Sounds you said are plain, missed ones are marked">' + r.marks.map((m) => (m.ok ? esc(m.ch) : '<mark title="missed">' + esc(m.ch) + "</mark>")).join("") + "</p>"
            : "");
        if (onScore) onScore(r.score);
      });
    });
  }

  NI.speakCheck = { block, bind, score };
})(typeof window !== "undefined" ? window : globalThis);
