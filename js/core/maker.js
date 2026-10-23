/* Sentence Maker: builds a correct Japanese sentence (and its English) from a
   pattern, chosen fillers and settings — polite or plain, present or past,
   yes or no, and a mood (statement, want to, let's, please, can, question).
   No DOM here, so tools/validate.js can check every filler. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});

  const PATTERNS = [
    { id: "action", t: "Doing things", ja: "〜を〜ます", slots: ["time", "place", "verb", "obj"], moods: true, d: "What you do, when and where: 毎朝 家で コーヒーを 飲みます。" },
    { id: "go", t: "Going places", ja: "〜に行きます", slots: ["with", "place", "how", "verb"], moods: true, d: "Where you go, how, and with whom: 友達と 京都に 電車で 行きます。" },
    { id: "is", t: "Saying who someone is", ja: "AはBです", slots: ["topic", "noun"], d: "The basic frame: 私は 学生です。" },
    { id: "adj", t: "Describing things", ja: "Aは〜いです", slots: ["topic", "adj"], d: "い- and な-adjectives: この町は 静かです。" },
    { id: "exist", t: "There is…", ja: "〜があります", slots: ["place", "thing"], d: "あります for things, います for people and animals." },
    { id: "like", t: "Likes and skills", ja: "〜が好きです", slots: ["thing", "feel"], d: "好き, 嫌い, 上手 and 下手 take が." },
  ];

  const MOODS = [
    ["statement", "Statement"],
    ["question", "Question"],
    ["want", "Want to"],
    ["lets", "Let’s"],
    ["please", "Please"],
    ["can", "Can"],
  ];

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const join = (...xs) => xs.filter(Boolean).join(" ");

  // The verb ending for a mood, tense, polarity and style.
  function verbForm(v, sel) {
    const f = NI.conj.forms({ j: v.j, pos: v.pos });
    const neg = sel.pol === "neg";
    const past = sel.tense === "past";
    const polite = sel.style !== "plain";
    const statement = polite ? (past ? (neg ? f.masendeshita : f.mashita) : neg ? f.masen : f.masu) : past ? (neg ? f.nakatta : f.ta) : neg ? f.nai : f.dict;
    switch (sel.mood) {
      case "want": {
        const w = past ? (neg ? f.takunakatta : f.takatta) : neg ? f.takunai : f.tai;
        return polite ? w + "です" : w;
      }
      case "lets":
        return polite ? f.mashou : f.vol;
      case "please":
        return neg ? f.naide + (polite ? "ください" : "") : polite ? f.tekudasai : f.te;
      case "can":
        if (!f.pot) return statement;
        if (polite) return past ? (neg ? f.potmasendeshita : f.potmashita) : neg ? f.potmasen : f.potmasu;
        return past ? (neg ? f.potnakatta : f.potta) : neg ? f.potnai : f.pot;
      case "question":
        return statement + (polite ? "か" : "");
      default:
        return statement;
    }
  }

  // Whether an adjective suits a topic: hot weather is 暑い, but hot ramen is 熱い.
  function fits(topic, adj) {
    return !adj[3] || !topic[2] || adj[3].split(" ").indexOf(topic[2]) >= 0;
  }

  // "my homework" is yours in a question or a request, and ours with “let's”.
  function whose(en, mood) {
    if (mood === "question" || mood === "please") return en.replace(/\bmy\b/, "your");
    if (mood === "lets") return en.replace(/\bmy\b/, "our");
    return en;
  }

  function verbEnglish(v, sel, rest) {
    const [base, pastEn] = v.en;
    const neg = sel.pol === "neg";
    const past = sel.tense === "past";
    // 明日 and 来週 need “will” in English: I'll drink coffee tomorrow.
    const will = sel.future && !past;
    const r = rest ? " " + rest : "";
    switch (sel.mood) {
      case "want":
        return "I " + (past ? (neg ? "didn’t want to " : "wanted to ") : neg ? "don’t want to " : "want to ") + base + r + ".";
      case "lets":
        return "Let’s " + base + r + "!";
      case "please":
        return "Please " + (neg ? "don’t " : "") + base + r + ".";
      case "can":
        return "I " + (past ? (neg ? "couldn’t " : "could ") : neg ? "can’t " : "can ") + base + r + ".";
      case "question":
        if (neg && !past) return "Won’t you " + base + r + "? (an invitation)";
        return (past ? (neg ? "Didn’t you " : "Did you ") : will ? "Will you " : "Do you ") + base + r + "?";
      default:
        if (will) return "I" + (neg ? " won’t " : "’ll ") + base + r + ".";
        return "I " + (past ? (neg ? "didn’t " + base : pastEn) : neg ? "don’t " + base : base) + r + ".";
    }
  }

  const END = (sel) => (sel.mood === "question" && sel.style === "plain" ? "？" : "。");

  // copula / adjective endings
  function copula(sel) {
    const neg = sel.pol === "neg";
    const past = sel.tense === "past";
    if (sel.style === "plain") return past ? (neg ? "じゃなかった" : "だった") : neg ? "じゃない" : "だ";
    return past ? (neg ? "じゃありませんでした" : "でした") : neg ? "じゃありません" : "です";
  }

  function adjForm(a, sel) {
    const [j, pos] = a;
    const neg = sel.pol === "neg";
    const past = sel.tense === "past";
    if (pos === "adj-na") return j + copula(sel);
    const f = NI.conj.forms({ j, pos });
    const plain = past ? (neg ? f.pastneg : f.past) : neg ? f.neg : f.dict;
    return sel.style === "plain" ? plain : plain + "です";
  }

  function be(sel, present, pastWord) {
    const neg = sel.pol === "neg";
    return (sel.tense === "past" ? pastWord : present) + (neg ? " not" : "");
  }

  /* sel: { pattern, [slot]: index, tense, pol, style, mood, who } → { jp, en, note } */
  function build(sel) {
    const D = NI.data.maker;
    const s = Object.assign({ tense: "present", pol: "aff", style: "polite", mood: "statement" }, sel);
    const pick = (list, i) => list[Math.max(0, Math.min(list.length - 1, Number(i) || 0))];
    const who = s.who ? "{私|わたし}は" : "";
    let jp;
    let en;
    let note = "";
    if (s.pattern === "is") {
      const t = pick(D.is.topic, s.topic);
      const n = pick(D.is.noun, s.noun);
      jp = t[0] + "は " + n[0] + copula(s) + "。";
      en = t[1] + " " + be(s, t[2], t[3]) + " " + n[1] + ".";
    } else if (s.pattern === "adj") {
      const t = pick(D.adj.topic, s.topic);
      const a = pick(D.adj.adj, s.adj);
      jp = t[0] + "は " + adjForm(a, s) + "。";
      en = t[1] + " " + be(s, "is", "was") + " " + a[2] + ".";
      if (a[1] === "adj-na") note = a[0].replace(/\{([^|]+)\|[^}]+\}/g, "$1") + " is a な-adjective: it works like a noun with です.";
      if (a[1] === "adj-ix") note = "いい is irregular: its other forms come from よい (よくない, よかった).";
      if (/^\{(暑|寒)/.test(a[0])) note = "暑い and 寒い are for the weather and places. Hot or cold food and drinks are 熱い and 冷たい.";
      if (/^\{(熱|冷)/.test(a[0])) note = "熱い and 冷たい are for things you touch, eat or drink. For the weather, use 暑い and 寒い.";
      if (a[2].indexOf(" (") > 0) en = en.replace(/ \(.*\)\.$/, ".");
    } else if (s.pattern === "action") {
      const v = pick(D.action.verb, s.verb);
      const o = pick(v.obj, s.obj);
      const t = pick(D.action.time, s.time);
      const p = pick(D.action.place, s.place);
      jp = join(who, t[0], p[0] ? p[0] + "で" : "", o[0] + "を", verbForm(v, s)) + END(s);
      en = verbEnglish(o[2] ? Object.assign({}, v, { en: o[2] }) : v, Object.assign({}, s, { future: !!t[3] }), join(whose(o[1], s.mood), p[1], t[1]));
      if (s.mood === "question" && s.pol === "neg" && s.tense !== "past") note = "〜ませんか (won't you…?) is the polite way to invite someone.";
      if (s.mood === "can" && v.j === "する") note = "The potential of する is the separate verb できる.";
    } else if (s.pattern === "go") {
      const v = pick(D.go.verb, s.verb);
      const p = pick(D.go.place, s.place);
      const h = pick(D.go.how, s.how);
      const w = pick(D.go.with, s.with);
      if (v.noMood && v.noMood.indexOf(s.mood) >= 0) s.mood = "statement";
      jp = join(who, w[0], p[0] + "に", h[0], verbForm(v, s)) + END(s);
      en = verbEnglish(v, s, join(p[1], h[1], whose(w[1], s.mood)));
      if (s.mood === "question" && s.pol === "neg" && s.tense !== "past") note = "〜ませんか (won't you…?) is the polite way to invite someone.";
    } else if (s.pattern === "exist") {
      const p = pick(D.exist.place, s.place);
      const t = pick(D.exist.thing, s.thing);
      const v = t[2] ? { j: "いる", pos: "v1" } : { j: "ある", pos: "v5r-i" };
      jp = p[0] + "に " + t[0] + "が " + verbForm(v, Object.assign({}, s, { mood: "statement" })) + "。";
      const neg = s.pol === "neg";
      en = "There " + (s.tense === "past" ? (neg ? "wasn’t " : "was ") : neg ? "isn’t " : "is ") + t[1] + " " + p[1] + ".";
      note = t[2] ? "います: for people and animals." : "あります: for things and places.";
    } else if (s.pattern === "like") {
      const t = pick(D.like.thing, s.thing);
      const f = pick(D.like.feel, s.feel);
      jp = join(who, t[0] + "が", f[0] + copula(s)) + "。";
      const neg = s.pol === "neg";
      const past = s.tense === "past";
      if (f[1] === "like" || f[1] === "dislike") en = "I " + (past ? (neg ? "didn’t " + f[1] : f[1] + "d") : neg ? "don’t " + f[1] : f[1]) + " " + t[1] + ".";
      else en = "I " + (past ? (neg ? "wasn’t " : "was ") : neg ? "’m not " : "’m ") + f[1] + " " + t[1] + ".";
      en = en.replace("I ’m", "I’m");
      note = "好き and 嫌い are な-adjectives, and the thing you like takes が.";
    } else {
      return null;
    }
    return { jp, en: cap(en), note };
  }

  function pattern(id) {
    return PATTERNS.find((p) => p.id === id) || null;
  }

  NI.maker = { PATTERNS, MOODS, build, verbForm, pattern, fits };
})(typeof window !== "undefined" ? window : globalThis);
