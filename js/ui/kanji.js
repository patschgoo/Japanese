/* Kanji (漢字): the kanji in the course's words, unit by unit. Each has a
   card with its meaning, its on and kun readings, its stroke order (to
   watch, trace or write from memory) and the course words that use it, and
   any of them can go into the reviews as a card of its own (j:漢). Meanings
   and readings load with the page (js/data/kanji.js); the stroke data is
   larger and loads the first time strokes are shown (js/data/kanji-strokes.js). */
(function (root) {
  "use strict";
  const NI = root.NI;
  const U = NI.util;
  const ui = NI.ui;
  const esc = ui.esc;
  const doc = root.document;
  const pages = (NI.pages = NI.pages || {});

  const idOf = (k) => "j:" + k;

  // Every kanji in course order, with its first unit and the words that use it.
  let LIST = null;
  function list() {
    if (LIST) return LIST;
    const D = NI.data.kanji || {};
    const by = new Map();
    for (const w of NI.course.words) {
      for (const ch of new Set(Array.from(NI.furi.base(w.j)))) {
        if (!D[ch]) continue;
        if (!by.has(ch)) by.set(ch, { k: ch, unit: w.unit, words: [] });
        const e = by.get(ch);
        e.unit = Math.min(e.unit, w.unit);
        e.words.push(w);
      }
    }
    LIST = Array.from(by.values()).sort((a, b) => a.unit - b.unit);
    for (const e of LIST) e.words.sort((a, b) => a.unit - b.unit || NI.course.words.indexOf(a) - NI.course.words.indexOf(b));
    return LIST;
  }

  /* How many of the course's words read the kanji this way: an on reading
     appears in the word's reading (ショク in しょくじ, or ガク as がっ in
     がっこう); a kun reading's stem does, followed in the word by its first
     okurigana kana (た.べる in 食べます). */
  function uses(k, r, on, words) {
    const K = NI.kana;
    let n = 0;
    for (const w of words) {
      const rd = K.toHiragana(w.r);
      if (on) {
        const h = K.toHiragana(r);
        if (rd.indexOf(h) >= 0 || (h.length > 1 && /[くちつき]$/.test(h) && rd.indexOf(h.slice(0, -1) + "っ") >= 0)) n++;
      } else {
        const [stem, okuri] = r.split(".");
        const base = NI.furi.base(w.j);
        if (okuri ? base.indexOf(k + okuri[0]) >= 0 && rd.indexOf(stem + okuri[0]) >= 0 : rd.indexOf(stem) >= 0) n++;
      }
    }
    return n;
  }

  // Readings the course's words use come first (and are marked), then the rest.
  function ranked(k, rs, on, words) {
    return rs.map((r, i) => ({ r, i, n: uses(k, r, on, words) })).sort((a, b) => b.n - a.n || a.i - b.i);
  }

  function info(k) {
    const d = NI.data.kanji && NI.data.kanji[k];
    if (!d) return null;
    const e = list().find((x) => x.k === k) || { unit: 0, words: [] };
    const split = (x) => (x ? x.split(" ") : []);
    return { k, strokes: d[0], en: d[1], on: ranked(k, split(d[2]), true, e.words), kun: ranked(k, split(d[3]), false, e.words), unit: e.unit, words: e.words };
  }

  // The first sense of a meaning, for the grid: "bright, light; next (明日)" → "bright".
  const short = (en) => en.split(/[;,(]/)[0].trim();

  // How well it's known, from its review card: the kana chart's colours.
  function level(k) {
    const s = NI.store.state.srs[idOf(k)];
    if (!s) return "new";
    return s.st >= 5 ? "known" : "learning";
  }
  const LEVEL = { new: "Not in your reviews yet", learning: "In your reviews", known: "Known well" };

  // Kun readings mark the okurigana after a dot: た.べる shows as たべる with べる in grey.
  // Readings the course's words use are in bold.
  const readHtml = ({ r, n }) => {
    const [stem, okuri] = r.split(".");
    return '<span lang="ja"' + (n ? ' class="used"' : "") + ">" + esc(stem) + (okuri ? '<span class="okuri">' + esc(okuri) + "</span>" : "") + "</span>";
  };
  function readsHtml(x) {
    const used = x.on.concat(x.kun).some((y) => y.n);
    return (
      '<dl class="kj-reads">' +
      (x.on.length ? "<div><dt>On</dt><dd>" + x.on.map(readHtml).join("、") + "</dd></div>" : "") +
      (x.kun.length ? "<div><dt>Kun</dt><dd>" + x.kun.map(readHtml).join("、") + "</dd></div>" : "") +
      "</dl>" +
      (used ? '<p class="small muted kj-used">In bold: the readings in the course’s words.</p>' : "")
    );
  }

  // The stroke data, loaded the first time it's needed (it's built into the one-file version).
  let loading = null;
  function loadStrokes() {
    if (NI.data.kanjiStrokes) return Promise.resolve(true);
    if (loading) return loading;
    loading = new Promise((resolve) => {
      const s = doc.createElement("script");
      s.src = "js/data/kanji-strokes.js";
      s.onload = () => resolve(!!NI.data.kanjiStrokes);
      s.onerror = () => {
        loading = null;
        resolve(false);
      };
      doc.head.appendChild(s);
    });
    return loading;
  }

  // ---------------------------------------------------------------------------
  // The card for one kanji

  function sheet(k) {
    const x = info(k);
    const m = doc.getElementById("modal");
    if (!x || !m) return;
    ui.hidePop();
    const lv = level(k);
    const words = x.words.slice(0, 8);
    m.innerHTML =
      '<div class="modal-card kc-card kj-card" role="dialog" aria-modal="true" aria-labelledby="kj-title">' +
      '<div class="bd-head"><h2 id="kj-title"><span lang="ja">' + esc(k) + "</span> " + esc(x.en) + "</h2>" +
      '<button class="icon-btn" type="button" data-kj-close aria-label="Close">' + ui.ICON.close + "</button></div>" +
      readsHtml(x) +
      '<p class="small muted kj-meta">' + U.plural(x.strokes, "stroke") + (x.unit ? ' · first in <a href="#unit-' + x.unit + '">' + esc(NI.course.code(x.unit)) + "</a>" : "") + "</p>" +
      '<div class="kc-draw"><p class="small muted">Loading the stroke order…</p></div>' +
      '<div class="row center wrap kc-btns">' +
      '<button class="btn small ghost" type="button" data-kj="replay">' + ui.ICON.repeat + "<span>Replay</span></button>" +
      '<button class="btn small ghost" type="button" data-kj="trace">Trace it</button>' +
      '<button class="btn small ghost" type="button" data-kj="memory">From memory</button></div>' +
      (words.length
        ? '<h3 class="kj-h">In the course</h3><ul class="kc-words">' +
          words.map((w) => "<li>" + (NI.speech.supported ? ui.say(ui.wordAudio(w), w.r, "small") : "") + '<span class="jp">' + ui.jp(w.head, { tokens: false }) + "</span><span>" + esc(w.en) + "</span></li>").join("") +
          "</ul>"
        : "") +
      '<p class="kc-rec small lv-' + lv + '"><i aria-hidden="true"></i>' + esc(LEVEL[lv]) + "</p>" +
      (lv === "new" ? '<div class="row center"><button class="btn primary small" type="button" data-kj="add">Add to my reviews</button></div>' : "") +
      "</div>";
    m.hidden = false;
    const box = m.querySelector(".kc-draw");
    let anim = null;
    let mode = "watch";
    function show() {
      if (anim) anim.stop();
      if (!NI.strokes.has(k)) {
        box.innerHTML = '<p class="small muted">The stroke order couldn’t be loaded. Try again when you’re online.</p>';
        return;
      }
      if (mode === "trace" || mode === "memory") {
        box.innerHTML = '<div class="kc-pad"></div><p class="small muted kc-pad-note">' + (mode === "trace" ? "Trace each stroke from the dot, in order." : "Write it from memory, stroke by stroke.") + "</p>";
        NI.strokes.pad(box.querySelector(".kc-pad"), k, {
          guide: mode === "trace",
          arrows: mode === "trace",
          loose: mode === "memory",
          onStroke: (r) => NI.fx.play(r.ok ? "tick" : "wrong"),
          onDone: ({ mistakes }) => {
            NI.store.log("wr", 1);
            NI.fx.play(mistakes ? "chime" : "right");
          },
        });
        return;
      }
      box.innerHTML = '<div class="kc-diagrams kj-diagram">' + NI.strokes.diagram(k) + "</div>";
      anim = NI.strokes.animate(box);
    }
    loadStrokes().then(() => m.contains(box) && show());
    const close = () => {
      if (anim) anim.stop();
      m.hidden = true;
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
      if (e.target === m || e.target.closest("[data-kj-close]")) return close();
      if (e.target.closest('a[href^="#"]')) return close();
      const b = e.target.closest("[data-kj]");
      if (!b) return;
      const what = b.getAttribute("data-kj");
      if (what === "add") {
        NI.store.addItems([idOf(k)]);
        ui.toast(k + " is in your reviews now.");
        close();
        if (NI.app && doc.querySelector(".kj-page")) NI.app.render();
        return;
      }
      mode = what === "replay" ? "watch" : what;
      show();
    };
  }

  // ---------------------------------------------------------------------------
  // The page

  pages.kanji = {
    title: "Kanji",
    nav: "kana",
    render() {
      const all = list();
      const line = NI.store.state.intro.kanjiLine || "all";
      const lines = NI.data.lines;
      const inLine = (u) => line === "all" || (lines.find((l) => l.id === line) || { units: [] }).units.indexOf(u) >= 0;
      const lv = all.map((x) => level(x.k));
      const inRev = lv.filter((l) => l !== "new").length;
      const known = lv.filter((l) => l === "known").length;
      // The kanji of the units you've finished that aren't in your reviews yet.
      const doneUnits = NI.course.units.filter((u) => NI.course.parts(u).every((p) => NI.store.partDone(u.n, p.key))).map((u) => u.n);
      const ready = all.filter((x) => doneUnits.indexOf(x.unit) >= 0 && level(x.k) === "new");
      const units = NI.course.units.filter((u) => inLine(u.n) && all.some((x) => x.unit === u.n));
      return (
        '<div class="kj-page"><header class="page-head"><p class="crumb"><a href="#kana">← Kana</a></p><h1>Kanji <span class="sub">' + ui.jp("{漢字|かんじ}", { tokens: false }) + "</span></h1>" +
        "<p>The " + all.length + " kanji in the course’s words, unit by unit. Tap one for its meaning, its readings, how it’s written and the words you know it from. Put a unit’s kanji into your reviews to learn them for good.</p>" +
        '<p class="kj-sum"><b>' + inRev + "</b> in your reviews · <b>" + known + "</b> known well" + (ready.length ? ' · <button class="btn small primary" type="button" data-kj-ready>Add the ' + U.plural(ready.length, "kanji", "kanji") + " from units you’ve finished</button>" : "") + "</p>" +
        '<nav class="chips kj-lines" aria-label="Lines"><button type="button" class="chip small' + (line === "all" ? " on" : "") + '" data-kj-line="all" aria-pressed="' + (line === "all") + '">All</button>' +
        lines.map((l) => '<button type="button" class="chip small line-' + l.color + (line === l.id ? " on" : "") + '" data-kj-line="' + l.id + '" aria-pressed="' + (line === l.id) + '">' + esc(l.en) + "</button>").join("") +
        '</nav><p class="kc-legend small"><span class="lv-known"><i></i>Known well</span><span class="lv-learning"><i></i>In your reviews</span><span><i></i>Not yet</span></p></header>' +
        units
          .map((u) => {
            const ks = all.filter((x) => x.unit === u.n);
            const fresh = ks.filter((x) => level(x.k) === "new").length;
            return (
              '<section class="u-sec kj-unit" aria-labelledby="kj-u' + u.n + '"><h2 id="kj-u' + u.n + '"><a href="#unit-' + u.n + '">' + ui.stationCode(u.n) + " " + esc(u.en) + "</a></h2>" +
              '<div class="kj-unit-bar"><span class="small muted">' + U.plural(ks.length, "kanji", "kanji") + "</span>" + (fresh ? '<button class="btn small ghost" type="button" data-kj-unit="' + u.n + '">Add ' + (fresh === ks.length ? "them" : "the " + fresh + " new ones") + " to my reviews</button>" : '<span class="small muted">· all in your reviews</span>') + "</div>" +
              '<div class="kj-grid">' + ks.map((x) => '<button class="kc-cell kj-cell lv-' + level(x.k) + '" type="button" data-kj-k="' + esc(x.k) + '" aria-label="' + esc(x.k + ": " + x.en) + '"><b lang="ja">' + esc(x.k) + "</b><small>" + esc(short(NI.data.kanji[x.k][1])) + "</small></button>").join("") + "</div></section>"
            );
          })
          .join("") +
        '<p class="small muted kj-credit">Readings and stroke counts from KANJIDIC (EDRDG), stroke order from KanjiVG, both under Creative Commons Attribution-ShareAlike licences.</p></div>'
      );
    },
    mount(el, args) {
      const add = (ks) => {
        const n = NI.store.addItems(ks.map(idOf));
        ui.toast(n ? U.plural(n, "kanji", "kanji") + " added to your reviews. The first ones come up in about 4 hours." : "Those are all in your reviews already.");
        NI.app.render();
      };
      el.addEventListener("click", (e) => {
        const c = e.target.closest("[data-kj-k]");
        if (c) return sheet(c.getAttribute("data-kj-k"));
        const ln = e.target.closest("[data-kj-line]");
        if (ln) {
          NI.store.setIntro("kanjiLine", ln.getAttribute("data-kj-line"));
          return NI.app.render();
        }
        const u = e.target.closest("[data-kj-unit]");
        if (u) return add(list().filter((x) => x.unit === Number(u.getAttribute("data-kj-unit")) && level(x.k) === "new").map((x) => x.k));
        if (e.target.closest("[data-kj-ready]")) {
          const done = NI.course.units.filter((un) => NI.course.parts(un).every((p) => NI.store.partDone(un.n, p.key))).map((un) => un.n);
          add(list().filter((x) => done.indexOf(x.unit) >= 0 && level(x.k) === "new").map((x) => x.k));
        }
      });
      // #kanji-漢 opens that kanji's card.
      const k = args && args[0] ? decodeURIComponent(args[0]) : "";
      if (k && NI.data.kanji[k]) setTimeout(() => sheet(k), 0);
      // Fetch the stroke data while the page is read, so cards open with it.
      if (root.requestIdleCallback) root.requestIdleCallback(() => loadStrokes());
      else setTimeout(loadStrokes, 1500);
    },
    unmount() {
      const m = doc.getElementById("modal");
      if (m && m.querySelector(".kj-card")) {
        m.hidden = true;
        m.innerHTML = "";
      }
    },
  };

  // ---------------------------------------------------------------------------
  // In reviews: a kanji card shows the kanji; its back, the meaning, readings and words.

  function reviewFront(it) {
    return '<p class="kicker">What does this kanji mean, and how is it read?</p><div class="prompt-word hand kj-prompt" lang="ja">' + esc(it.k) + "</div>";
  }
  function reviewBack(it) {
    const x = info(it.k);
    const words = x.words.slice(0, 3);
    return (
      '<div class="rv-back"><div class="word-big hand kj-prompt" lang="ja">' + esc(it.k) + "</div>" +
      '<p class="word-en">' + esc(x.en) + "</p>" + readsHtml(x) +
      (words.length ? '<ul class="kc-words kj-rv-words">' + words.map((w) => "<li>" + (NI.speech.supported ? ui.say(ui.wordAudio(w), w.r, "small") : "") + '<span class="jp">' + ui.jp(w.head, { tokens: false }) + "</span><span>" + esc(w.en) + "</span></li>").join("") + "</ul>" : "") +
      '<p class="small"><a href="#kanji-' + encodeURIComponent(it.k) + '">Stroke order and all its words</a></p></div>'
    );
  }

  NI.kanji = { list, info, level, idOf, loadStrokes, open: sheet, reviewFront, reviewBack };
})(typeof window !== "undefined" ? window : globalThis);
