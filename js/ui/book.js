/* The word book (単語帳): words saved (the bookmark) from anywhere on the site, in
   lists the learner makes, words they add themselves, vocabulary tests and
   flashcards for any list, and learning profiles (each with its own
   progress, settings and word book). */
(function (root) {
  "use strict";
  const NI = root.NI;
  const U = NI.util;
  const ui = NI.ui;
  const esc = ui.esc;
  const doc = root.document;
  const pages = (NI.pages = NI.pages || {});

  const LIST_ICONS = ["📒", "📗", "📘", "📙", "🍣", "🍜", "🚄", "✈️", "🏯", "🛍️", "🏥", "💼", "🎮", "🎵", "❤️", "⭐"];
  const attr = (s) => String(s).replace(/["\\]/g, "\\$&");

  // ---------------------------------------------------------------------------
  // The bookmark: save a word from wherever it's shown

  const markSvg = (on) =>
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.8h10a1.2 1.2 0 0 1 1.2 1.2v15.2L12 16.4l-6.2 3.8V5A1.2 1.2 0 0 1 7 3.8z" fill="' + (on ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

  // A bookmark button for a word-book id (label: show "Save"/"Saved" beside it).
  function star(id, label) {
    if (!id) return "";
    const on = NI.store.isSaved(id);
    return (
      '<button class="wb-save' + (on ? " on" : "") + (label ? " labelled" : "") + '" type="button" data-save="' + esc(id) + '" aria-pressed="' + on + '" title="' + (on ? "In your word book: tap to remove" : "Save to your word book") + '">' +
      markSvg(on) + (label ? "<span>" + (on ? "Saved" : "Save") + "</span>" : '<span class="sr">Save to your word book</span>') + "</button>"
    );
  }

  // Every bookmark for a word on the page, after it was saved or removed.
  function syncStars(id) {
    const on = NI.store.isSaved(id);
    doc.querySelectorAll('[data-save="' + attr(id) + '"]').forEach((b) => {
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
      b.title = on ? "In your word book: tap to remove" : "Save to your word book";
      const svg = b.querySelector("svg path");
      if (svg) svg.setAttribute("fill", on ? "currentColor" : "none");
      const span = b.querySelector("span:not(.sr)");
      if (span) span.textContent = on ? "Saved" : "Save";
    });
  }

  function toggle(id) {
    if (NI.store.isSaved(id)) {
      const n = NI.store.listsOf(id).length;
      NI.store.unsaveWord(id);
      ui.toast(n ? "Removed from your word book and " + U.plural(n, "list") + "." : "Removed from your word book.");
    } else {
      NI.store.saveWord(id);
      ui.toast("Saved to your word book.");
    }
    syncStars(id);
    refreshPop(id);
  }

  // ---------------------------------------------------------------------------
  // In the word pop-up: save, and the lists the word is in

  function popBlock(entry) {
    const id = NI.items.saveId(entry);
    if (!id || !NI.items.get(id)) return "";
    return '<div class="pop-book" data-book="' + esc(id) + '">' + popInner(id) + "</div>";
  }

  function popInner(id) {
    const saved = NI.store.isSaved(id);
    const mine = NI.store.listsOf(id);
    let h = star(id, true);
    if (saved) {
      h += NI.store.books.lists.map((l) => '<button class="chip small' + (mine.indexOf(l.id) >= 0 ? " on" : "") + '" type="button" data-inlist="' + l.id + '" aria-pressed="' + (mine.indexOf(l.id) >= 0) + '">' + esc(l.icon + " " + l.name) + "</button>").join("");
      h += '<button class="chip small ghost" type="button" data-newlist>＋ New list</button>';
    }
    return h;
  }

  function refreshPop(id) {
    const box = doc.querySelector('#pop .pop-book[data-book="' + attr(id) + '"]');
    if (!box) return;
    box.innerHTML = popInner(id);
    const pop = doc.getElementById("pop");
    if (ui.popAnchor) ui.placePop(pop, ui.popAnchor);
  }

  // Lists chips and "New list" in the pop-up (the bookmark itself is handled by app.js).
  function bindPop(pop) {
    const box = pop.querySelector(".pop-book");
    if (!box) return;
    const id = box.getAttribute("data-book");
    box.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-inlist]");
      if (chip) {
        const lid = chip.getAttribute("data-inlist");
        const on = NI.store.listsOf(id).indexOf(lid) < 0;
        NI.store.setInList(id, lid, on);
        refreshPop(id);
        return;
      }
      if (e.target.closest("[data-newlist]")) {
        box.innerHTML =
          '<form class="nl-form"><label class="sr" for="nl-name">Name of the new list</label><input id="nl-name" type="text" maxlength="40" placeholder="New list, e.g. Food" autocomplete="off">' +
          '<button class="btn small primary" type="submit">Add</button></form>';
        const f = box.querySelector("form");
        f.querySelector("input").focus();
        f.addEventListener("submit", (ev) => {
          ev.preventDefault();
          const name = f.querySelector("input").value.trim();
          if (!name) return refreshPop(id);
          const lid = NI.store.newList(name, LIST_ICONS[NI.store.books.lists.length % LIST_ICONS.length]);
          NI.store.setInList(id, lid, true);
          ui.toast("Added to the new list “" + name + "”.");
          refreshPop(id);
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Sources: what a list page, a test or flashcards are about

  /* src: "all" (every saved word), "l3" (a list), "rev" (words in your
     reviews), "mis" (the mistakes notebook), "u4" or "u1.5" (course units). */
  function source(src) {
    const B = NI.store.books;
    const words = (ids) => U.uniq(ids).map((id) => NI.items.get(id)).filter((it) => it && it.kind === "word");
    if (src === "all") {
      const saved = B.saved;
      return { src, t: "All saved words", icon: "🔖", words: words(Object.keys(saved).sort((a, b) => saved[b] - saved[a])) };
    }
    const l = B.lists.find((x) => x.id === src);
    if (l) return { src, t: l.name, icon: l.icon, list: l, words: words(l.words) };
    if (src === "rev") {
      const srs = NI.store.state.srs;
      return { src, t: "Words in your reviews", icon: "🚃", words: words(Object.keys(srs).sort((a, b) => (srs[a].st || 0) - (srs[b].st || 0))) };
    }
    if (src === "mis") return { src, t: "Mistakes notebook", icon: "📝", words: words(Object.keys(NI.store.state.mistakes)) };
    const m = /^u(\d+)(?:\.(\d+))?$/.exec(src || "");
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2] || m[1]);
      const units = NI.course.units.filter((u) => u.n >= Math.min(a, b) && u.n <= Math.max(a, b));
      if (!units.length) return null;
      const t = units.length === 1 ? NI.course.code(units[0].n) + " " + units[0].en : "Units " + units[0].n + "–" + units[units.length - 1].n;
      return { src, t, icon: "🚉", words: [].concat(...units.map((u) => u.words)) };
    }
    return null;
  }

  function testLine(src) {
    const t = NI.store.testsOf(src);
    return t ? "last test " + t.last + "%" + (t.n > 1 ? ", best " + t.best + "%" : "") : "";
  }

  // ---------------------------------------------------------------------------
  // Adding your own word

  // Furigana markup for a word and its reading, with okurigana kept outside: 食べ物 + たべもの → {食|た}べ{物|もの}.
  function markupFor(text, reading) {
    const K = NI.kana;
    if (!K.hasKanji(text) || !reading) return text;
    const runs = Array.from(text).reduce((out, ch) => {
      const kanji = K.hasKanji(ch) || ch === "々";
      const last = out[out.length - 1];
      if (last && last.kanji === kanji) last.s += ch;
      else out.push({ kanji, s: ch });
      return out;
    }, []);
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("^" + runs.map((r) => (r.kanji ? "(.+?)" : escRe(K.toHiragana(r.s)))).join("") + "$");
    const m = re.exec(K.toHiragana(reading));
    if (!m) return "{" + text + "|" + reading + "}";
    let g = 1;
    return runs.map((r) => (r.kanji ? "{" + r.s + "|" + m[g++] + "}" : r.s)).join("");
  }

  const POS = [["n", "noun"], ["v", "verb"], ["adj-i", "い-adjective"], ["adj-na", "な-adjective"], ["adv", "adverb"], ["exp", "expression"]];

  function addForm(pre) {
    const p = pre || {};
    const lists = NI.store.books.lists;
    return (
      '<form class="b-add u-sec" autocomplete="off"><h2>' + (p.id ? "Edit your word" : "Add your own word") + "</h2>" +
      "<p class=\"small muted\">For words you meet outside the course: in a manga, a menu, a song. They can go into your reviews and tests like any other word.</p>" +
      '<div class="form-grid">' +
      '<label for="ba-jp">Japanese<input id="ba-jp" lang="ja" maxlength="30" required placeholder="推し, ラーメン, ありがと" value="' + esc(p.text || "") + '"></label>' +
      '<label for="ba-r">Reading in kana <small>(for kanji)</small><input id="ba-r" lang="ja" maxlength="40" placeholder="おし" value="' + esc(p.r || "") + '"></label>' +
      '<label for="ba-en">Meaning<input id="ba-en" maxlength="80" required placeholder="favourite (idol or character)" value="' + esc(p.en || "") + '"></label>' +
      '<label for="ba-pos">Kind of word<select id="ba-pos">' + POS.map(([v, t]) => '<option value="' + v + '"' + ((p.pos || "n") === v ? " selected" : "") + ">" + t + "</option>").join("") + "</select></label>" +
      (p.id ? "" : '<label for="ba-list">List<select id="ba-list"><option value="">Only in All saved words</option>' + lists.map((l) => '<option value="' + l.id + '"' + (p.list === l.id ? " selected" : "") + ">" + esc(l.icon + " " + l.name) + "</option>").join("") + "</select></label>") +
      "</div>" +
      (p.id ? "" : '<label class="toggle small" for="ba-srs"><input type="checkbox" id="ba-srs" checked><span><b>Add it to my reviews</b><small>It comes back for review like the course words.</small></span></label>') +
      '<p class="ba-err small" role="alert" hidden></p>' +
      '<div class="row wrap"><button class="btn primary" type="submit">' + (p.id ? "Save changes" : "Add the word") + '</button><button class="btn ghost" type="button" data-cancel>Cancel</button>' +
      (p.id ? '<button class="btn ghost danger-text" type="button" data-del-word>Delete this word</button>' : "") + "</div></form>"
    );
  }

  function bindForm(form, pre, done) {
    const p = pre || {};
    const jpIn = form.querySelector("#ba-jp");
    const rIn = form.querySelector("#ba-r");
    NI.kana.bindIme(jpIn);
    NI.kana.bindIme(rIn);
    const err = form.querySelector(".ba-err");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = jpIn.value.trim();
      const en = form.querySelector("#ba-en").value.trim();
      let r = NI.kana.toHiragana(rIn.value.trim());
      const K = NI.kana;
      const fail = (m) => {
        err.textContent = m;
        err.hidden = false;
      };
      if (!text || !/[぀-ヿ一-鿿々]/.test(text)) return fail("Type the word in Japanese: kana or kanji.");
      if (!en) return fail("Add what it means, so tests can ask about it.");
      if (K.hasKanji(text) && !r) return fail("Add its reading in kana (type it in romaji if you like).");
      if (r && !/^[ぁ-ゖー]+$/.test(r)) return fail("The reading should be kana only.");
      if (!K.hasKanji(text)) r = K.toHiragana(text);
      const w = { j: markupFor(text, r), r, en, pos: form.querySelector("#ba-pos").value };
      if (p.id) {
        NI.store.editCustom(p.id, w);
        ui.toast("Saved.");
        return done(p.id);
      }
      const id = NI.store.addCustom(w);
      const list = form.querySelector("#ba-list").value;
      if (list) NI.store.setInList(id, list, true);
      if (form.querySelector("#ba-srs").checked) NI.store.addItems([id]);
      ui.toast("“" + text + "” is in your word book.");
      done(id);
    });
    form.querySelector("[data-cancel]").addEventListener("click", () => done(null));
    const del = form.querySelector("[data-del-word]");
    if (del)
      del.addEventListener("click", () =>
        ui.confirm({ title: "Delete this word?", body: "It leaves your word book, your lists and your reviews.", ok: "Delete", danger: true }).then((yes) => {
          if (!yes) return;
          NI.store.removeCustom(p.id);
          ui.toast("Deleted.");
          done(null);
        })
      );
    setTimeout(() => (p.text ? form.querySelector(p.r ? "#ba-en" : "#ba-r") : jpIn).focus(), 30);
  }

  // From a look-up of an unknown word: open the form with it filled in.
  let prefill = null;
  function startAdd(text, reading) {
    prefill = { text, r: reading && NI.kana.hasKanji(text) ? reading : "" };
    ui.hidePop();
    NI.app.go("book-new");
  }

  // ---------------------------------------------------------------------------
  // The word book page and list pages

  const iconPicker = (name, icons, cur) =>
    '<div class="icon-pick" role="radiogroup" aria-label="Icon">' +
    icons.map((ic, i) => '<label><input type="radio" name="' + name + '" value="' + ic + '"' + (ic === cur || (!cur && i === 0) ? " checked" : "") + '><span aria-hidden="true">' + ic + '</span><span class="sr">Icon ' + (i + 1) + "</span></label>").join("") +
    "</div>";

  function card(href, icon, name, words, src) {
    const t = testLine(src);
    return '<a class="b-card" href="' + href + '"><span class="b-ic" aria-hidden="true">' + icon + '</span><span class="b-tx"><b>' + esc(name) + "</b><span>" + U.plural(words, "word") + (t ? " · " + t : "") + "</span></span></a>";
  }

  function overview(adding) {
    const B = NI.store.books;
    const all = source("all").words.length;
    const rev = source("rev").words.length;
    const mis = source("mis").words.length;
    return (
      '<header class="page-head"><h1>Word book <span class="sub">' + ui.jp("{単語帳|たんごちょう}", { tokens: false }) + "</span></h1>" +
      "<p>Save words wherever you meet them: tap any Japanese word and choose <b>Save</b>, or the bookmark beside a word on new-word cards, in reviews and in the word list. Sort them into lists, add words of your own, then test yourself.</p>" +
      '<div class="row wrap"><a class="btn primary" href="#vtest">Test yourself</a><button class="btn ghost" type="button" data-add>＋ Add your own word</button></div></header>' +
      (adding ? addForm(Object.assign({}, prefill)) : "") +
      '<section class="u-sec"><h2>Your lists</h2><div class="b-cards">' +
      card("#book-all", "🔖", "All saved words", all, "all") +
      B.lists.map((l) => card("#book-" + l.id, l.icon, l.name, l.words.filter((id) => NI.items.get(id)).length, l.id)).join("") +
      '<button class="b-card b-new" type="button" data-new-list><span class="b-ic" aria-hidden="true">＋</span><span class="b-tx"><b>New list</b><span>Food, verbs, for the trip…</span></span></button>' +
      "</div>" +
      '<form class="nl-form big" hidden><label for="nl-big">Name of the new list</label><div class="row wrap"><input id="nl-big" type="text" maxlength="40" placeholder="e.g. Food" autocomplete="off"><button class="btn primary" type="submit">Make the list</button></div>' + iconPicker("nl-icon", LIST_ICONS) + "</form>" +
      (all ? "" : '<p class="empty small">Nothing saved yet. Tap any Japanese word and choose <b>Save</b>, or tap the bookmark beside a word.</p>') +
      "</section>" +
      '<section class="u-sec"><h2>Also test yourself on</h2><div class="b-cards">' +
      card("#vtest-rev", "🚃", "Words in your reviews", rev, "rev") +
      card("#vtest-mis", "📝", "Your mistakes", mis, "mis") +
      '<a class="b-card" href="#vtest-u1.5"><span class="b-ic" aria-hidden="true">🚉</span><span class="b-tx"><b>Course units</b><span>Any unit or range, from the course word list</span></span></a>' +
      '<a class="b-card" href="#words"><span class="b-ic" aria-hidden="true">📚</span><span class="b-tx"><b>Every course word</b><span>' + NI.course.words.length + " words, searchable</span></span></a>" +
      "</div></section>"
    );
  }

  function wordRow(it, list) {
    const ls = NI.store.listsOf(it.id).map((id) => NI.store.books.lists.find((l) => l.id === id)).filter(Boolean);
    const where = it.custom ? '<span class="pos b-own">your word</span>' : it.unit ? '<a class="pos" href="#unit-' + it.unit + '">' + esc(NI.course.code(it.unit)) + "</a>" : '<span class="pos">not in the lessons</span>';
    return (
      '<li class="w-row b-row" data-id="' + esc(it.id) + '">' +
      '<div class="w-jp">' + ui.em(it) + ui.wordHead(it, { tokens: false }) + "</div>" +
      '<div class="w-en"><span class="w-mean">' + esc(it.en) + "</span> " + ui.posTag(it) + " " + where +
      (ls.length ? '<span class="b-tags">' + ls.map((l) => '<span class="b-tag">' + esc(l.icon + " " + l.name) + "</span>").join("") + "</span>" : "") + "</div>" +
      '<div class="w-side">' + ui.say(ui.wordAudio(it), it.r) + NI.views.tierBadge(it.id) +
      (it.custom ? '<button class="icon-btn" type="button" data-edit="' + esc(it.id) + '" title="Edit your word" aria-label="Edit"><span aria-hidden="true">✎</span></button>' : "") +
      '<button class="icon-btn" type="button" data-manage="' + esc(it.id) + '" title="Lists" aria-label="Lists for this word" aria-expanded="false"><span aria-hidden="true">⋯</span></button>' +
      (list ? '<button class="icon-btn" type="button" data-unlist="' + esc(it.id) + '" title="Take it off this list" aria-label="Take it off this list">' + ui.ICON.close + "</button>" : star(it.id)) +
      "</div>" +
      '<div class="b-manage" hidden></div></li>'
    );
  }

  const SORTS = [
    ["new", "Newest first"],
    ["kana", "あいうえお order"],
    ["course", "Course order"],
    ["weak", "Weakest first"],
  ];
  function sorted(words, how, src) {
    const list = words.slice();
    const srs = NI.store.state.srs;
    if (how === "kana") list.sort((a, b) => NI.kana.toHiragana(a.r).localeCompare(NI.kana.toHiragana(b.r), "ja"));
    else if (how === "course") list.sort((a, b) => (a.unit || 99) - (b.unit || 99) || NI.course.words.indexOf(a) - NI.course.words.indexOf(b));
    else if (how === "weak") list.sort((a, b) => (srs[a.id] ? srs[a.id].st : -1) - (srs[b.id] ? srs[b.id].st : -1));
    else if (src === "all") {
      const saved = NI.store.books.saved;
      list.sort((a, b) => (saved[b.id] || 0) - (saved[a.id] || 0));
    }
    return list;
  }

  function listPage(S) {
    const l = S.list;
    const missing = S.words.filter((w) => !NI.store.hasItem(w.id)).length;
    return (
      '<header class="page-head"><p class="crumb"><a href="#book">← Word book</a></p>' +
      '<h1><span aria-hidden="true">' + S.icon + "</span> " + esc(S.t) + ' <span class="sub">' + U.plural(S.words.length, "word") + "</span></h1>" +
      (testLine(S.src) ? '<p class="small muted">Tests: ' + testLine(S.src) + "</p>" : "") +
      (S.words.length ? '<div class="row wrap"><a class="btn primary" href="#vtest-' + S.src + '">Test this list</a><a class="btn ghost" href="#cards-' + S.src + '">Flashcards</a></div>' : "") +
      '<div class="row wrap b-more">' +
      (missing ? '<button class="btn small ghost" type="button" data-to-srs>Add ' + missing + " to my reviews</button>" : "") +
      (S.words.length ? '<button class="btn small ghost" type="button" data-copy>Copy as text</button>' : "") +
      (l ? '<button class="btn small ghost" type="button" data-rename>Rename</button><button class="btn small ghost danger-text" type="button" data-del-list>Delete list</button>' : '<button class="btn small ghost" type="button" data-add>＋ Add your own word</button>') +
      "</div>" +
      (l ? '<form class="nl-form big rename" hidden><label for="rn-name">Name</label><div class="row wrap"><input id="rn-name" type="text" maxlength="40" value="' + esc(l.name) + '"><button class="btn primary" type="submit">Save</button></div>' + iconPicker("rn-icon", LIST_ICONS, l.icon) + "</form>" : "") +
      "</header>" +
      '<div class="b-addbox"></div>' +
      (S.words.length
        ? '<div class="row wrap b-tools"><label class="sr" for="b-q">Search this list</label><input id="b-q" class="search" type="search" placeholder="Search: eat, たべる, taberu">' +
          '<label class="sr" for="b-sort">Sort</label><select id="b-sort">' + SORTS.map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join("") + "</select></div>"
        : "") +
      '<ul class="wordlist b-list"></ul>' +
      (S.words.length ? "" : '<p class="empty">' + (l ? "This list is empty. Tap any Japanese word, choose <b>Save</b>, then this list's name." : "Nothing saved yet. Tap any Japanese word and choose <b>Save</b>, or tap the bookmark beside a word.") + ' <a href="#words">Browse the course words</a></p>')
    );
  }

  // The lists a word is in, as switches, inside its row.
  function manageHtml(id) {
    const mine = NI.store.listsOf(id);
    const lists = NI.store.books.lists;
    return (
      '<p class="small muted">Lists for this word:</p><div class="chips">' +
      lists.map((l) => '<button class="chip small' + (mine.indexOf(l.id) >= 0 ? " on" : "") + '" type="button" data-inlist="' + l.id + '" aria-pressed="' + (mine.indexOf(l.id) >= 0) + '">' + esc(l.icon + " " + l.name) + "</button>").join("") +
      '<button class="chip small ghost" type="button" data-newlist>＋ New list</button>' +
      (NI.store.isSaved(id) ? '<button class="chip small ghost danger-text" type="button" data-unsave>Remove from the word book</button>' : "") +
      "</div>"
    );
  }

  pages.book = {
    title: "Word book",
    nav: "tools",
    render(args) {
      const a = args[0];
      if (!a || a === "new") return '<div class="book-page">' + overview(a === "new") + "</div>";
      const S = source(a);
      if (!S || (a !== "all" && !S.list)) return '<p class="empty">That list doesn\'t exist any more. <a href="#book">Back to the word book</a></p>';
      return '<div class="book-page">' + listPage(S) + "</div>";
    },
    mount(el, args) {
      const a = args[0];
      if (!a || a === "new") return mountOverview(el, a === "new");
      const S = source(a);
      if (S) mountList(el, S);
    },
  };

  function mountOverview(el, adding) {
    const form = el.querySelector(".b-add");
    if (form) {
      const pre = prefill;
      prefill = null;
      bindForm(form, pre, () => NI.app.go("book"));
    }
    const add = el.querySelector("[data-add]");
    if (add) add.addEventListener("click", () => (adding ? form.querySelector("input").focus() : NI.app.go("book-new")));
    const nl = el.querySelector(".nl-form.big");
    el.querySelector("[data-new-list]").addEventListener("click", () => {
      nl.hidden = false;
      nl.querySelector("input").focus();
    });
    nl.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = nl.querySelector("input").value.trim();
      if (!name) return nl.querySelector("input").focus();
      const icon = (nl.querySelector('input[name="nl-icon"]:checked') || {}).value;
      const id = NI.store.newList(name, icon);
      ui.toast("List made. Tap a word, choose Save, then this list.");
      NI.app.go("book-" + id);
    });
  }

  function mountList(el, S) {
    const box = el.querySelector(".b-list");
    const q = el.querySelector("#b-q");
    const sort = el.querySelector("#b-sort");
    const saved = NI.store.state.intro.bookSort;
    if (sort && saved) sort.value = saved;
    const draw = () => {
      const now = source(S.src);
      let words = sorted(now.words, sort ? sort.value : "new", S.src);
      const term = q ? q.value.trim().toLowerCase() : "";
      if (term) {
        const kana = NI.kana.fold(NI.kana.romajiToHiragana(term, true));
        words = words.filter((w) => w.en.toLowerCase().indexOf(term) >= 0 || w.w.indexOf(term) >= 0 || (kana && NI.kana.fold(w.r).indexOf(kana) >= 0));
      }
      box.innerHTML = words.map((w) => wordRow(w, !!S.list)).join("") || (term ? '<li class="empty">No words match “' + esc(q.value) + "”.</li>" : "");
    };
    draw();
    if (q) q.addEventListener("input", draw);
    if (sort)
      sort.addEventListener("change", () => {
        NI.store.setIntro("bookSort", sort.value);
        draw();
      });
    const addBox = el.querySelector(".b-addbox");
    const openForm = (pre) => {
      addBox.innerHTML = addForm(pre);
      bindForm(addBox.querySelector("form"), pre, () => NI.app.render());
      addBox.scrollIntoView({ block: "nearest" });
    };
    el.addEventListener("click", (e) => {
      const t = e.target;
      const row = t.closest(".b-row");
      const id = row && row.getAttribute("data-id");
      if (t.closest("[data-unlist]")) {
        NI.store.setInList(id, S.list.id, false);
        row.remove();
        ui.toast("Taken off “" + S.list.name + "”. It's still in All saved words.");
        return;
      }
      if (t.closest("[data-edit]")) {
        const c = NI.store.books.custom[id];
        if (c) openForm({ id, text: NI.furi.base(c.j), r: NI.kana.hasKanji(NI.furi.base(c.j)) ? c.r : "", en: c.en, pos: c.pos });
        return;
      }
      const man = t.closest("[data-manage]");
      if (man) {
        const m = row.querySelector(".b-manage");
        m.hidden = !m.hidden;
        man.setAttribute("aria-expanded", !m.hidden);
        if (!m.hidden) m.innerHTML = manageHtml(id);
        return;
      }
      const chip = t.closest(".b-manage [data-inlist]");
      if (chip) {
        const lid = chip.getAttribute("data-inlist");
        NI.store.setInList(id, lid, NI.store.listsOf(id).indexOf(lid) < 0);
        if (S.list && lid === S.list.id && NI.store.listsOf(id).indexOf(lid) < 0) return draw();
        row.querySelector(".b-manage").innerHTML = manageHtml(id);
        return;
      }
      if (t.closest(".b-manage [data-newlist]")) {
        const m = row.querySelector(".b-manage");
        m.innerHTML = '<form class="nl-form"><label class="sr" for="nl-row">Name of the new list</label><input id="nl-row" type="text" maxlength="40" placeholder="New list" autocomplete="off"><button class="btn small primary" type="submit">Add</button></form>';
        const f = m.querySelector("form");
        f.querySelector("input").focus();
        f.addEventListener("submit", (ev) => {
          ev.preventDefault();
          const name = f.querySelector("input").value.trim();
          if (name) NI.store.setInList(id, NI.store.newList(name, LIST_ICONS[NI.store.books.lists.length % LIST_ICONS.length]), true);
          m.innerHTML = manageHtml(id);
        });
        return;
      }
      if (t.closest(".b-manage [data-unsave]")) {
        NI.store.unsaveWord(id);
        ui.toast("Removed from your word book.");
        draw();
        return;
      }
      if (t.closest("[data-to-srs]")) {
        const ids = source(S.src).words.filter((w) => !NI.store.hasItem(w.id)).map((w) => w.id);
        const n = NI.store.addItems(ids);
        ui.toast(U.plural(n, "word") + " added to your reviews.");
        NI.app.render();
        return;
      }
      if (t.closest("[data-copy]")) {
        NI.copyText(source(S.src).words.map((w) => w.w + (w.r !== w.w ? " (" + w.r + ")" : "") + " — " + w.en).join("\n"));
        return;
      }
      if (t.closest("[data-add]")) return openForm({});
      if (t.closest("[data-rename]")) {
        const f = el.querySelector(".rename");
        f.hidden = !f.hidden;
        if (!f.hidden) f.querySelector("input").focus();
        return;
      }
      if (t.closest("[data-del-list]")) {
        ui.confirm({ title: "Delete “" + S.list.name + "”?", body: "The list goes, but its words stay in All saved words.", ok: "Delete the list", danger: true }).then((yes) => {
          if (!yes) return;
          NI.store.deleteList(S.list.id);
          ui.toast("List deleted.");
          NI.app.go("book");
        });
      }
    });
    // The bookmark on a row (in All saved words) takes the word out: redraw the list.
    el.addEventListener("ni-save", draw);
    const rn = el.querySelector(".rename");
    if (rn)
      rn.addEventListener("submit", (e) => {
        e.preventDefault();
        NI.store.editList(S.list.id, rn.querySelector("input").value, (rn.querySelector('input[name="rn-icon"]:checked') || {}).value);
        NI.app.render();
      });
  }

  // ---------------------------------------------------------------------------
  // Vocabulary tests

  const QTYPES = [
    ["meaning", "Meaning", "Japanese → English"],
    ["word", "Japanese", "English → Japanese"],
    ["listen", "Listening", "Hear it, find it"],
    ["type", "Type it", "English → type the Japanese"],
    ["reading", "Kanji reading", "Kanji → type the kana"],
  ];
  const fits = {
    meaning: (w) => !!w.en,
    word: (w) => !!w.en,
    listen: () => NI.speech.canListen,
    type: (w) => !!w.en && w.r.length <= 9 && w.pos !== "num" && w.pos !== "ctr",
    reading: (w) => NI.kana.hasKanji(w.w),
  };

  function testConfig() {
    return Object.assign({ types: ["meaning", "word", "listen"], n: "20", mode: "test", from: 1, to: 5 }, NI.store.state.intro.vtest || {});
  }

  /* The questions: each word in turn, with a question type it suits, until
     there are n. Wrong answers come from the same words where possible. */
  function buildTest(words, cfg, rng) {
    const T = NI.exercises.T;
    const types = cfg.types.filter((t) => fits[t] && (t !== "listen" || NI.speech.canListen));
    if (!types.length) types.push("meaning");
    const n = cfg.n === "all" ? words.length : Math.min(Number(cfg.n) || 20, words.length * types.length);
    const out = [];
    const used = new Map();
    let order = U.shuffle(words, rng);
    let k = 0;
    for (let i = 0; i < n * 3 && out.length < n; i++) {
      if (k >= order.length) {
        order = U.shuffle(words, rng);
        k = 0;
      }
      const w = order[k++];
      const done = used.get(w.id) || [];
      const ok = types.filter((t) => fits[t](w));
      if (!ok.length) continue;
      const fresh = ok.filter((t) => done.indexOf(t) < 0);
      const t = U.pick(fresh.length ? fresh : ok, rng);
      done.push(t);
      used.set(w.id, done);
      const ex = t === "meaning" ? T.mcMeaning(w, rng, words) : t === "word" ? T.mcWord(w, rng, words) : t === "listen" ? T.listen(w, rng, words) : t === "type" ? T.type(w, rng) : T.reading(w, rng);
      out.push(ex);
    }
    return out;
  }

  // Remembers which words were missed, without changing how exercises work.
  function tracked(ex, missed) {
    const mount = ex.mount;
    const id = ex.item;
    ex.mount = (card, api) => mount.call(ex, card, { done: (ok) => {
      if (ok === false && id && missed.indexOf(id) < 0) missed.push(id);
      api.done(ok);
    } });
    return ex;
  }

  function srcChips(cur) {
    const B = NI.store.books;
    const chip = (src, label, n) => '<button class="chip' + (cur === src ? " on" : "") + '" type="button" data-src="' + src + '" aria-pressed="' + (cur === src) + '"' + (n ? "" : " disabled") + ">" + label + ' <small>' + n + "</small></button>";
    const all = source("all").words.length;
    return (
      chip("all", "🔖 All saved", all) +
      B.lists.map((l) => chip(l.id, esc(l.icon + " " + l.name), source(l.id).words.length)).join("") +
      chip("rev", "🚃 In your reviews", source("rev").words.length) +
      chip("mis", "📝 Mistakes", source("mis").words.length) +
      '<button class="chip' + (/^u/.test(cur) ? " on" : "") + '" type="button" data-src="units" aria-pressed="' + /^u/.test(cur) + '">🚉 Course units</button>'
    );
  }

  pages.vtest = {
    title: "Vocabulary test",
    nav: "tools",
    render() {
      return '<div class="vt"></div>';
    },
    mount(el, args) {
      const box = el.querySelector(".vt");
      let cfg = testConfig();
      // The source asked for, or else the first one with words in it.
      let src = args.length ? args.join("-") : null;
      if (!src || !source(src) || !source(src).words.length) {
        const order = ["all"].concat(NI.store.books.lists.map((l) => l.id), ["rev", "mis"]);
        src = order.find((x) => source(x).words.length) || "u" + cfg.from + "." + cfg.to;
      }
      if (/^u/.test(src)) {
        const m = /^u(\d+)(?:\.(\d+))?$/.exec(src);
        cfg.from = Number(m[1]);
        cfg.to = Number(m[2] || m[1]);
      }
      const save = () => NI.store.setIntro("vtest", { types: cfg.types, n: cfg.n, mode: cfg.mode, from: cfg.from, to: cfg.to });
      const unitOpts = (v) => NI.course.units.map((u) => '<option value="' + u.n + '"' + (u.n === v ? " selected" : "") + ">" + esc(NI.course.code(u.n) + " " + u.en) + "</option>").join("");

      function setup() {
        const S = source(src);
        const words = S ? S.words : [];
        box.innerHTML =
          '<header class="page-head"><p class="crumb"><a href="#book">← Word book</a></p><h1>Vocabulary test <span class="sub">' + ui.jp("{単語|たんご}テスト", { tokens: false }) + "</span></h1>" +
          "<p>Test yourself on a list, your saved words or the course's words. Each list keeps its last and best score.</p></header>" +
          '<section class="u-sec vt-setup">' +
          '<h2>What to test</h2><div class="chips vt-src">' + srcChips(src) + "</div>" +
          (/^u/.test(src) ? '<div class="row wrap vt-units"><label for="vt-from">From<select id="vt-from">' + unitOpts(cfg.from) + '</select></label><label for="vt-to">to<select id="vt-to">' + unitOpts(cfg.to) + "</select></label></div>" : "") +
          '<p class="small muted vt-info">' + (S ? esc(S.t) + ": " + U.plural(words.length, "word") + (testLine(src) ? " · " + testLine(src) : "") : "") + "</p>" +
          "<h2>Questions</h2><div class=\"chips vt-types\">" +
          QTYPES.map(([id, t, d]) => {
            const on = cfg.types.indexOf(id) >= 0;
            const off = id === "listen" && !NI.speech.canListen;
            return '<button class="chip' + (on && !off ? " on" : "") + '" type="button" data-type="' + id + '" aria-pressed="' + (on && !off) + '"' + (off ? ' disabled title="No Japanese voice on this device"' : "") + "><b>" + t + "</b> <small>" + d + "</small></button>";
          }).join("") + "</div>" +
          '<h2>How many questions</h2><div class="seg" role="group" aria-label="How many questions">' + ["10", "20", "30", "all"].map((v) => '<button type="button" class="seg-b' + (cfg.n === v ? " on" : "") + '" data-n="' + v + '">' + (v === "all" ? "One per word" : v) + "</button>").join("") + "</div>" +
          '<h2>Mode</h2><div class="chips vt-types" role="group" aria-label="Mode">' +
          [["test", "Test", "Scored, no hints, no look-ups"], ["practise", "Practise", "Hints, and missed ones come back"]].map(([v, t, d]) => '<button class="chip' + (cfg.mode === v ? " on" : "") + '" type="button" data-mode="' + v + '" aria-pressed="' + (cfg.mode === v) + '"><b>' + t + "</b> <small>" + d + "</small></button>").join("") + "</div>" +
          '<div class="row center"><button class="btn primary big" type="button" data-go' + (words.length ? "" : " disabled") + ">Start</button></div>" +
          (words.length ? "" : '<p class="empty small">No words here yet. Save some to your word book, or pick the course units.</p>') +
          "</section>";
        box.querySelectorAll("[data-src]").forEach((b) =>
          b.addEventListener("click", () => {
            const v = b.getAttribute("data-src");
            src = v === "units" ? "u" + cfg.from + "." + cfg.to : v;
            setup();
          })
        );
        const from = box.querySelector("#vt-from");
        const to = box.querySelector("#vt-to");
        const units = () => {
          cfg.from = Number(from.value);
          cfg.to = Number(to.value);
          src = "u" + Math.min(cfg.from, cfg.to) + "." + Math.max(cfg.from, cfg.to);
          save();
          setup();
        };
        if (from) from.addEventListener("change", units);
        if (to) to.addEventListener("change", units);
        box.querySelectorAll("[data-type]").forEach((b) =>
          b.addEventListener("click", () => {
            const id = b.getAttribute("data-type");
            const i = cfg.types.indexOf(id);
            if (i >= 0 && cfg.types.length > 1) cfg.types.splice(i, 1);
            else if (i < 0) cfg.types.push(id);
            save();
            setup();
          })
        );
        box.querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => ((cfg.n = b.getAttribute("data-n")), save(), setup())));
        box.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => ((cfg.mode = b.getAttribute("data-mode")), save(), setup())));
        const go = box.querySelector("[data-go]");
        go.addEventListener("click", () => run(words));
        if (!go.disabled) go.focus({ preventScroll: true });
      }

      function run(words, again) {
        const S = source(src) || { t: "Missed words" };
        const test = cfg.mode === "test";
        const missed = [];
        const exercises = buildTest(words, cfg, U.rng(Date.now())).map((ex) => {
          tracked(ex, missed);
          return test ? Object.assign(ex, { retry: null, noHint: true }) : ex;
        });
        box.innerHTML = '<div class="session' + (test ? " vt-test" : "") + '" id="sess"></div>';
        const sess = box.querySelector("#sess");
        NI.session.runExercises(sess, {
          title: esc(again ? "Missed words" : S.t),
          sub: test ? "Vocabulary test" : "Practice",
          exercises,
          exam: test,
          quitTo: "vtest-" + src,
          quitBody: "This test won't be scored.",
          onFinish(sum) {
            const pct = sum.graded ? Math.round((sum.right / sum.graded) * 100) : 0;
            if (test && !again) NI.store.logTest(src, sum.right, sum.graded);
            const res = NI.fx.gain(sum.xp, { inline: true });
            if (test && pct === 100 && sum.graded >= 10) {
              NI.fx.play("level");
              NI.fx.confetti(sess);
            }
            const miss = missed.map((id) => NI.items.get(id)).filter(Boolean);
            return (
              '<div class="finish">' + (pct >= 80 ? NI.session.hanamaru() : "") +
              "<h2>" + ui.jp(pct === 100 ? "{満点|まんてん}！" : pct >= 80 ? "{合格|ごうかく}！" : "もう{一度|いちど}！", { tokens: false }) + "</h2>" +
              '<p class="finish-en">' + sum.right + " of " + sum.graded + " right (" + pct + "%)." + (test && !again && testLine(src) ? " " + esc(S.t) + ": " + testLine(src) + "." : "") + "</p>" +
              NI.session.xpBlock(res, [["Answers", sum.xp]]) +
              (miss.length
                ? '<section class="vt-missed"><h3>Missed</h3><ul class="wordlist">' + miss.map((w) => NI.views.wordRow(w)).join("") + "</ul>" +
                  '<div class="row center wrap"><button class="btn primary" type="button" data-again>Test the missed ones</button><button class="btn ghost" type="button" data-keep>Save them to a list</button></div></section>'
                : "") +
              '<div class="row center wrap"><button class="btn ' + (miss.length ? "ghost" : "primary") + '" type="button" data-new>New test</button>' + (S.list || src === "all" ? '<a class="btn ghost" href="#book-' + src + '">Back to the list</a>' : '<a class="btn ghost" href="#book">Word book</a>') + "</div></div>"
            );
          },
          mount(b) {
            const miss = missed.map((id) => NI.items.get(id)).filter(Boolean);
            const again = b.querySelector("[data-again]");
            if (again) again.addEventListener("click", () => run(miss, true));
            const keep = b.querySelector("[data-keep]");
            if (keep)
              keep.addEventListener("click", () => {
                let l = NI.store.books.lists.find((x) => x.name === "To practise");
                const id = l ? l.id : NI.store.newList("To practise", "🔁");
                for (const w of miss) NI.store.setInList(w.id, id, true);
                ui.toast(U.plural(miss.length, "word") + " saved to “To practise”.");
                keep.disabled = true;
              });
            b.querySelector("[data-new]").addEventListener("click", setup);
          },
        });
      }

      setup();
    },
    unmount() {
      NI.session.setKeys(null);
      NI.speech.stop();
    },
  };

  // ---------------------------------------------------------------------------
  // Flashcards: turn a card over, then say whether you knew it

  pages.cards = {
    title: "Flashcards",
    nav: "tools",
    render() {
      return '<div class="fc-page"></div>';
    },
    mount(el, args) {
      const box = el.querySelector(".fc-page");
      const src = args.join("-") || "all";
      const S = source(src);
      if (!S || !S.words.length) {
        box.innerHTML = '<p class="empty">No words to show. <a href="#book">Back to the word book</a></p>';
        return;
      }
      const opts = Object.assign({ front: "jp" }, NI.store.state.intro.cards || {});
      let deck = [];
      let knew = 0;
      let total = 0;
      const start = () => {
        deck = U.shuffle(S.words).map((w) => ({ w, misses: 0 }));
        total = deck.length;
        knew = 0;
        show();
      };
      // The other side: the meaning for a Japanese front, the word for an English one.
      const back = (w) => {
        const ex = w.unit ? NI.items.bestExample(w) : null;
        return (
          (opts.front === "en" ? '<div class="word-big hand"' + ui.fit(w.head) + ">" + ui.wordHead(w, { tokens: false }) + "</div>" + ui.say(ui.wordAudio(w), w.r) : "") +
          (ui.romajiOn() ? '<p class="pop-ro center">' + esc(NI.kana.romaji(w.r)) + "</p>" : "") +
          (opts.front === "en" ? "" : '<p class="word-en">' + esc(w.en) + "</p>") + '<p class="word-meta">' + ui.posTag(w) + "</p>" +
          (ex ? '<div class="word-ex">' + ui.jp(ex.jp) + ui.say(ui.sentenceAudio(ex.jp)) + '<p class="en">' + esc(ex.en) + "</p></div>" : "")
        );
      };
      function show() {
        if (!deck.length) return finish();
        const c = deck[0];
        const w = c.w;
        const front =
          opts.front === "en"
            ? '<p class="kicker">Do you know the Japanese?</p><p class="prompt-en">' + (w.em ? '<span class="em" aria-hidden="true">' + w.em + "</span> " : "") + esc(w.en) + "</p>"
            : '<p class="kicker">Do you know what it means?</p><div class="prompt-word hand"' + ui.fit(w.head) + ">" + ui.jp(w.head, { tokens: false }) + ui.say(ui.wordAudio(w), w.r) + "</div>";
        box.innerHTML =
          '<div class="sess-top"><a class="icon-btn" href="' + (S.list || src === "all" ? "#book-" + src : "#book") + '" aria-label="Leave">' + ui.ICON.close + "</a>" +
          '<div class="sess-title"><b>' + esc(S.icon + " " + S.t) + "</b><span>Flashcards · " + knew + " of " + total + " known</span></div>" +
          '<div class="seg small" role="group" aria-label="Front of the card"><button type="button" class="seg-b' + (opts.front === "jp" ? " on" : "") + '" data-front="jp">日本語</button><button type="button" class="seg-b' + (opts.front === "en" ? " on" : "") + '" data-front="en">English</button></div></div>' +
          '<div class="sess-bar">' + ui.progressBar(knew / total, "Progress") + "</div>" +
          '<div class="rv fc"><div class="rv-front">' + front + '</div><div class="rv-reveal"></div>' +
          '<div class="row center"><button class="btn primary" type="button" data-turn>Turn over <kbd>Space</kbd></button></div></div>';
        if (opts.front === "jp" && NI.store.settings.autoplay) setTimeout(() => NI.speech.speak(ui.wordAudio(w)), 120);
        box.querySelectorAll("[data-front]").forEach((b) =>
          b.addEventListener("click", () => {
            opts.front = b.getAttribute("data-front");
            NI.store.setIntro("cards", opts);
            show();
          })
        );
        box.querySelector("[data-turn]").addEventListener("click", turn);
        box.querySelector("[data-turn]").focus({ preventScroll: true });
      }
      function turn() {
        const c = deck[0];
        const rv = box.querySelector(".rv");
        if (!rv || rv.querySelector(".rv-back")) return;
        rv.querySelector(".rv-reveal").innerHTML = '<div class="rv-back">' + back(c.w) + "</div>";
        rv.querySelector(".row").innerHTML = '<button class="btn ghost" type="button" data-again>Not yet <kbd>1</kbd></button><button class="btn primary" type="button" data-knew>I knew it <kbd>2</kbd></button>';
        if (opts.front === "en" && NI.store.settings.autoplay) NI.speech.speak(ui.wordAudio(c.w));
        rv.querySelector("[data-again]").addEventListener("click", () => grade(false));
        rv.querySelector("[data-knew]").addEventListener("click", () => grade(true));
        rv.querySelector("[data-knew]").focus({ preventScroll: true });
      }
      // Known cards leave the deck; the others come back a few cards later.
      function grade(ok) {
        const c = deck.shift();
        NI.store.log("fc", 1);
        if (ok) knew++;
        else {
          c.misses++;
          deck.splice(Math.min(3, deck.length), 0, c);
        }
        show();
      }
      function finish() {
        NI.session.setKeys(null);
        box.innerHTML =
          '<div class="finish">' + NI.session.hanamaru() + "<h2>" + ui.jp("おつかれさま！", { tokens: false }) + "</h2>" +
          '<p class="finish-en">You went through all ' + U.plural(total, "card") + ".</p>" +
          '<div class="row center wrap"><button class="btn primary" type="button" data-again>Go again</button><a class="btn ghost" href="#vtest-' + src + '">Test yourself</a>' +
          '<a class="btn ghost" href="' + (S.list || src === "all" ? "#book-" + src : "#book") + '">Back to the list</a></div></div>';
        box.querySelector("[data-again]").addEventListener("click", () => {
          start();
          keys();
        });
      }
      const keys = () =>
        NI.session.setKeys((e) => {
          if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
          const turned = box.querySelector(".rv .rv-back");
          if ((e.key === " " || e.key === "Enter") && !turned && box.querySelector("[data-turn]")) {
            e.preventDefault();
            turn();
          } else if (turned && (e.key === "1" || e.key === "2")) {
            e.preventDefault();
            grade(e.key === "2");
          }
        });
      keys();
      start();
    },
    unmount() {
      NI.session.setKeys(null);
      NI.speech.stop();
    },
  };

  // ---------------------------------------------------------------------------
  // Learning profiles

  function profileMenu(anchor) {
    const pop = doc.getElementById("pop");
    const cur = NI.store.profile;
    pop.innerHTML =
      '<div class="pm"><p class="pm-h">Learning profile</p>' +
      NI.store.profiles.map((p) => '<button class="pm-row' + (p.id === cur.id ? " on" : "") + '" type="button" data-prof="' + esc(p.id) + '"' + (p.id === cur.id ? ' aria-current="true"' : "") + '><span class="pm-ic" aria-hidden="true">' + p.icon + "</span><b>" + esc(p.name) + "</b>" + (p.id === cur.id ? '<span class="pm-tick">✓</span>' : "") + "</button>").join("") +
      '<div class="pm-acts"><a href="#profiles-new" class="btn small ghost">＋ New profile</a><a href="#profiles" class="btn small ghost">Manage</a></div></div>';
    ui.placePop(pop, anchor);
    pop.querySelectorAll("[data-prof]").forEach((b) =>
      b.addEventListener("click", () => {
        ui.hidePop();
        switchTo(b.getAttribute("data-prof"));
      })
    );
  }

  function switchTo(id) {
    if (!NI.store.switchProfile(id)) return;
    const p = NI.store.profile;
    ui.toast(p.icon + " " + p.name + ": おかえり！");
  }

  pages.profiles = {
    title: "Learning profiles",
    nav: "options",
    render(args) {
      const cur = NI.store.profile;
      const many = NI.store.profiles.length > 1;
      const row = (p) => {
        const n = NI.store.peek(p.id);
        const on = p.id === cur.id;
        return (
          '<li class="prof' + (on ? " on" : "") + '" data-id="' + esc(p.id) + '"><span class="prof-ic" aria-hidden="true">' + p.icon + "</span>" +
          '<div class="prof-tx"><b>' + esc(p.name) + "</b>" + (on ? ' <span class="tag">In use</span>' : "") + "<span>" + n.xp + " XP · " + U.plural(n.words, "word") + " in reviews · " + U.plural(n.days, "day") + " of practice</span></div>" +
          '<div class="prof-acts">' + (on ? "" : '<button class="btn small primary" type="button" data-use>Use</button>') + '<button class="btn small ghost" type="button" data-rename>Rename</button>' + (many ? '<button class="btn small ghost danger-text" type="button" data-del>Delete</button>' : "") + "</div>" +
          '<form class="prof-edit" hidden><label for="pe-' + esc(p.id) + '">Name</label><div class="row wrap"><input id="pe-' + esc(p.id) + '" type="text" maxlength="30" value="' + esc(p.name) + '"><button class="btn small primary" type="submit">Save</button></div>' + iconPicker("pi-" + p.id, NI.store.ICONS, p.icon) + "</form></li>"
        );
      };
      return (
        '<header class="page-head"><p class="crumb"><a href="#options">← Options</a></p><h1>Learning profiles <span class="sub">' + ui.jp("プロフィール", { tokens: false }) + "</span></h1>" +
        "<p>Each profile is its own learner: its own progress, reviews, word book, plan and settings. Make one for each person learning on this device, or a fresh start for yourself, and switch with the button at the top of the page.</p></header>" +
        '<ul class="prof-list">' + NI.store.profiles.map(row).join("") + "</ul>" +
        '<form class="u-sec prof-new" autocomplete="off"><h2>New profile</h2>' +
        '<label for="pn-name">Name</label><input id="pn-name" type="text" maxlength="30" placeholder="e.g. Sam, or Katakana" required>' +
        "<fieldset><legend>Icon</legend>" + iconPicker("pn-icon", NI.store.ICONS, NI.store.ICONS[NI.store.profiles.length % NI.store.ICONS.length]) + "</fieldset>" +
        '<fieldset><legend>Start with</legend>' +
        '<label class="radio" for="pn-fresh"><input type="radio" id="pn-fresh" name="pn-start" value="fresh" checked><span><b>A fresh start</b><small>Default settings, and the plan questions first.</small></span></label>' +
        '<label class="radio" for="pn-copy"><input type="radio" id="pn-copy" name="pn-start" value="copy"><span><b>The settings of ' + esc(cur.icon + " " + cur.name) + "</b><small>Same plan, reading aids and audio; no progress.</small></span></label></fieldset>" +
        '<div class="row"><button class="btn primary" type="submit">Make it and switch to it</button></div></form>' +
        '<p class="small muted">Profiles are kept in this browser. To move one to another device, open it and use Copy backup in Options.</p>'
      );
    },
    mount(el, args) {
      el.querySelectorAll(".prof").forEach((li) => {
        const id = li.getAttribute("data-id");
        const use = li.querySelector("[data-use]");
        if (use) use.addEventListener("click", () => switchTo(id));
        li.querySelector("[data-rename]").addEventListener("click", () => {
          const f = li.querySelector(".prof-edit");
          f.hidden = !f.hidden;
          if (!f.hidden) f.querySelector("input").focus();
        });
        li.querySelector(".prof-edit").addEventListener("submit", (e) => {
          e.preventDefault();
          NI.store.editProfile(id, li.querySelector(".prof-edit input[type=text]").value, (li.querySelector(".prof-edit input[type=radio]:checked") || {}).value);
          NI.app.render();
        });
        const del = li.querySelector("[data-del]");
        if (del)
          del.addEventListener("click", () => {
            const p = NI.store.profiles.find((x) => x.id === id);
            ui.confirm({ title: "Delete " + p.icon + " " + p.name + "?", body: "Its progress, reviews and word book are deleted for good. Copy a backup in Options first if you might want it back.", ok: "Delete the profile", danger: true }).then((yes) => {
              if (!yes) return;
              NI.store.removeProfile(id);
              ui.toast("Profile deleted.");
              NI.app.render();
            });
          });
      });
      const f = el.querySelector(".prof-new");
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = f.querySelector("#pn-name").value.trim();
        if (!name) return f.querySelector("#pn-name").focus();
        const icon = (f.querySelector('input[name="pn-icon"]:checked') || {}).value;
        const copy = (f.querySelector('input[name="pn-start"]:checked') || {}).value === "copy";
        NI.store.addProfile(name, icon, copy);
        ui.toast(icon + " " + name + ": ようこそ！");
        NI.app.go("home");
      });
      if (args[0] === "new") {
        f.scrollIntoView({ block: "start" });
        f.querySelector("#pn-name").focus({ preventScroll: true });
      }
    },
  };

  // The profile button in the top bar.
  function profileButton() {
    const b = doc.getElementById("profbtn");
    if (!b) return;
    const p = NI.store.profile;
    b.innerHTML = '<span aria-hidden="true">' + p.icon + "</span>";
    b.setAttribute("aria-label", "Learning profile: " + p.name);
    b.title = "Profile: " + p.name;
  }

  NI.book = { star, toggle, syncStars, popBlock, bindPop, source, startAdd, markupFor, buildTest, profileMenu, profileButton, LIST_ICONS };
})(typeof window !== "undefined" ? window : globalThis);
