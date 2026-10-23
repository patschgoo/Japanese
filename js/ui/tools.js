/* Tools: the hub, the Reader & dictionary (any Japanese text, word by word;
   English → Japanese lookup) and the Sentence Maker. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const pages = (NI.pages = NI.pages || {});

  pages.tools = {
    title: "Tools",
    nav: "tools",
    render() {
      const card = (href, icon, t, ja, d) => '<a class="tool-card" href="' + href + '"><span class="g-icon" aria-hidden="true">' + icon + '</span><span class="g-text"><b>' + t + '</b><span class="g-ja">' + ui.jp(ja, { tokens: false }) + "</span><span>" + d + "</span></span></a>";
      return (
        '<header class="page-head"><h1>Tools <span class="sub">' + ui.jp("{道具|どうぐ}", { tokens: false }) + "</span></h1><p>Helpers for reading, translating and making your own sentences.</p></header>" +
        '<div class="game-grid">' +
        card("#reader", "🔎", "Reader & dictionary", "{読|よ}む・{調|しら}べる", "Paste any Japanese to see readings and meanings word by word, and look up English words.") +
        card("#maker", "🛠️", "Sentence Maker", "{文|ぶん}を{作|つく}る", "Pick the pieces, choose polite or casual, past or negative: get a correct sentence with audio.") +
        card("#stories", "📖", "Stories", "{読|よ}み{物|もの}", "Short graded stories with audio, using only words you’ve learned.") +
        card("#phrases", "💬", "Phrasebook", "フレーズ", "Ready-made phrases for restaurants, shops, trains and emergencies.") +
        card("#book", "🔖", "Word book", "{単語帳|たんごちょう}", "Your saved words in lists of your own, words you add yourself, vocabulary tests and flashcards.") +
        card("#vtest", "✍️", "Vocabulary test", "{単語|たんご}テスト", "Test yourself on a list, your saved words, your reviews or any course units.") +
        card("#words", "📚", "Word list", "{単語|たんご}リスト", "Every word in the course, searchable in English, kana or romaji.") +
        card("#grammar", "📐", "Grammar reference", "{文法|ぶんぽう}", "Particles, verb and adjective tables, numbers and counters.") +
        card("#kana", "あ", "Kana trainer", "かな", "Katakana charts and drills, loanwords and look-alike characters.") +
        "</div>"
      );
    },
  };

  // ---------------------------------------------------------------------------
  // Reader & dictionary

  function renderPlain(tokens) {
    let html = "";
    let unk = "";
    const flush = () => {
      if (!unk) return;
      html += '<a class="unk" href="https://jisho.org/search/' + encodeURIComponent(unk) + '" target="_blank" rel="noopener" title="Not in this course yet: look it up on Jisho">' + esc(unk) + "</a>";
      unk = "";
    };
    for (const t of tokens) {
      if (t.unknown) {
        unk += t.text;
        continue;
      }
      flush();
      if (t.punct) {
        html += t.text === "\n" ? "<br>" : esc(t.text);
        continue;
      }
      if (!t.entry) {
        html += esc(t.text);
        continue;
      }
      const e = t.entry;
      const gl = NI.lex.gloss(e);
      const pid = NI.lex.particleId(e);
      // Kanji written as in the course get its furigana; kana stays kana.
      const inner = !t.byReading && NI.furi.base(e.j) === t.text ? NI.furi.atomsHtml(NI.furi.atomsOf(e.j), ui.furiOpts()) : esc(t.text);
      const ro = NI.lex.romajiOf(e, t.byReading ? t.text : null);
      html += '<span class="tok" data-k="' + esc(e.key) + '" data-gl="' + esc(gl) + '" data-ro="' + esc(ro) + '"' + (pid ? ' data-p="' + pid + '"' : "") + '><span class="tw">' + inner + "</span></span>";
    }
    flush();
    return '<span class="jp" lang="ja">' + html + "</span>";
  }

  function coverage(tokens) {
    let known = 0;
    let unknown = 0;
    let inUnk = false;
    const unknownWords = [];
    let cur = "";
    for (const t of tokens) {
      // Glossary words show their meaning, but the lessons haven't taught them.
      if (t.entry && t.entry.kind === "extra") {
        if (inUnk) unknownWords.push(cur);
        cur = "";
        inUnk = false;
        unknown++;
        unknownWords.push(t.text);
        continue;
      }
      if (t.unknown) {
        if (!inUnk) unknown++;
        inUnk = true;
        cur += t.text;
        continue;
      }
      if (inUnk) {
        unknownWords.push(cur);
        cur = "";
      }
      inUnk = false;
      if (t.entry) known++;
    }
    if (cur) unknownWords.push(cur);
    const total = known + unknown;
    return { known, unknown, total, pct: total ? Math.round((known / total) * 100) : 0, words: U.uniq(unknownWords) };
  }

  function verdict(pct) {
    if (pct >= 98) return ["easy", "Comfortable reading: you know nearly every word."];
    if (pct >= 95) return ["ok", "Readable with a little help. Tap the words you don’t know."];
    if (pct >= 85) return ["hard", "Challenging. Turn on word meanings and look up the unknown words."];
    return ["vhard", "Hard going for now. Try a simpler text, or a story from this course."];
  }

  function sentencesOf(text) {
    return String(text)
      .replace(/([。！？!?])/g, "$1\n")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  pages.reader = {
    title: "Reader",
    nav: "tools",
    render() {
      const saved = (() => {
        try {
          return root.sessionStorage.getItem("ni-reader") || "";
        } catch (e) {
          return "";
        }
      })();
      return (
        '<header class="page-head"><h1>Reader & dictionary <span class="sub">' + ui.jp("{読|よ}む・{調|しら}べる", { tokens: false }) + "</span></h1>" +
        "<p>Paste Japanese from anywhere: a sign, a message, a song. You’ll see which words this course has taught you, with readings and meanings, and how much of the text you can already read.</p></header>" +
        '<section class="u-sec reader-in"><label for="rd-text">Japanese text</label>' +
        '<textarea id="rd-text" rows="4" lang="ja" placeholder="例：私は毎朝コーヒーを飲みます。">' + esc(saved) + "</textarea>" +
        '<div class="answer-row"><label class="sr" for="rd-romaji">Type in romaji</label><input id="rd-romaji" class="kana-input" type="text" placeholder="…or type romaji here: watashi wa gakusei desu"><button class="btn small ghost" type="button" data-add>Add</button></div>' +
        '<div class="row wrap"><button class="btn primary" type="button" data-read>Read it</button><button class="btn ghost small" type="button" data-sample>Try a sample</button><button class="btn ghost small" type="button" data-clear>Clear</button></div></section>' +
        '<section class="u-sec reader-out" aria-live="polite"></section>' +
        '<section class="u-sec"><h2>How do I say…? <span class="sub">English → Japanese</span></h2>' +
        '<label class="sr" for="rd-en">Search in English</label><input id="rd-en" class="search" type="search" placeholder="e.g. thank you, station, how much, delicious">' +
        '<div class="lookup-out" aria-live="polite"></div></section>'
      );
    },
    mount(el) {
      const ta = el.querySelector("#rd-text");
      const out = el.querySelector(".reader-out");
      const romaji = el.querySelector("#rd-romaji");
      const ime = NI.kana.bindIme(romaji);
      const add = () => {
        const v = ime.finalize().trim();
        if (!v) return;
        ta.value = (ta.value ? ta.value + (/[。！？\n]$/.test(ta.value) ? "" : "") : "") + v;
        romaji.value = "";
        read();
      };
      el.querySelector("[data-add]").addEventListener("click", add);
      romaji.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          add();
        }
      });
      const read = () => {
        const text = ta.value.trim();
        try {
          root.sessionStorage.setItem("ni-reader", text);
        } catch (e) {
          /* not essential */
        }
        if (!text) {
          out.innerHTML = "";
          return;
        }
        const toks = NI.lex.readPlain(text.slice(0, 3000));
        const cov = coverage(toks);
        const [cls, msg] = verdict(cov.pct);
        const enc = encodeURIComponent(text.slice(0, 1500));
        const sents = sentencesOf(text).slice(0, 30);
        out.innerHTML =
          '<div class="cover ' + cls + '"><div class="ring-box">' + NI.session.ring(cov.pct / 100, cov.pct + "%") + "</div><div><b>You know " + cov.known + " of " + cov.total + " words</b><span>" + esc(msg) + "</span></div></div>" +
          NI.views.aids() +
          '<div class="reader-text">' + renderPlain(toks) + "</div>" +
          '<div class="row wrap">' +
          (NI.speech.supported ? '<button class="btn small" type="button" data-say="' + esc(text.slice(0, 600)) + '">' + ui.ICON.speaker + "<span>Listen</span></button>" : "") +
          '<a class="btn small ghost" href="https://translate.google.com/?sl=ja&tl=en&op=translate&text=' + enc + '" target="_blank" rel="noopener">Google Translate ↗</a>' +
          '<a class="btn small ghost" href="https://www.deepl.com/translator#ja/en/' + enc + '" target="_blank" rel="noopener">DeepL ↗</a></div>' +
          (sents.length > 1 || cov.unknown
            ? '<details class="reader-more"><summary>Sentence by sentence' + (cov.words.length ? " · " + U.plural(cov.words.length, "unknown word") : "") + "</summary>" +
              (cov.words.length ? '<p class="small">Not in this course yet: ' + cov.words.slice(0, 40).map((w) => '<a href="https://jisho.org/search/' + encodeURIComponent(w) + '" target="_blank" rel="noopener" lang="ja">' + esc(w) + "</a>").join("、") + "</p>" : "") +
              '<ol class="sentences">' + sents.map((s) => '<li><div class="s-jp">' + renderPlain(NI.lex.readPlain(s)) + '<span class="s-tools">' + ui.say(s) + '<a class="bd-btn" href="https://translate.google.com/?sl=ja&tl=en&op=translate&text=' + encodeURIComponent(s) + '" target="_blank" rel="noopener" title="Translate this sentence" aria-label="Translate this sentence">↗</a></span></div></li>').join("") + "</ol></details>"
            : "");
        NI.views.bindAids(out);
        NI.store.log("rd", 1);
      };
      el.querySelector("[data-read]").addEventListener("click", read);
      el.querySelector("[data-clear]").addEventListener("click", () => {
        ta.value = "";
        read();
        ta.focus();
      });
      el.querySelector("[data-sample]").addEventListener("click", () => {
        const step = NI.nextStep();
        const reached = step ? step.u.n : 999;
        const story = U.pick(NI.course.stories.filter((s) => s.unit <= Math.max(reached, 5)));
        const u = NI.course.unit(Math.max(1, Math.min(reached, NI.course.units.length)));
        const lines = story ? story.lines.map((l) => l.jp) : u.sentences.slice(0, 6).map((s) => s.jp);
        ta.value = lines.map((m) => NI.furi.base(m)).join("");
        read();
      });
      if (ta.value) read();

      // English → Japanese
      const q = el.querySelector("#rd-en");
      const look = el.querySelector(".lookup-out");
      const find = () => {
        const term = q.value.trim().toLowerCase();
        if (term.length < 2) {
          look.innerHTML = "";
          return;
        }
        const re = new RegExp("\\b" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const words = NI.course.words.filter((w) => re.test(w.en)).slice(0, 12);
        const phrases = [].concat(...NI.data.phrases.map((s) => s.items)).filter((p) => re.test(p.en)).slice(0, 8);
        const sens = NI.course.sentences.filter((s) => re.test(s.en)).slice(0, 8);
        if (!words.length && !phrases.length && !sens.length) {
          look.innerHTML = '<p class="empty">Nothing in the course matches “' + esc(q.value) + '”. <a href="https://jisho.org/search/' + encodeURIComponent(q.value) + '" target="_blank" rel="noopener">Search Jisho ↗</a></p>';
          return;
        }
        look.innerHTML =
          (words.length ? "<h3>Words</h3>" + NI.views.wordList(words) : "") +
          (phrases.length ? '<h3>Phrases</h3><ol class="sentences">' + phrases.map((p) => '<li><div class="s-jp">' + ui.jp(p.jp) + '<span class="s-tools">' + ui.say(ui.sentenceAudio(p.jp)) + ui.breakdownBtn(p.jp, p.en) + '</span></div><p class="en">' + esc(p.en) + "</p></li>").join("") + "</ol>" : "") +
          (sens.length ? "<h3>Example sentences</h3>" + NI.views.sentenceList(sens) : "");
      };
      q.addEventListener("input", find);
    },
  };

  // ---------------------------------------------------------------------------
  // Sentence Maker

  const SLOT_LABEL = { time: "When", place: "Where", verb: "Action", obj: "What", with: "With", how: "How", topic: "Who / what", noun: "is…", adj: "Adjective", thing: "Thing", feel: "Feeling" };

  function fillers(pattern, slot, sel) {
    const D = NI.data.maker[pattern];
    if (slot === "obj") {
      const v = D.verb[Number(sel.verb) || 0];
      return v.obj.map((o) => ({ jp: o[0], en: o[1] }));
    }
    if (slot === "verb") return D.verb.map((v) => ({ jp: v.j, en: v.en[0] }));
    // Adjectives that don't suit the topic are greyed out (no hot 暑い ramen).
    if (pattern === "adj" && slot === "adj") {
      const topic = D.topic[Number(sel.topic) || 0];
      return D.adj.map((a) => ({ jp: a[0], en: a[2], off: !NI.maker.fits(topic, a) }));
    }
    return D[slot].map((f) => ({ jp: f[0], en: f[1] }));
  }

  // A filler that fits: the one chosen, or else the first that does.
  function fitting(list, i) {
    return list[i] && !list[i].off ? i : Math.max(0, list.findIndex((f) => !f.off));
  }

  // Moods a pattern offers with the chosen verb (no "Let's come").
  function moodsFor(pattern, sel) {
    const v = pattern === "go" ? NI.data.maker.go.verb[Number(sel.verb) || 0] : null;
    return NI.maker.MOODS.filter((m) => !(v && v.noMood && v.noMood.indexOf(m[0]) >= 0));
  }

  pages.maker = {
    title: "Sentence Maker",
    nav: "tools",
    render() {
      return (
        '<header class="page-head"><h1>Sentence Maker <span class="sub">' + ui.jp("{文|ぶん}を{作|つく}る", { tokens: false }) + "</span></h1>" +
        "<p>Choose the pieces and see how Japanese puts them together: polite or casual, now or past, yes or no. Every sentence is correct Japanese, with audio and a word-by-word breakdown. Say each one out loud.</p></header>" +
        '<div class="chips maker-patterns" role="tablist" aria-label="Sentence pattern">' +
        NI.maker.PATTERNS.map((p, i) => '<button class="chip' + (i === 0 ? " on" : "") + '" type="button" role="tab" aria-selected="' + (i === 0) + '" data-pat="' + p.id + '">' + esc(p.t) + "</button>").join("") +
        "</div>" +
        '<section class="u-sec maker"><p class="maker-d small muted"></p><div class="maker-slots form-grid"></div>' +
        '<div class="maker-controls"></div>' +
        '<div class="maker-out" aria-live="polite"></div></section>'
      );
    },
    mount(el) {
      let pat = NI.maker.PATTERNS[0];
      let sel = {};
      const made = new Set();
      const slotsBox = el.querySelector(".maker-slots");
      const ctlBox = el.querySelector(".maker-controls");
      const out = el.querySelector(".maker-out");
      const seg = (name, opts, cur) =>
        '<div class="seg" role="group" aria-label="' + esc(name) + '">' + opts.map(([v, l]) => '<button type="button" class="seg-b' + (cur === v ? " on" : "") + '" data-ctl="' + name + '" data-v="' + v + '">' + esc(l) + "</button>").join("") + "</div>";

      function drawSlots() {
        slotsBox.innerHTML = pat.slots
          .map((slot) => {
            const list = fillers(pat.id, slot, sel);
            return (
              '<label for="mk-' + slot + '">' + esc(SLOT_LABEL[slot] || slot) + '<select id="mk-' + slot + '" data-slot="' + slot + '">' +
              list.map((f, i) => '<option value="' + i + '"' + (String(sel[slot] || 0) === String(i) ? " selected" : "") + (f.off ? " disabled" : "") + ">" + (f.jp ? esc(NI.furi.base(f.jp)) + " — " + esc(f.en) : "—") + "</option>").join("") +
              "</select></label>"
            );
          })
          .join("");
        slotsBox.querySelectorAll("[data-slot]").forEach((s) =>
          s.addEventListener("change", () => {
            sel[s.getAttribute("data-slot")] = Number(s.value);
            if (s.getAttribute("data-slot") === "verb") {
              sel.obj = 0;
              drawSlots();
              if (!moodsFor(pat.id, sel).some((m) => m[0] === (sel.mood || "statement"))) sel.mood = "statement";
              drawControls();
            }
            if (pat.id === "adj" && s.getAttribute("data-slot") === "topic") {
              sel.adj = fitting(fillers("adj", "adj", sel), Number(sel.adj) || 0);
              drawSlots();
            }
            if (s.getAttribute("data-slot") === "time") {
              const t = NI.data.maker.action.time[Number(s.value)];
              if (t && t[2]) sel.tense = t[2];
              drawControls();
            }
            draw(true);
          })
        );
      }

      function drawControls() {
        const moods = pat.moods;
        const noTense = sel.mood === "lets" || sel.mood === "please";
        ctlBox.innerHTML =
          (moods ? '<div class="ctl"><span>Mood</span>' + seg("mood", moodsFor(pat.id, sel), sel.mood || "statement") + "</div>" : "") +
          '<div class="ctl"><span>Style</span>' + seg("style", [["polite", "Polite です/ます"], ["plain", "Casual"]], sel.style || "polite") + "</div>" +
          (noTense ? "" : '<div class="ctl"><span>Time</span>' + seg("tense", [["present", "Now / future"], ["past", "Past"]], sel.tense || "present") + "</div>") +
          (sel.mood === "lets" ? "" : '<div class="ctl"><span>Yes / no</span>' + seg("pol", [["aff", "Yes"], ["neg", "No (negative)"]], sel.pol || "aff") + "</div>") +
          (["action", "go", "like"].indexOf(pat.id) >= 0 ? '<label class="toggle small"><input type="checkbox" data-who' + (sel.who ? " checked" : "") + '><span><b>Say who: 私は</b><small>Japanese usually leaves “I” out</small></span></label>' : "") +
          '<div class="row wrap"><button class="btn small ghost" type="button" data-dice>🎲 Surprise me</button></div>';
        ctlBox.querySelectorAll("[data-ctl]").forEach((b) =>
          b.addEventListener("click", () => {
            sel[b.getAttribute("data-ctl")] = b.getAttribute("data-v");
            drawControls();
            draw(true);
          })
        );
        const who = ctlBox.querySelector("[data-who]");
        if (who)
          who.addEventListener("change", () => {
            sel.who = who.checked;
            draw(true);
          });
        ctlBox.querySelector("[data-dice]").addEventListener("click", () => {
          for (const slot of pat.slots) {
            const list = fillers(pat.id, slot, sel);
            sel[slot] = fitting(list, Math.floor(Math.random() * list.length));
          }
          if (pat.moods) sel.mood = U.pick(moodsFor(pat.id, sel))[0];
          sel.tense = Math.random() < 0.5 ? "present" : "past";
          sel.pol = Math.random() < 0.7 ? "aff" : "neg";
          drawSlots();
          drawControls();
          draw(true);
        });
      }

      function draw(byUser) {
        const r = NI.maker.build(Object.assign({ pattern: pat.id }, sel));
        if (!r) return;
        out.innerHTML =
          '<div class="maker-sentence">' + ui.jp(r.jp) + "</div>" +
          '<p class="maker-en">' + esc(r.en) + "</p>" +
          '<div class="row wrap center">' + ui.say(ui.sentenceAudio(r.jp), "the sentence") + ui.breakdownBtn(r.jp, r.en) +
          '<button class="btn small ghost" type="button" data-copy>Copy</button></div>' +
          (r.note ? '<p class="maker-note">💡 ' + esc(r.note) + "</p>" : "");
        out.querySelector("[data-copy]").addEventListener("click", () => NI.copyText(NI.furi.base(r.jp)));
        if (byUser && !made.has(r.jp)) {
          made.add(r.jp);
          NI.store.log("mk", 1);
          if (made.size % 5 === 0) NI.fx.gain(NI.game.XP.made * 5);
          else NI.fx.gain(0, { quiet: false });
        }
      }

      el.querySelectorAll("[data-pat]").forEach((b) =>
        b.addEventListener("click", () => {
          pat = NI.maker.pattern(b.getAttribute("data-pat"));
          sel = { style: sel.style, who: sel.who };
          el.querySelectorAll("[data-pat]").forEach((x) => {
            x.classList.toggle("on", x === b);
            x.setAttribute("aria-selected", x === b);
          });
          el.querySelector(".maker-d").textContent = pat.d;
          drawSlots();
          drawControls();
          draw(false);
        })
      );
      el.querySelector(".maker-d").textContent = pat.d;
      drawSlots();
      drawControls();
      draw(false);
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
