/* Exercise types and the generator that turns a unit part into a lesson.
   Each exercise has html() and mount(card, api); it calls api.done(correct)
   once answered (or api.done(null) for cards that are only read).
   ref names the word or sentence being tested (for the mistakes notebook);
   hint(card) gives a nudge. Option and typing cards also get a generic hint
   from the session: data-ci marks the right option, data-ans the answer. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const U = NI.util;
  const ui = NI.ui;
  const esc = ui.esc;
  const K = NI.kana;

  // ---------------------------------------------------------------------------
  // Choosing distractors

  const STOP = new Set(["the", "and", "for", "you", "your", "someone", "something", "thing", "things", "one", "with", "from", "not", "very", "much", "lot", "get", "say", "said", "when", "this", "that", "what", "its", "it's", "i'm", "are", "was", "who", "how"]);
  const stem = (w) => w.replace(/(ing|es|s)$/, "");
  function keywords(en) {
    return new Set(
      String(en)
        .toLowerCase()
        .replace(/\(.*?\)/g, " ")
        .split(/[^a-z']+/)
        .filter((w) => w.length > 2 && !STOP.has(w))
        .map(stem)
    );
  }
  function overlaps(a, b) {
    const ka = keywords(a);
    for (const w of keywords(b)) if (ka.has(w)) return true;
    return false;
  }
  const family = (p) => (/^v/.test(p) ? "v" : /^adj/.test(p) ? "a" : p === "exp" || p === "int" ? "x" : p === "num" || p === "ctr" ? "#" : "n");

  function wordDistractors(word, n, rng) {
    const units = NI.course.units.filter((u) => u.n <= word.unit && u.n >= word.unit - 3);
    let pool = [].concat(...units.map((u) => u.words)).filter((w) => w.id !== word.id && w.r !== word.r && w.head !== word.head && !overlaps(w.en, word.en));
    const same = pool.filter((w) => family(w.pos) === family(word.pos));
    if (same.length >= n) pool = same;
    if (pool.length < n) {
      const more = NI.course.words.filter((w) => w.id !== word.id && w.r !== word.r && !overlaps(w.en, word.en) && pool.indexOf(w) < 0);
      pool = pool.concat(U.sample(more, n - pool.length, rng));
    }
    return U.sample(pool, n, rng);
  }

  // Particles that could also be right in the same slot are never offered as wrong answers.
  const PARTICLES = ["は", "が", "を", "に", "で", "へ", "と", "も", "の", "から", "まで"];
  const SAME = { は: ["が", "も"], が: ["は", "も", "を"], を: ["が", "は", "も"], に: ["へ", "まで"], へ: ["に", "まで"], も: ["は", "が", "を"], まで: ["に", "へ"] };

  // ---------------------------------------------------------------------------
  // Small helpers

  function options(list, render) {
    return '<div class="opts">' + list.map((o, i) => '<button class="opt" type="button" data-i="' + i + '"><span class="key" aria-hidden="true">' + (i + 1) + "</span><span class=\"opt-body\">" + render(o) + "</span></button>").join("") + "</div>";
  }

  // Wires option buttons; correctIndex marks the right one after a choice.
  function bindOptions(card, correctIndex, api, onPick) {
    const btns = Array.from(card.querySelectorAll(".opt"));
    const box = card.querySelector(".opts");
    if (box) box.setAttribute("data-ci", correctIndex);
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        if (card.dataset.answered) return;
        card.dataset.answered = "1";
        const i = Number(b.dataset.i);
        const ok = i === correctIndex;
        btns.forEach((x, j) => {
          x.disabled = true;
          if (j === correctIndex) x.classList.add("right");
          else if (j === i) x.classList.add("wrong");
        });
        if (onPick) onPick(ok, i);
        api.done(ok);
      })
    );
  }

  const isJapanese = (s) => /[぀-ヿ一-鿿]/.test(s);
  const textOrJp = (s) => (isJapanese(s) ? ui.jp(s, { tokens: false }) : esc(s));

  function inputBox(id, placeholder) {
    return (
      '<div class="answer-row"><label class="sr" for="' + id + '">Your answer</label>' +
      '<input id="' + id + '" class="kana-input" type="text" inputmode="text" placeholder="' + esc(placeholder || "type in romaji or kana") + '" lang="ja">' +
      '<button class="btn primary" type="button" data-check>Check</button></div>' +
      '<p class="hint">Romaji turns into kana as you type: <span lang="ja">taberu → たべる</span>. Use <b>nn</b> or <b>n\'</b> for ん before a vowel.</p>'
    );
  }

  function bindInput(card, api, accept) {
    const input = card.querySelector(".kana-input");
    input.setAttribute("data-ans", accept.find((a) => /^[ぁ-ゖァ-ヺー]+$/.test(a)) || accept[0]);
    const ime = K.bindIme(input);
    const check = () => {
      if (card.dataset.answered) return;
      const val = ime.finalize().trim();
      if (!val) {
        input.focus();
        return;
      }
      card.dataset.answered = "1";
      input.disabled = true;
      card.querySelector("[data-check]").disabled = true;
      const f = K.fold(val);
      const ok = accept.some((a) => K.fold(a) === f || K.fold(a.replace(/では/g, "でわ")) === f);
      input.classList.add(ok ? "right" : "wrong");
      api.done(ok);
    };
    card.querySelector("[data-check]").addEventListener("click", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        check();
      }
    });
    setTimeout(() => input.focus(), 30);
  }

  // Every written form we accept for a word typed from memory.
  function acceptedForWord(word) {
    const out = [word.w, word.r];
    const add = (m) => out.push(NI.furi.base(m), NI.furi.reading(m));
    if (word.head) add(word.head);
    if (word.rs) out.push(...word.rs);
    return U.uniq(out);
  }

  const playButton = (text, label) =>
    NI.speech.supported ? '<button class="big-play" type="button" data-say="' + esc(text) + '" aria-label="Play ' + esc(label || "audio") + '">' + ui.ICON.speaker + "</button>" : "";

  // ---------------------------------------------------------------------------
  // Exercise types

  const T = {};

  T.intro = (word) => ({
    type: "intro",
    item: word.id,
    html() {
      const ex = NI.items.bestExample(word);
      return (
        '<p class="kicker">New word</p>' +
        '<div class="word-card">' +
        '<div class="word-big hand">' + ui.wordHead(word, { tokens: false }) + "</div>" +
        ui.say(ui.wordAudio(word), word.r, "lg") +
        '<p class="word-en">' + esc(word.en) + "</p>" +
        '<p class="word-meta">' + ui.posTag(word) + "</p>" +
        (word.note ? '<p class="word-note">' + esc(word.note) + "</p>" : "") +
        (ex ? '<div class="word-ex">' + ui.jp(ex.jp) + ui.say(ui.sentenceAudio(ex.jp)) + '<p class="en">' + esc(ex.en) + "</p></div>" : "") +
        "</div>"
      );
    },
    autoplay: () => ui.wordAudio(word),
    mount(card, api) {
      api.done(null);
    },
  });

  T.mcMeaning = (word, rng) => {
    const opts = U.shuffle([word].concat(wordDistractors(word, 3, rng)), rng);
    return {
      type: "mcMeaning",
      item: word.id,
      ref: word.id,
      html() {
        return '<p class="kicker">What does this mean?</p><div class="prompt-word hand">' + ui.jp(word.head, { tokens: false }) + ui.say(ui.wordAudio(word), word.r) + "</div>" + options(opts, (w) => esc(w.en));
      },
      autoplay: () => ui.wordAudio(word),
      mount(card, api) {
        bindOptions(card, opts.indexOf(word), api);
      },
      solution: () => ui.jp(word.head, { tokens: false }) + " = " + esc(word.en),
      retry: () => T.mcMeaning(word, rng),
    };
  };

  T.mcWord = (word, rng) => {
    const opts = U.shuffle([word].concat(wordDistractors(word, 3, rng)), rng);
    return {
      type: "mcWord",
      item: word.id,
      ref: word.id,
      html() {
        return '<p class="kicker">Choose the Japanese</p><p class="prompt-en">' + esc(word.en) + "</p>" + options(opts, (w) => ui.jp(w.head, { tokens: false }));
      },
      mount(card, api) {
        bindOptions(card, opts.indexOf(word), api, () => NI.store.settings.autoplay && NI.speech.speak(ui.wordAudio(word)));
      },
      solution: () => esc(word.en) + " = " + ui.jp(word.head, { tokens: false }),
      retry: () => T.mcMeaning(word, rng),
    };
  };

  T.listen = (word, rng) => {
    const opts = U.shuffle([word].concat(wordDistractors(word, 3, rng)), rng);
    return {
      type: "listen",
      item: word.id,
      ref: word.id,
      html() {
        return '<p class="kicker">What did you hear?</p><div class="prompt-audio">' + playButton(ui.wordAudio(word), "the word") + "</div>" + options(opts, (w) => ui.jp(w.head, { tokens: false }));
      },
      autoplay: () => ui.wordAudio(word),
      mount(card, api) {
        bindOptions(card, opts.indexOf(word), api);
      },
      solution: () => ui.jp(word.head, { tokens: false }) + " — " + esc(word.en),
      retry: () => T.mcMeaning(word, rng),
    };
  };

  T.type = (word, rng) => ({
    type: "type",
    item: word.id,
    ref: word.id,
    html() {
      return '<p class="kicker">Type it in Japanese</p><p class="prompt-en">' + esc(word.en) + '</p><p class="word-meta center">' + ui.posTag(word) + "</p>" + inputBox("ans-" + U.hash(word.id + Math.random()));
    },
    mount(card, api) {
      bindInput(card, api, acceptedForWord(word));
    },
    solution: () => ui.jp(word.head, { tokens: false }) + ui.say(ui.wordAudio(word)),
    retry: () => T.mcWord(word, rng),
  });

  T.match = (words, rng) => {
    const left = U.shuffle(words, rng);
    const right = U.shuffle(words, rng);
    return {
      type: "match",
      html() {
        return (
          '<p class="kicker">Match the pairs</p><div class="match">' +
          '<div class="match-col">' + left.map((w) => '<button class="m-cell jp-cell" type="button" data-id="' + esc(w.id) + '">' + ui.jp(w.head, { tokens: false }) + "</button>").join("") + "</div>" +
          '<div class="match-col">' + right.map((w) => '<button class="m-cell" type="button" data-id="' + esc(w.id) + '">' + esc(w.en) + "</button>").join("") + "</div></div>"
        );
      },
      // Flashes one pair that still needs matching.
      hint(card) {
        const open = Array.from(card.querySelectorAll(".match-col:first-child .m-cell:not(.done)"));
        if (!open.length) return;
        const id = open[0].dataset.id;
        card.querySelectorAll('.m-cell[data-id="' + CSS.escape(id) + '"]').forEach((c) => {
          c.classList.add("hinted");
          setTimeout(() => c.classList.remove("hinted"), 1600);
        });
      },
      mount(card, api) {
        let sel = null;
        let left = words.length;
        let misses = 0;
        const cols = card.querySelectorAll(".match-col");
        card.querySelectorAll(".m-cell").forEach((b) =>
          b.addEventListener("click", () => {
            if (b.classList.contains("done")) return;
            const col = b.parentElement === cols[0] ? 0 : 1;
            if (col === 0) {
              const w = NI.course.get(b.dataset.id);
              if (w && NI.store.settings.autoplay) NI.speech.speak(ui.wordAudio(w));
            }
            if (!sel || sel.col === col) {
              if (sel) sel.el.classList.remove("sel");
              sel = { el: b, col };
              b.classList.add("sel");
              return;
            }
            if (sel.el.dataset.id === b.dataset.id) {
              sel.el.classList.remove("sel");
              sel.el.classList.add("done");
              b.classList.add("done");
              sel.el.disabled = b.disabled = true;
              sel = null;
              if (--left === 0) api.done(misses === 0 ? true : null);
            } else {
              misses++;
              const a = sel.el;
              a.classList.remove("sel");
              a.classList.add("miss");
              b.classList.add("miss");
              setTimeout(() => {
                a.classList.remove("miss");
                b.classList.remove("miss");
              }, 450);
              sel = null;
            }
          })
        );
      },
    };
  };

  T.translate = (sen, pool, rng) => {
    const others = U.sample(pool.filter((s) => s.en !== sen.en && s.jp !== sen.jp), 3, rng);
    const opts = U.shuffle([sen].concat(others), rng);
    return {
      type: "translate",
      item: sen.id,
      ref: /^s:/.test(sen.id || "") ? sen.id : null,
      html() {
        return '<p class="kicker">What does it mean?</p><div class="prompt-sentence">' + ui.jp(sen.jp) + ui.say(ui.sentenceAudio(sen.jp)) + "</div>" + options(opts, (s) => esc(s.en));
      },
      autoplay: () => ui.sentenceAudio(sen.jp),
      mount(card, api) {
        bindOptions(card, opts.indexOf(sen), api);
      },
      solution: () => esc(sen.en),
    };
  };

  T.listenSentence = (sen, pool, rng) => {
    const others = U.sample(pool.filter((s) => s.jp !== sen.jp && NI.furi.base(s.jp) !== NI.furi.base(sen.jp)), 2, rng);
    const opts = U.shuffle([sen].concat(others), rng);
    return {
      type: "listenSentence",
      ref: /^s:/.test(sen.id || "") ? sen.id : null,
      html() {
        return '<p class="kicker">Which sentence did you hear?</p><div class="prompt-audio">' + playButton(ui.sentenceAudio(sen.jp), "the sentence") + "</div>" + options(opts, (s) => ui.jp(s.jp, { tokens: false }));
      },
      autoplay: () => ui.sentenceAudio(sen.jp),
      mount(card, api) {
        bindOptions(card, opts.indexOf(sen), api);
      },
      solution: () => ui.jp(sen.jp, { tokens: false }) + '<span class="en"> ' + esc(sen.en) + "</span>",
    };
  };

  T.particle = (sen, target, rng) => {
    const toks = NI.lex.tokens(sen.jp);
    const idx = toks.findIndex((t) => t.entry && t.entry.kind === "grammar" && t.entry.s === target);
    // sen.alt lists particles that would also fit this sentence (写真に撮る).
    const avoid = new Set([target].concat(SAME[target] || [], sen.alt || []));
    const opts = U.shuffle([target].concat(U.sample(PARTICLES.filter((p) => !avoid.has(p)), 3, rng)), rng);
    // Render with the chosen token blanked out.
    let k = -1;
    const blanked = ui.jp(sen.jp, {
      onToken: (tok, h) => {
        k++;
        return k === idx ? '<span class="blank" aria-label="blank">？</span>' : null;
      },
    });
    return {
      type: "particle",
      item: sen.id + target,
      ref: /^s:/.test(sen.id || "") ? sen.id : null,
      html() {
        return '<p class="kicker">Fill in the particle</p><p class="prompt-en small">' + esc(sen.en) + '</p><div class="prompt-sentence">' + blanked + "</div>" + options(opts, (p) => '<span class="jp particle" lang="ja">' + esc(p) + "</span>");
      },
      mount(card, api) {
        bindOptions(card, opts.indexOf(target), api, () => {
          const box = card.querySelector(".prompt-sentence");
          box.innerHTML = ui.jp(sen.jp) + ui.say(ui.sentenceAudio(sen.jp));
          if (NI.store.settings.autoplay) NI.speech.speak(ui.sentenceAudio(sen.jp));
        });
      },
      solution: () => ui.jp(sen.jp, { tokens: false }),
      retry: () => T.particle(sen, target, rng),
    };
  };

  /* Sentence builder. Japanese word order is flexible before the verb, so an
     answer counts if it keeps each modifier attached to what it modifies, the
     predicate last, and any opening はい/いいえ first. Sentences with a verb or
     adjective inside them (relative clauses) only accept the given order. */
  const TIME_WORDS = new Set(["n-t", "adv"]);
  function builderBlocks(sen) {
    const tiles = NI.furi.parse(sen.jp);
    const toks = NI.lex.tokens(sen.jp);
    const last = tiles.length - 1;
    let strict = false;
    const movable = tiles.map((t, i) => {
      const own = toks.filter((x) => x.tile === i && x.entry && x.entry.kind !== "punct");
      if (i < last && own.some((x) => /^(v|adj)/.test(x.entry.pos || "") || x.entry.kind === "form")) strict = true;
      if (i === last || !own.length) return false;
      const end = own[own.length - 1].entry;
      if (end.kind === "grammar" && (PARTICLES.indexOf(end.s) >= 0 || end.s === "より") && end.s !== "の") return true;
      return own.length === 1 && TIME_WORDS.has(end.pos);
    });
    const blocks = [];
    let cur = [];
    tiles.forEach((t, i) => {
      cur.push(i);
      if (movable[i] || i === last) {
        blocks.push(cur);
        cur = [];
      }
    });
    if (cur.length) blocks.push(cur);
    const opener = /、$/.test(NI.furi.baseOfAtoms(tiles[0])) && !movable[0];
    return { blocks, strict, opener };
  }

  function builderAccepts(sen, order) {
    const n = NI.furi.parse(sen.jp).length;
    if (order.length !== n) return false;
    if (order.every((v, i) => v === i)) return true;
    const { blocks, strict, opener } = builderBlocks(sen);
    if (strict) return false;
    let pos = 0;
    const used = [];
    while (pos < order.length) {
      const b = blocks.find((bl) => bl[0] === order[pos]);
      if (!b) return false;
      for (let k = 0; k < b.length; k++) if (order[pos + k] !== b[k]) return false;
      used.push(b);
      pos += b.length;
    }
    if (used[used.length - 1] !== blocks[blocks.length - 1]) return false;
    if (opener && used[0] !== blocks[0]) return false;
    return true;
  }

  T.build = (sen, rng) => {
    const markups = NI.furi.tileMarkups(sen.jp).map((m) => m.replace(/[。？！]$/, ""));
    let order = U.shuffle(markups.map((m, i) => i), rng);
    if (order.every((v, i) => v === i)) order = order.slice().reverse();
    return {
      type: "build",
      item: sen.id,
      ref: /^s:/.test(sen.id || "") ? sen.id : null,
      // Puts the next tile in place (after taking back any that are out of order).
      hint(card) {
        const ans = card.querySelector(".build-answer");
        const bank = card.querySelector(".build-tiles");
        const got = Array.from(ans.querySelectorAll(".tile"));
        let k = 0;
        while (k < got.length && Number(got[k].dataset.t) === k) k++;
        got.slice(k).forEach((t) => bank.appendChild(t));
        const t = bank.querySelector('.tile[data-t="' + k + '"]');
        if (t) {
          ans.appendChild(t);
          t.classList.add("hinted");
        }
        const check = card.querySelector("[data-check]");
        if (check) check.disabled = bank.querySelectorAll(".tile").length > 0;
      },
      html() {
        return (
          '<p class="kicker">Build the sentence</p><p class="prompt-en">' + esc(sen.en) + "</p>" +
          '<div class="build-answer" aria-label="Your sentence"></div>' +
          '<div class="build-tiles">' + order.map((i) => '<button class="tile" type="button" data-t="' + i + '">' + ui.jp(markups[i], { tokens: false, gaps: false }) + "</button>").join("") + "</div>" +
          '<div class="row center"><button class="btn primary" type="button" data-check disabled>Check</button></div>'
        );
      },
      mount(card, api) {
        const ans = card.querySelector(".build-answer");
        const bank = card.querySelector(".build-tiles");
        const check = card.querySelector("[data-check]");
        const refresh = () => (check.disabled = bank.querySelectorAll(".tile").length > 0);
        card.addEventListener("click", (e) => {
          const t = e.target.closest(".tile");
          if (!t || card.dataset.answered) return;
          (t.parentElement === bank ? ans : bank).appendChild(t);
          refresh();
        });
        check.addEventListener("click", () => {
          if (card.dataset.answered) return;
          card.dataset.answered = "1";
          const got = Array.from(ans.querySelectorAll(".tile")).map((t) => Number(t.dataset.t));
          const ok = builderAccepts(sen, got);
          ans.classList.add(ok ? "right" : "wrong");
          card.querySelectorAll(".tile").forEach((t) => (t.disabled = true));
          check.disabled = true;
          if (ok && NI.store.settings.autoplay) NI.speech.speak(ui.sentenceAudio(sen.jp));
          api.done(ok);
        });
      },
      solution: () => ui.jp(sen.jp) + ui.say(ui.sentenceAudio(sen.jp)),
      retry: () => T.build(sen, rng),
    };
  };

  T.conj = (word, target, rng) => {
    const answers = NI.conj.drillAnswers(word, target);
    const label = NI.conj.DRILLS[target].label;
    return {
      type: "conj",
      item: word.id + target,
      ref: word.id,
      html() {
        return (
          '<p class="kicker">Change the form</p><div class="prompt-word hand small">' + ui.jp(word.head, { tokens: false }) + "</div>" +
          '<p class="prompt-en small">' + esc(word.en) + (word.dict ? ' · <span class="muted">dictionary form ' + ui.jp(word.dict, { tokens: false }) + "</span>" : "") + "</p>" +
          '<p class="conj-target">→ <b>' + esc(label) + "</b></p>" + inputBox("conj-" + U.hash(word.id + target + Math.random()))
        );
      },
      mount(card, api) {
        bindInput(
          card,
          api,
          [].concat(...answers.map((a) => [NI.furi.base(a), NI.furi.reading(a)]))
        );
      },
      solution: () => answers.map((a) => ui.jp(a, { tokens: false })).join(" / ") + ui.say(NI.furi.reading(answers[0])),
      retry: () => T.conj(word, target, rng),
    };
  };

  // Numbers: read a price, time or head-count, or hear one and pick it.
  // counter → [sign, plain reading, whether "number + plain reading" is a useful wrong answer]
  const COUNTER_SIGNS = { hon: ["本", "ほん", true], mai: ["枚", "まい", false], satsu: ["冊", "さつ", true], hiki: ["匹", "ひき", true], kai: ["回", "かい", true], floor: ["階", "かい", false], gatsu: ["月", "がつ", true] };

  function numberItem(kind, rng) {
    const N = NI.num;
    const r = rng || Math.random;
    if (kind === "time") {
      const h = 1 + Math.floor(r() * 12);
      const m = U.pick([0, 0, 5, 10, 15, 20, 30, 30, 45], r);
      return { label: h + ":" + String(m).padStart(2, "0"), kana: N.timeKana(h, m), near: () => N.timeKana(1 + Math.floor(r() * 12), U.pick([0, 10, 15, 30, 45, 5], r)) };
    }
    if (kind === "people") {
      const n = U.pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 4, 1, 2], r);
      return { label: n + "人", kana: N.COUNTERS.nin(n), naive: N.toKana(n) + "にん", near: () => N.COUNTERS.nin(1 + Math.floor(r() * 10)) };
    }
    if (kind.startsWith("ctr:")) {
      // "ctr:hon,mai" drills those counters. Numbers with two accepted readings
      // (8本 はっぽん/はちほん, 3階 さんがい/さんかい) are left out.
      const c = U.pick(kind.slice(4).split(","), r);
      const [sign, plain, naive] = COUNTER_SIGNS[c];
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const n = U.pick(c === "floor" ? [1, 2, 4, 5, 6, 7, 9, 10] : c === "gatsu" ? months.concat([4, 7, 9]) : [1, 2, 3, 4, 5, 6, 7, 9, 10, 1, 3, 6], r);
      const fn = N.COUNTERS[c];
      return { label: n + sign, kana: fn(n), naive: naive ? N.toKana(n) + plain : null, near: () => fn(U.pick(c === "gatsu" ? months : [1, 2, 3, 4, 5, 6, 7, 9, 10], r)) };
    }
    const bands = [[10, 990, 10], [100, 9900, 100], [1000, 50000, 500], [100, 2000, 50]];
    const [lo, hi, step] = U.pick(bands, r);
    const n = lo + step * Math.floor(r() * ((hi - lo) / step + 1));
    const naive = N.toKana(n).replace("さんびゃく", "さんひゃく").replace("ろっぴゃく", "ろくひゃく").replace("はっぴゃく", "はちひゃく").replace("さんぜん", "さんせん").replace("はっせん", "はちせん") + "えん";
    const near = () => {
      const d = (1 + Math.floor(r() * 5)) * (r() < 0.5 ? -1 : 1);
      const m = n + d * step;
      return N.COUNTERS.yen(m > 0 ? m : n - d * step);
    };
    return { label: "¥" + N.withCommas(n), kana: N.COUNTERS.yen(n), naive, near };
  }

  T.number = (kind, rng, listen) => {
    const it = numberItem(kind, rng);
    const wrong = [];
    if (it.naive && it.naive !== it.kana) wrong.push(it.naive);
    for (let tries = 0; wrong.length < 3 && tries < 30; tries++) {
      const x = it.near();
      if (x !== it.kana && wrong.indexOf(x) < 0) wrong.push(x);
    }
    const opts = U.shuffle([it.kana].concat(wrong.slice(0, 3)), rng);
    return {
      type: "number",
      html() {
        if (listen) {
          return '<p class="kicker">Which reading did you hear?</p><div class="prompt-audio">' + playButton(it.kana, "the number") + "</div>" + options(opts, (o) => '<span lang="ja">' + esc(o) + "</span>");
        }
        return '<p class="kicker">How do you say it?</p><div class="prompt-number">' + esc(it.label) + "</div>" + options(opts, (o) => '<span lang="ja">' + esc(o) + "</span>");
      },
      autoplay: () => (listen ? it.kana : null),
      mount(card, api) {
        bindOptions(card, opts.indexOf(it.kana), api, () => NI.store.settings.autoplay && NI.speech.speak(it.kana));
      },
      solution: () => esc(it.label) + " = <span lang=\"ja\">" + esc(it.kana) + "</span>",
    };
  };

  T.situation = (sit, rng) => {
    const opts = U.shuffle([sit.a].concat(sit.o), rng);
    return {
      type: "situation",
      html() {
        return '<p class="kicker">What do you say?</p><p class="prompt-en">' + esc(sit.q) + "</p>" + options(opts, (o) => ui.jp(o, { tokens: false }));
      },
      mount(card, api) {
        bindOptions(card, opts.indexOf(sit.a), api, () => NI.store.settings.autoplay && NI.speech.speak(ui.sentenceAudio(sit.a)));
      },
      solution: () => ui.jp(sit.a, { tokens: false }),
    };
  };

  /* Say it out loud: reading or saying words aloud makes them more memorable
     than silent study (the production effect), so the learner says the
     sentence, then checks it against the text and the audio. */
  T.speak = (sen, rng) => ({
    type: "speak",
    item: "speak:" + sen.id,
    ref: /^s:/.test(sen.id || "") ? sen.id : null,
    html() {
      return (
        '<p class="kicker">Say it out loud in Japanese</p><p class="prompt-en">' + esc(sen.en) + "</p>" +
        '<p class="small muted center">Say the whole sentence aloud (or at least mouth it), then check.</p>' +
        '<div class="speak-answer" hidden><div class="prompt-sentence">' + ui.jp(sen.jp) + ui.say(ui.sentenceAudio(sen.jp)) + "</div></div>" +
        '<div class="row center wrap speak-btns"><button class="btn primary" type="button" data-show>I said it — show me</button></div>'
      );
    },
    mount(card, api) {
      const show = card.querySelector("[data-show]");
      show.addEventListener("click", () => {
        card.querySelector(".speak-answer").hidden = false;
        if (NI.speech.supported) NI.speech.speak(ui.sentenceAudio(sen.jp));
        const btns = card.querySelector(".speak-btns");
        btns.innerHTML = '<button class="btn ghost" type="button" data-self="0">Not quite</button><button class="btn primary" type="button" data-self="1">I got it</button>';
        btns.querySelectorAll("[data-self]").forEach((b) =>
          b.addEventListener("click", () => {
            if (card.dataset.answered) return;
            card.dataset.answered = "1";
            btns.querySelectorAll("button").forEach((x) => (x.disabled = true));
            NI.store.log("sp", 1);
            api.done(b.getAttribute("data-self") === "1");
          })
        );
        btns.querySelector('[data-self="1"]').focus({ preventScroll: true });
      });
    },
    solution: () => ui.jp(sen.jp) + ui.say(ui.sentenceAudio(sen.jp)),
  });

  T.dialogue = (unit) => ({
    type: "dialogue",
    html() {
      return '<p class="kicker">Read and listen</p>' + NI.views.dialogue(unit, { hideEn: true });
    },
    mount(card, api) {
      NI.views.bindDialogue(card, unit);
      api.done(null);
    },
  });

  T.question = (q, rng) => {
    const opts = U.shuffle([q.a].concat(q.o), rng);
    return {
      type: "question",
      html() {
        return '<p class="kicker">Conversation check</p><p class="prompt-en">' + esc(q.q) + "</p>" + options(opts, textOrJp);
      },
      mount(card, api) {
        bindOptions(card, opts.indexOf(q.a), api);
      },
      solution: () => textOrJp(q.a),
    };
  };

  // ---------------------------------------------------------------------------
  // Building a lesson for one part of a unit

  /* The learner's focus (Options → Your plan) shifts the mix of exercise
     types; every lesson still has some of everything. */
  const FOCUS = {
    balanced: {},
    listening: { listen: 2, listenSentence: 2, speak: 1.5, type: 0.75 },
    speaking: { speak: 2.5, type: 1.5, build: 1.25, translate: 0.75 },
    reading: { translate: 1.5, particle: 1.25, speak: 0.5, listen: 0.67, listenSentence: 0.5 },
    exam: { particle: 1.5, conj: 1.5, number: 1.5, speak: 0.5 },
  };
  function howMany(base, type) {
    const f = FOCUS[(NI.store.settings && NI.store.settings.focus) || "balanced"] || {};
    return Math.max(0, Math.round(base * (f[type] || 1)));
  }

  function wordsLesson(words, rng) {
    const out = [];
    for (let i = 0; i < words.length; i += 4) {
      const batch = words.slice(i, i + 4);
      batch.forEach((w) => out.push(T.intro(w)));
      U.shuffle(batch, rng).forEach((w) => out.push(T.mcMeaning(w, rng)));
    }
    const mixed = U.shuffle(words, rng);
    for (let i = 0; i < mixed.length; i += 5) {
      const grp = mixed.slice(i, i + 5);
      if (grp.length >= 3) out.push(T.match(grp, rng));
    }
    const typeable = mixed.filter((w) => w.r.length <= 7 && w.pos !== "num" && w.pos !== "ctr");
    U.sample(typeable, Math.min(howMany(4, "type"), typeable.length), rng).forEach((w) => out.push(T.type(w, rng)));
    if (NI.speech.canListen) U.sample(mixed, Math.min(howMany(3, "listen"), mixed.length), rng).forEach((w) => out.push(T.listen(w, rng)));
    else U.sample(mixed, Math.min(3, mixed.length), rng).forEach((w) => out.push(T.mcWord(w, rng)));
    return out;
  }

  function sentencesLesson(u, rng) {
    const S = u.sentences;
    const ex = [];
    const take = (list, n) => U.sample(list, Math.min(n, list.length), rng);
    take(S, howMany(4, "translate")).forEach((s) => ex.push(T.translate(s, S, rng)));
    if (NI.speech.canListen) take(S, howMany(2, "listenSentence")).forEach((s) => ex.push(T.listenSentence(s, S, rng)));
    const withP = S.filter((s) => s.p);
    take(withP, howMany(5, "particle")).forEach((s) => ex.push(T.particle(s, [].concat(s.p)[0], rng)));
    take(S.filter((s) => NI.furi.base(s.jp).length <= 22), howMany(2, "speak")).forEach((s) => ex.push(T.speak(s, rng)));
    const buildable = S.filter((s) => {
      const tiles = NI.furi.parse(s.jp).length;
      const body = NI.furi.base(s.jp).replace(/[。？！]$/, "");
      return tiles >= 3 && tiles <= 6 && !/[。？！]/.test(body);
    });
    take(buildable, howMany(4, "build")).forEach((s) => ex.push(T.build(s, rng)));
    const drill = u.drill || {};
    /* "masen:a" drills adjectives, "te" (or "te:v") drills verbs. Words the
       unit names in drill.words (dictionary forms) come first, then this
       unit's own words, then earlier units'. */
    const named = (drill.words || []).map((b) => NI.course.words.find((w) => w.w === b && w.unit <= u.n)).filter(Boolean);
    for (const spec of drill.conj || []) {
      const [target, kind] = spec.split(":");
      const fits = (w) => (kind === "a" ? NI.conj.isAdj(w.pos) : NI.conj.isVerb(w.pos)) && NI.conj.drillAnswers(w, target);
      const cands = named.filter(fits);
      for (let n = u.n; n >= 1 && cands.length < 8; n--) for (const w of NI.course.unit(n).words) if (fits(w) && !cands.includes(w)) cands.push(w);
      take(cands.slice(0, 8), howMany(Math.ceil(6 / drill.conj.length), "conj")).forEach((w) => ex.push(T.conj(w, target, rng)));
    }
    if (drill.num) for (let i = 0; i < howMany(4, "number"); i++) ex.push(T.number(drill.num, rng, i % 2 === 1 && NI.speech.canListen));
    take(u.sit || [], 6).forEach((s) => ex.push(T.situation(s, rng)));
    // Keep two reading questions first, then mix the rest.
    return ex.slice(0, 2).concat(U.shuffle(ex.slice(2), rng));
  }

  function dialogueLesson(u, rng) {
    const out = [T.dialogue(u)];
    for (const q of u.dialogue.q || []) out.push(T.question(q, rng));
    const lines = u.dialogue.lines.filter((l) => l.jp && NI.furi.base(l.jp).length > 5);
    U.sample(lines, Math.min(2, lines.length), rng).forEach((l) => out.push(T.translate(l, lines, rng)));
    return out;
  }

  function lesson(u, partKey, seed) {
    const rng = U.rng(seed == null ? Date.now() : seed);
    const part = NI.course.parts(u).find((p) => p.key === partKey);
    if (!part) return null;
    let exercises;
    let srs = [];
    if (part.words) {
      exercises = wordsLesson(part.words, rng);
      srs = part.words.map((w) => w.id);
    } else if (part.key === "s") {
      exercises = sentencesLesson(u, rng);
      srs = NI.items.keySentences(u).map((s) => s.id);
    } else {
      exercises = dialogueLesson(u, rng);
    }
    return { part, exercises, srs };
  }

  // A word or sentence from the mistakes notebook, as a fresh exercise.
  function practiceOne(ref, rng) {
    const it = NI.items.get(ref);
    if (!it) return null;
    if (it.kind === "word") {
      const typeable = it.r.length <= 7 && it.pos !== "num" && it.pos !== "ctr";
      const pick = Math.floor(rng() * 3);
      return pick === 0 && typeable ? T.type(it, rng) : pick === 1 ? T.mcWord(it, rng) : T.mcMeaning(it, rng);
    }
    if (it.kind === "sentence") {
      const u = NI.course.unit(it.unit);
      const pool = u ? u.sentences : [it];
      const tiles = NI.furi.parse(it.jp).length;
      const pick = Math.floor(rng() * 3);
      if (pick === 0 && it.p) return T.particle(it, [].concat(it.p)[0], rng);
      if (pick === 1 && tiles >= 3 && tiles <= 7) return T.build(it, rng);
      return pool.length >= 4 ? T.translate(it, pool, rng) : T.speak(it, rng);
    }
    return null;
  }

  function practice(refs, seed) {
    const rng = U.rng(seed == null ? Date.now() : seed);
    return U.shuffle(refs, rng).map((r) => practiceOne(r, rng)).filter(Boolean);
  }

  /* A line exam: 20 mixed questions from the line's units. No retries and no
     hints, so the score shows what you know. */
  function exam(line, seed) {
    const rng = U.rng(seed == null ? Date.now() : seed);
    const units = line.units.map((n) => NI.course.unit(n)).filter(Boolean);
    const words = [].concat(...units.map((u) => u.words)).filter((w) => w.pos !== "int");
    const sens = [].concat(...units.map((u) => u.sentences));
    const ex = [];
    U.sample(words, 4, rng).forEach((w) => ex.push(T.mcMeaning(w, rng)));
    U.sample(words, 3, rng).forEach((w) => ex.push(T.mcWord(w, rng)));
    U.sample(sens, 4, rng).forEach((s) => ex.push(T.translate(s, sens, rng)));
    U.sample(sens.filter((s) => s.p), 4, rng).forEach((s) => ex.push(T.particle(s, [].concat(s.p)[0], rng)));
    const buildable = sens.filter((s) => {
      const n = NI.furi.parse(s.jp).length;
      return n >= 3 && n <= 6 && !/[。？！]/.test(NI.furi.base(s.jp).replace(/[。？！]$/, ""));
    });
    U.sample(buildable, 2, rng).forEach((s) => ex.push(T.build(s, rng)));
    const sits = [].concat(...units.map((u) => u.sit || []));
    U.sample(sits, 3, rng).forEach((s) => ex.push(T.situation(s, rng)));
    while (ex.length < 20 && words.length) ex.push(T.mcMeaning(U.pick(words, rng), rng));
    return U.shuffle(ex, rng).slice(0, 20).map((e) => Object.assign(e, { retry: null, noHint: true }));
  }

  NI.exercises = { T, lesson, practice, exam, builderAccepts, builderBlocks, wordDistractors, acceptedForWord, overlaps, FOCUS };
})(typeof window !== "undefined" ? window : globalThis);
