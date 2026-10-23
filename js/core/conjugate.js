/* Conjugation engine for verbs and adjectives.
   Works directly on furigana markup such as "{飲|の}む" so every generated form
   keeps its furigana: "{飲|の}みます", "{飲|の}んで", "{飲|の}まない" …
   The ending being changed is always plain kana outside the braces.

   Part-of-speech codes (JMdict style):
     v1     ichidan / ru-verb              食べる → 食べます
     v5     godan / u-verb (row by ending) 飲む → 飲みます
     v5k-s  行く (て-form 行って)
     v5r-i  ある (negative ない)
     vk     来る
     vs     する and noun+する            勉強する
     adj-i  い-adjective                   高い
     adj-ix いい (conjugates from よい)
     adj-na な-adjective                   静か */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});

  const GODAN = {
    う: { i: "い", a: "わ", o: "お", te: "って", ta: "った" },
    く: { i: "き", a: "か", o: "こ", te: "いて", ta: "いた" },
    ぐ: { i: "ぎ", a: "が", o: "ご", te: "いで", ta: "いだ" },
    す: { i: "し", a: "さ", o: "そ", te: "して", ta: "した" },
    つ: { i: "ち", a: "た", o: "と", te: "って", ta: "った" },
    ぬ: { i: "に", a: "な", o: "の", te: "んで", ta: "んだ" },
    ぶ: { i: "び", a: "ば", o: "ぼ", te: "んで", ta: "んだ" },
    む: { i: "み", a: "ま", o: "も", te: "んで", ta: "んだ" },
    る: { i: "り", a: "ら", o: "ろ", te: "って", ta: "った" },
  };

  const isVerb = (pos) => /^v/.test(pos || "");
  const isAdj = (pos) => /^adj/.test(pos || "");

  function chop(j, n) {
    if (/[{}|]/.test(j.slice(-n))) throw new Error("Ending must be plain kana outside braces: " + j);
    return j.slice(0, j.length - n);
  }

  /* The building blocks every verb form is made from. */
  function verbStems(j, pos) {
    if (pos === "vk") {
      let pre;
      if (j.endsWith("{来|く}る")) {
        pre = j.slice(0, -"{来|く}る".length);
        const k = (r) => pre + "{来|" + r + "}";
        return { i: k("き"), a: k("こ"), te: k("き") + "て", ta: k("き") + "た", vol: k("こ") + "よう", dict: j };
      }
      pre = chop(j, 2); // kana くる
      return { i: pre + "き", a: pre + "こ", te: pre + "きて", ta: pre + "きた", vol: pre + "こよう", dict: j };
    }
    if (pos === "vs") {
      const pre = j.endsWith("する") ? chop(j, 2) : j;
      return { i: pre + "し", a: pre + "し", te: pre + "して", ta: pre + "した", vol: pre + "しよう", dict: pre + "する" };
    }
    if (pos === "v1") {
      const s = chop(j, 1);
      return { i: s, a: s, te: s + "て", ta: s + "た", vol: s + "よう", dict: j };
    }
    if (pos === "v5" || pos === "v5k-s" || pos === "v5r-i") {
      const last = j.slice(-1);
      const row = GODAN[last];
      if (!row) throw new Error("Unknown godan ending: " + j);
      const s = chop(j, 1);
      const st = {
        i: s + row.i,
        a: s + row.a,
        te: s + row.te,
        ta: s + row.ta,
        vol: s + row.o + "う",
        dict: j,
      };
      if (pos === "v5k-s") {
        st.te = s + "って";
        st.ta = s + "った";
      }
      if (pos === "v5r-i") st.a = s.slice(0, s.length - 1); // ある → ない (no stem)
      return st;
    }
    throw new Error("Not a verb: " + pos);
  }

  function verbForms(j, pos) {
    const s = verbStems(j, pos);
    const neg = s.a; // a-stem (empty for ある, giving ない)
    return {
      dict: s.dict,
      masu: s.i + "ます",
      masen: s.i + "ません",
      mashita: s.i + "ました",
      masendeshita: s.i + "ませんでした",
      mashou: s.i + "ましょう",
      tai: s.i + "たい",
      takunai: s.i + "たくない",
      takatta: s.i + "たかった",
      takunakatta: s.i + "たくなかった",
      stemni: s.i + "に",
      nai: neg + "ない",
      nakatta: neg + "なかった",
      naide: neg + "ないで",
      te: s.te,
      ta: s.ta,
      tari: s.ta + "り",
      tekudasai: s.te + "ください",
      temo: s.te + "も",
      tewa: s.te + "は",
      teimasu: s.te + "います",
      teimasen: s.te + "いません",
      teimashita: s.te + "いました",
      teimasendeshita: s.te + "いませんでした",
      teiru: s.te + "いる",
      teinai: s.te + "いない",
      teita: s.te + "いた",
      teru: s.te + "る",
      tenai: s.te + "ない",
      teta: s.te + "た",
      vol: s.vol,
    };
  }

  function adjForms(j, pos) {
    if (pos === "adj-na") {
      return { dict: j, na: j + "な", ni: j + "に", de: j + "で", da: j + "だ", datta: j + "だった", janai: j + "じゃない", janakatta: j + "じゃなかった" };
    }
    const stem = pos === "adj-ix" ? chop(j, 2) + "よ" : chop(j, 1);
    return {
      dict: j,
      neg: stem + "くない",
      past: stem + "かった",
      pastneg: stem + "くなかった",
      te: stem + "くて",
      adv: stem + "く",
      kuarimasen: stem + "くありません",
      kuarimasendeshita: stem + "くありませんでした",
    };
  }

  function forms(entry) {
    if (isVerb(entry.pos)) return verbForms(entry.j, entry.pos);
    if (isAdj(entry.pos)) return adjForms(entry.j, entry.pos);
    return { dict: entry.j };
  }

  const LABELS = {
    dict: "dictionary form",
    masu: "polite form (〜ます)",
    masen: "polite negative (〜ません)",
    mashita: "polite past (〜ました)",
    masendeshita: "polite past negative (〜ませんでした)",
    mashou: "let's … (〜ましょう)",
    tai: "want to … (〜たい)",
    takunai: "don't want to … (〜たくない)",
    takatta: "wanted to … (〜たかった)",
    takunakatta: "didn't want to … (〜たくなかった)",
    stemni: "(go) to … — purpose (〜に)",
    nai: "plain negative (〜ない)",
    nakatta: "plain past negative (〜なかった)",
    naide: "without …ing / don't … (〜ないで)",
    te: "て-form",
    ta: "plain past (〜た)",
    tari: "things like … (〜たり)",
    tekudasai: "please … (〜てください)",
    temo: "even if … / may … (〜ても)",
    tewa: "(must not) … (〜ては)",
    teimasu: "is …ing / state (〜ています)",
    teimasen: "is not …ing / hasn't … (〜ていません)",
    teimashita: "was …ing (〜ていました)",
    teimasendeshita: "wasn't …ing (〜ていませんでした)",
    teiru: "is …ing — plain (〜ている)",
    teinai: "isn't …ing — plain (〜ていない)",
    teita: "was …ing — plain (〜ていた)",
    teru: "is …ing — casual (〜てる)",
    tenai: "isn't …ing — casual (〜てない)",
    teta: "was …ing — casual (〜てた)",
    vol: "let's … — casual (〜よう)",
    neg: "negative (〜くない)",
    past: "past (〜かった)",
    pastneg: "past negative (〜くなかった)",
    adv: "adverb (〜く)",
    kuarimasen: "polite negative (〜くありません)",
    kuarimasendeshita: "polite past negative (〜くありませんでした)",
    na: "before a noun (〜な)",
    ni: "adverb (〜に)",
    de: "and … (〜で)",
    da: "plain (〜だ)",
    datta: "plain past (〜だった)",
    janai: "plain negative (〜じゃない)",
    janakatta: "plain past negative (〜じゃなかった)",
    noun: "as a noun",
  };

  /* Drill targets: what a learner is asked to produce, with every answer we
     accept. Polite adjective negatives have two equally correct shapes. */
  const DRILLS = {
    masu: { label: "polite (〜ます)", verb: (f) => [f.masu] },
    masen: { label: "polite negative", verb: (f) => [f.masen], i: (f) => [f.neg + "です", f.kuarimasen], na: (f) => [f.dict + "じゃありません", f.dict + "じゃないです", f.dict + "ではありません"] },
    mashita: { label: "polite past", verb: (f) => [f.mashita], i: (f) => [f.past + "です"], na: (f) => [f.dict + "でした"] },
    masendeshita: {
      label: "polite past negative",
      verb: (f) => [f.masendeshita],
      i: (f) => [f.pastneg + "です", f.kuarimasendeshita],
      na: (f) => [f.dict + "じゃありませんでした", f.dict + "じゃなかったです", f.dict + "ではありませんでした"],
    },
    mashou: { label: "let's … (〜ましょう)", verb: (f) => [f.mashou] },
    tai: { label: "want to … (〜たいです)", verb: (f) => [f.tai + "です", f.tai] },
    te: { label: "て-form", verb: (f) => [f.te] },
    teimasu: { label: "〜ています", verb: (f) => [f.teimasu] },
    dict: { label: "dictionary form", verb: (f) => [f.dict] },
    nai: { label: "plain negative (〜ない)", verb: (f) => [f.nai], i: (f) => [f.neg], na: (f) => [f.janai, f.dict + "ではない"] },
    ta: { label: "plain past (〜た)", verb: (f) => [f.ta], i: (f) => [f.past], na: (f) => [f.datta] },
    nakatta: { label: "plain past negative (〜なかった)", verb: (f) => [f.nakatta], i: (f) => [f.pastneg], na: (f) => [f.janakatta, f.dict + "ではなかった"] },
  };

  function drillAnswers(entry, target) {
    const d = DRILLS[target];
    if (!d) return null;
    const f = forms(entry);
    if (isVerb(entry.pos)) return d.verb ? d.verb(f) : null;
    if (entry.pos === "adj-na") return d.na ? d.na(f) : null;
    if (isAdj(entry.pos)) return d.i ? d.i(f) : null;
    return null;
  }

  /* The verb group a learner needs for the て-form rules. */
  function group(pos) {
    if (pos === "v1") return 2;
    if (pos === "vk" || pos === "vs") return 3;
    if (/^v5/.test(pos)) return 1;
    return 0;
  }

  NI.conj = { forms, verbForms, adjForms, LABELS, DRILLS, drillAnswers, isVerb, isAdj, group };
})(typeof window !== "undefined" ? window : globalThis);
