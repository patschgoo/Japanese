/* Review items. An item id names what is reviewed:
     v:食べる      a course word
     s:6:3         sentence 3 of unit 6
     p:food:2      phrase 2 of the "food" phrasebook section */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  let examples = null;

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
