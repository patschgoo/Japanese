/* Sentence breakdown: any sentence, word by word. Shows each phrase, the words
   in it with reading, meaning and grammar, a literal word-by-word line, slow
   audio, and a recorder to compare your own voice with the model. Recordings
   stay in memory on this device and are never uploaded. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const doc = root.document;
  const ui = NI.ui;
  const esc = ui.esc;

  const PARTICLE_NAMES = {
    wa: ["は", "topic: what the sentence is about"], ga: ["が", "subject: who or what does it / is it"], o: ["を", "object: what the action is done to"],
    ni: ["に", "target: to, at (a time), into"], e: ["へ", "direction: toward"], de: ["で", "place of action, or means: at, by, in"],
    to: ["と", "and, with"], mo: ["も", "also, too"], no: ["の", "links nouns: ’s, of"], ka: ["か", "question"],
    kara: ["から", "from; after a sentence: because"], made: ["まで", "until, as far as"], yori: ["より", "than"], ne: ["ね", "right? (seeks agreement)"], yo: ["よ", "you know (tells something new)"],
  };

  function wordInfo(entry) {
    if (!entry) return { meaning: "(not in this course yet)", extra: "" };
    if (entry.kind === "number") return { meaning: entry.s, extra: "number" };
    const pid = NI.lex.particleId(entry);
    if (pid) return { meaning: PARTICLE_NAMES[pid][1], extra: "particle", pid };
    if (entry.kind === "grammar") return { meaning: entry.en, extra: entry.pos };
    if (entry.kind === "name") return { meaning: entry.en, extra: "name" };
    const w = NI.course.get(entry.id);
    let extra = w ? NI.course.posLabel(w.pos) : "";
    if (entry.kind === "form" && entry.form !== "noun") extra = (NI.conj.LABELS[entry.form] || entry.form) + (w ? " of " + NI.furi.base(w.head) : "");
    return { meaning: entry.en, extra, em: w && w.em };
  }

  function analyse(markup) {
    const toks = NI.lex.tokens(markup);
    const tiles = NI.furi.parse(markup);
    return tiles.map((atoms, ti) => {
      const words = toks
        .filter((t) => t.tile === ti && !(t.entry && t.entry.kind === "punct"))
        .map((t) => {
          const m = t.atoms.map((a) => (a.r == null ? a.b : "{" + a.b + "|" + a.r + "}")).join("");
          return { markup: m, base: NI.furi.base(m), reading: NI.furi.readingOfAtoms(t.atoms), entry: t.entry, gloss: t.entry ? NI.lex.gloss(t.entry) : "?", info: wordInfo(t.entry), unknown: !t.entry && !t.foreign };
        });
      return { markup: atoms.map((a) => (a.r == null ? a.b : "{" + a.b + "|" + a.r + "}")).join(""), words };
    });
  }

  // ---------------------------------------------------------------------------
  // Recorder (MediaRecorder; optional)

  let rec = null;
  const canRecord = () => !!(root.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  function stopRec() {
    if (rec && rec.mr && rec.mr.state !== "inactive") rec.mr.stop();
    if (rec && rec.stream) rec.stream.getTracks().forEach((t) => t.stop());
  }

  function bindRecorder(box, text) {
    const btn = box.querySelector("[data-rec]");
    const mine = box.querySelector("[data-mine]");
    const both = box.querySelector("[data-both]");
    const status = box.querySelector(".rec-status");
    if (!btn) return;
    let url = null;
    btn.addEventListener("click", async () => {
      if (rec && rec.mr && rec.mr.state === "recording") {
        stopRec();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks = [];
        const mr = new MediaRecorder(stream);
        rec = { mr, stream };
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || "audio/webm" }));
          btn.classList.remove("recording");
          btn.innerHTML = ui.ICON.mic + "<span>Record again</span>";
          mine.disabled = false;
          both.disabled = false;
          status.textContent = "Recorded. Compare your voice with the model.";
        };
        mr.start();
        btn.classList.add("recording");
        btn.innerHTML = ui.ICON.stop + "<span>Stop</span>";
        status.textContent = "Recording… say the sentence, then press Stop.";
        setTimeout(() => mr.state === "recording" && stopRec(), 12000);
      } catch (e) {
        status.textContent = "The microphone isn't available here (permission refused or not supported).";
        btn.disabled = true;
      }
    });
    const playMine = (then) => {
      if (!url) return;
      const a = new Audio(url);
      a.onended = then || null;
      a.play().catch(() => (status.textContent = "Couldn't play the recording."));
    };
    mine.addEventListener("click", () => playMine());
    both.addEventListener("click", () => NI.speech.speak(text, { onend: () => setTimeout(() => playMine(), 300) }));
  }

  // ---------------------------------------------------------------------------

  function open(markup, en) {
    const m = doc.getElementById("modal");
    if (!m || !markup) return;
    ui.hidePop();
    const tiles = analyse(markup);
    const text = ui.sentenceAudio(markup);
    const literal = tiles.map((t) => t.words.map((w) => w.gloss).join(" · ")).join("  |  ");
    const used = new Set();
    tiles.forEach((t) => t.words.forEach((w) => w.info.pid && used.add(w.info.pid)));
    const unknown = tiles.some((t) => t.words.some((w) => w.unknown));
    const audio = NI.speech.supported
      ? '<div class="row wrap center">' +
        '<button class="btn small" type="button" data-say="' + esc(text) + '">' + ui.ICON.speaker + "<span>Listen</span></button>" +
        '<button class="btn small ghost" type="button" data-slow>' + ui.ICON.turtle + "<span>Slowly</span></button></div>"
      : "";
    m.innerHTML =
      '<div class="modal-card bd-card" role="dialog" aria-modal="true" aria-labelledby="bd-title">' +
      '<div class="bd-head"><h2 id="bd-title">Sentence breakdown <span class="muted">' + ui.jp("{分解|ぶんかい}", { tokens: false }) + "</span></h2>" +
      '<button class="icon-btn" type="button" data-bd-close aria-label="Close">' + ui.ICON.close + "</button></div>" +
      '<div class="bd-sentence">' + ui.jp(markup) + "</div>" +
      (en ? '<p class="bd-en">' + esc(en) + "</p>" : "") +
      audio +
      '<p class="bd-literal"><b>Word by word:</b> ' + esc(literal) + "</p>" +
      '<ol class="bd-tiles">' +
      tiles
        .map(
          (t, i) =>
            '<li class="bd-tile"><div class="bd-tile-head"><span class="bd-n">' + (i + 1) + "</span>" + ui.jp(t.markup, { tokens: false, gaps: false }) + "</div>" +
            '<ul class="bd-words">' +
            t.words
              .map(
                (w) =>
                  '<li class="bd-word' + (w.info.pid ? " is-particle" : "") + (w.unknown ? " is-unknown" : "") + '"' + (w.info.pid ? ' data-p="' + w.info.pid + '"' : "") + ">" +
                  '<span class="bd-jp">' + (w.info.em ? '<span class="em" aria-hidden="true">' + w.info.em + "</span>" : "") + ui.jp(w.markup, { tokens: false, gaps: false }) + "</span>" +
                  (w.reading !== w.base ? '<span class="bd-read" lang="ja">' + esc(w.reading) + "</span>" : "") +
                  '<span class="bd-mean">' + esc(w.info.meaning) + (w.info.extra ? ' <span class="bd-extra">' + esc(w.info.extra) + "</span>" : "") + "</span>" +
                  (NI.speech.supported ? ui.say(w.reading, w.reading, "small") : "") +
                  "</li>"
              )
              .join("") +
            "</ul></li>"
        )
        .join("") +
      "</ol>" +
      (used.size
        ? '<div class="bd-legend"><b>Particle colours</b>' + Array.from(used).map((p) => '<span class="bd-key" data-p="' + p + '"><b lang="ja">' + PARTICLE_NAMES[p][0] + "</b> " + esc(PARTICLE_NAMES[p][1]) + "</span>").join("") + "</div>"
        : "") +
      (unknown ? '<p class="small muted">Words in grey aren’t taught in this course yet. <a href="https://jisho.org/search/' + encodeURIComponent(NI.furi.base(markup)) + '" target="_blank" rel="noopener">Look them up on Jisho ↗</a></p>' : "") +
      ((canRecord() && NI.speech.supported) || NI.speech.canRecognize
        ? '<div class="bd-rec"><b>Say it yourself</b>' +
          (canRecord() && NI.speech.supported
            ? '<p class="small muted">Record yourself, then compare with the model. The recording stays on this device.</p>' +
              '<div class="row wrap"><button class="btn small" type="button" data-rec>' + ui.ICON.mic + "<span>Record</span></button>" +
              '<button class="btn small ghost" type="button" data-mine disabled>' + ui.ICON.play + "<span>My voice</span></button>" +
              '<button class="btn small ghost" type="button" data-both disabled>' + ui.ICON.repeat + "<span>Model, then me</span></button></div>" +
              '<p class="rec-status small" aria-live="polite"></p>'
            : "") +
          NI.speakCheck.block() +
          "</div>"
        : "") +
      "</div>";
    m.hidden = false;
    m.classList.add("wide");
    const close = () => {
      stopRec();
      NI.speech.stop();
      m.hidden = true;
      m.classList.remove("wide");
      m.innerHTML = "";
      doc.removeEventListener("keydown", onKey, true);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    doc.addEventListener("keydown", onKey, true);
    m.onclick = (e) => {
      if (e.target === m || e.target.closest("[data-bd-close]")) close();
    };
    const slow = m.querySelector("[data-slow]");
    if (slow) slow.addEventListener("click", () => NI.speech.speak(text, { rate: 0.6 }));
    bindRecorder(m, text);
    NI.speakCheck.bind(m, markup);
    m.querySelector("[data-bd-close]").focus();
    NI.store.log("bd", 1);
  }

  NI.breakdown = { open, analyse };
})(typeof window !== "undefined" ? window : globalThis);
