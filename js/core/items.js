/* Review items. An item id names what is reviewed:
     v:食べる      a course word
     s:6:3         sentence 3 of unit 6
     p:food:2      phrase 2 of the "food" phrasebook section
     x:線          a word from the site's glossary, saved to the word book
     u:3           a word the learner added to their word book */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  let examples = null;

  // A word-like item: what lessons, reviews and tests need from a course word.
  function word(id, j, r, en, pos) {
    return { id, kind: "word", head: j, j, w: NI.furi.base(j), r: r || NI.furi.reading(j), en: en || "", pos: pos || "n", unit: 0 };
  }

  const items = {
    get(id) {
      if (id.startsWith("v:") || id.startsWith("s:")) {
        const it = NI.course.get(id);
        return it || null;
      }
      if (id.startsWith("p:")) {
        const [, cat, idx] = id.split(":");
        const sec = NI.data.phrases.find((p) => p.id === cat);
        const p = sec && sec.items[Number(idx)];
        return p ? Object.assign({ id, kind: "phrase", section: sec }, p) : null;
      }
      // Glossary and learner-added words look like course words from unit 0.
      if (id.startsWith("x:")) {
        const e = NI.lex.get(id);
        return e && e.kind === "extra" ? word(id, e.j, e.r, e.en, e.pos) : null;
      }
      if (id.startsWith("u:")) {
        const c = NI.store.state.books && NI.store.state.books.custom[id];
        return c ? Object.assign(word(id, c.j, c.r, c.en, c.pos), { custom: true }) : null;
      }
      return null;
    },

    /* The word-book id for a lexicon entry: a course word or one of its forms
       is its word, a glossary word (or its form) is the glossary word. Names,
       grammar and numbers can't be saved (null). */
    saveId(e) {
      if (!e) return null;
      if ((e.kind === "word" || e.kind === "form") && e.id && e.id.startsWith("v:")) return e.id;
      if (e.kind === "extra" && e.key) return e.key.split("#")[0];
      if (e.kind === "mine") return e.key;
      return null;
    },

    phraseId: (sec, idx) => "p:" + sec.id + ":" + idx,

    // The sentences of a unit that become review cards: its first five full sentences.
    keySentences(u) {
      return u.sentences.filter((s) => NI.furi.base(s.jp).length >= 4).slice(0, 5);
    },

    // Course sentences and dialogue lines that use a word, for “example” lines.
    examplesFor(wordId) {
      if (!examples) {
        examples = new Map();
        const add = (text, en, unit) => {
          const seen = new Set();
          for (const t of NI.lex.tokens(text)) {
            const id = t.entry && t.entry.id;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            if (!examples.has(id)) examples.set(id, []);
            examples.get(id).push({ jp: text, en, unit });
          }
        };
        for (const u of NI.course.units) {
          for (const s of u.sentences) add(s.jp, s.en, u.n);
          if (u.dialogue) for (const l of u.dialogue.lines) if (l.jp) add(l.jp, l.en, u.n);
        }
      }
      return examples.get(wordId) || [];
    },

    // The plainest example for a word: from its own unit, short, not the word alone.
    bestExample(word) {
      const list = this.examplesFor(word.id).filter((e) => NI.furi.base(e.jp) !== word.w + "。");
      if (!list.length) return null;
      const own = list.filter((e) => e.unit === word.unit);
      const pool = own.length ? own : list;
      return pool.slice().sort((a, b) => a.jp.length - b.jp.length)[0];
    },
  };

  NI.items = items;
})(typeof window !== "undefined" ? window : globalThis);
