/* Course model. Data files register units with NI.addUnit() and graded
   stories with NI.addStory(); NI.course.init() normalises them into words,
   sentences, dialogue lines and story lines with stable ids. A unit can bring
   its own grammar words (gwords) and names, which are taught in that unit. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  NI.data = NI.data || { units: [], grammar: [], names: [], phrases: [], lines: [] };
  NI.data.stories = NI.data.stories || [];
  NI.addUnit = (u) => NI.data.units.push(u);
  NI.addStory = (st) => NI.data.stories.push(st);

  const POS_LABEL = {
    n: "noun",
    "n-t": "time word",
    pron: "pronoun",
    pn: "pre-noun word",
    v1: "verb · group 2",
    v5: "verb · group 1",
    "v5k-s": "verb · group 1",
    "v5r-i": "verb · group 1",
    v5aru: "verb · group 1 (honorific)",
    vk: "verb · irregular",
    vs: "verb · irregular",
    "adj-i": "い-adjective",
    "adj-ix": "い-adjective",
    "adj-na": "な-adjective",
    adv: "adverb",
    exp: "expression",
    num: "number",
    ctr: "counter",
    suffix: "suffix",
    q: "question word",
    conj: "conjunction",
    int: "interjection",
  };

  const course = {
    units: [],
    words: [],
    sentences: [],
    lines: [],
    stories: [],
    byId: new Map(),
    POS_LABEL,
    inited: false,

    init() {
      if (this.inited) return this;
      const F = NI.furi;
      this.units = NI.data.units.slice().sort((a, b) => a.n - b.n);
      this.lines = NI.data.lines;
      const seen = new Map();
      for (const u of this.units) {
        for (const g of u.gwords || []) NI.data.grammar.push(Object.assign({ u: u.n }, g));
        for (const n of u.names || []) NI.data.names.push(n);
        u.words = (u.words || []).map((wd, i) => {
          const w = F.base(wd.j);
          const r = F.reading(wd.j);
          let id = "v:" + w;
          if (seen.has(id)) id += "|" + r;
          const word = Object.assign({}, wd, { id, w, r, unit: u.n, idx: i, kind: "word" });
          if (!word.em && NI.data.emoji && NI.data.emoji[id]) word.em = NI.data.emoji[id];
          if (NI.conj.isVerb(wd.pos)) {
            const f = NI.conj.forms(wd);
            word.head = f.masu; // ます-form is taught first and shown as the headword
            word.dict = wd.j;
          } else {
            word.head = wd.j;
          }
          seen.set(id, word);
          this.byId.set(id, word);
          return word;
        });
        u.sentences = (u.sentences || []).map((s, i) => {
          const sen = Object.assign({}, s, { id: "s:" + u.n + ":" + i, unit: u.n, kind: "sentence" });
          this.byId.set(sen.id, sen);
          return sen;
        });
        if (u.dialogue) {
          u.dialogue.lines = u.dialogue.lines.map((l, i) => {
            // ["*", "Scene description"] is narration; otherwise [speaker, japanese, english]
            const line = !Array.isArray(l) ? l : l[0] === "*" ? { who: "*", jp: "", en: l[1] } : { who: l[0], jp: l[1], en: l[2] };
            return Object.assign({}, line, { id: "d:" + u.n + ":" + i, unit: u.n, kind: "line" });
          });
        }
        this.words.push(...u.words);
        this.sentences.push(...u.sentences);
      }
      // Stories: [japanese, english] lines, readable once their unit is reached.
      this.stories = NI.data.stories.slice().sort((a, b) => a.unit - b.unit).map((st) =>
        Object.assign({}, st, {
          kind: "story",
          lines: st.lines.map((l, i) => ({ id: "t:" + st.id + ":" + i, jp: l[0], en: l[1], unit: st.unit, kind: "storyline" })),
        })
      );
      this.inited = true;
      return this;
    },

    unit(n) {
      return this.units.find((u) => u.n === Number(n)) || null;
    },
    story(id) {
      return this.stories.find((st) => st.id === id) || null;
    },
    get(id) {
      return this.byId.get(id) || null;
    },
    lineOf(n) {
      return this.lines.find((l) => l.units.indexOf(Number(n)) >= 0) || null;
    },
    code(n) {
      const line = this.lineOf(n);
      return (line ? line.id : "") + String(n).padStart(2, "0");
    },
    posLabel(pos) {
      return POS_LABEL[pos] || pos || "";
    },
    // The parts a learner completes in each unit.
    parts(u) {
      const half = Math.ceil(u.words.length / 2);
      const parts = [
        { key: "w1", title: "Words 1", words: u.words.slice(0, half) },
        { key: "w2", title: "Words 2", words: u.words.slice(half) },
        { key: "s", title: "Sentences" },
      ];
      if (u.dialogue) parts.push({ key: "d", title: "Conversation" });
      return parts.filter((p) => !p.words || p.words.length);
    },
  };

  NI.course = course;
})(typeof window !== "undefined" ? window : globalThis);
