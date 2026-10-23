/* Kana utilities: script detection, hiragana⇄katakana, a romaji→kana input
   method (so answers can be typed without a Japanese keyboard), and the
   normalisation used to compare typed answers. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});

  const isHiragana = (ch) => ch >= "ぁ" && ch <= "ゖ";
  const isKatakana = (ch) => (ch >= "ァ" && ch <= "ヺ") || ch === "ー";
  const isKana = (ch) => isHiragana(ch) || isKatakana(ch);
  const isKanji = (ch) =>
    (ch >= "一" && ch <= "鿿") || ch === "々" || (ch >= "㐀" && ch <= "䶿");
  const hasKatakana = (s) => /[ァ-ヺ]/.test(s);
  const hasKanji = (s) => /[㐀-䶿一-鿿々]/.test(s);

  function toHiragana(s) {
    let out = "";
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      out += c >= 0x30a1 && c <= 0x30f6 ? String.fromCharCode(c - 0x60) : ch;
    }
    return out;
  }

  function toKatakana(s) {
    let out = "";
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      out += c >= 0x3041 && c <= 0x3096 ? String.fromCharCode(c + 0x60) : ch;
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Romaji → hiragana. Accepts Hepburn and Kunrei spellings.
  const T = {
    a: "あ", i: "い", u: "う", e: "え", o: "お",
    ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
    ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
    sa: "さ", shi: "し", si: "し", su: "す", se: "せ", so: "そ",
    za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
    ta: "た", chi: "ち", ti: "ち", tsu: "つ", tu: "つ", te: "て", to: "と",
    da: "だ", di: "ぢ", du: "づ", dzu: "づ", de: "で", do: "ど",
    na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
    ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
    ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
    pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
    ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
    ya: "や", yu: "ゆ", yo: "よ", ye: "いぇ",
    ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
    wa: "わ", wo: "を", wi: "うぃ", we: "うぇ",
    kya: "きゃ", kyu: "きゅ", kyo: "きょ",
    gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
    sha: "しゃ", shu: "しゅ", sho: "しょ", she: "しぇ",
    sya: "しゃ", syu: "しゅ", syo: "しょ",
    ja: "じゃ", ju: "じゅ", jo: "じょ", je: "じぇ",
    jya: "じゃ", jyu: "じゅ", jyo: "じょ",
    zya: "じゃ", zyu: "じゅ", zyo: "じょ",
    cha: "ちゃ", chu: "ちゅ", cho: "ちょ", che: "ちぇ",
    tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
    cya: "ちゃ", cyu: "ちゅ", cyo: "ちょ",
    nya: "にゃ", nyu: "にゅ", nyo: "にょ",
    hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
    bya: "びゃ", byu: "びゅ", byo: "びょ",
    pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
    mya: "みゃ", myu: "みゅ", myo: "みょ",
    rya: "りゃ", ryu: "りゅ", ryo: "りょ",
    fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
    va: "ゔぁ", vi: "ゔぃ", vu: "ゔ", ve: "ゔぇ", vo: "ゔぉ",
    tsa: "つぁ", thi: "てぃ", dhi: "でぃ", twu: "とぅ", dwu: "どぅ",
    kwa: "くぁ", gwa: "ぐぁ",
    xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ",
    la: "ぁ", li: "ぃ", lu: "ぅ", le: "ぇ", lo: "ぉ",
    xya: "ゃ", xyu: "ゅ", xyo: "ょ", lya: "ゃ", lyu: "ゅ", lyo: "ょ",
    xtu: "っ", ltu: "っ", xtsu: "っ", ltsu: "っ", xwa: "ゎ", lwa: "ゎ",
    "-": "ー",
  };
  const VOWEL_OR_Y = /[aiueoy]/;
  const DOUBLABLE = /[bcdfghjkmpqrstvwxz]/;

  /* Converts romaji to hiragana. Non-latin characters (e.g. kana from a real
     Japanese IME) pass through. With final=false a trailing incomplete
     sequence such as "k" or "n" is left as-is so live typing feels natural. */
  function romajiToHiragana(input, final) {
    const s = String(input).toLowerCase();
    let out = "";
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (!/[a-z\-']/.test(ch)) {
        out += ch;
        i++;
        continue;
      }
      if (ch === "'") {
        i++;
        continue;
      }
      if (ch === "n") {
        const nx = s[i + 1];
        if (nx === undefined) {
          out += final ? "ん" : "n";
          i++;
          continue;
        }
        if (nx === "'") {
          out += "ん";
          i += 2;
          continue;
        }
        if (nx === "n") {
          // "nn" before a vowel/y means ん + n-syllable (konnichiha, konnyaku);
          // otherwise "nn" is just ん (kantann).
          const after = s[i + 2];
          if (after !== undefined && VOWEL_OR_Y.test(after)) {
            out += "ん";
            i += 1;
          } else {
            out += "ん";
            i += 2;
          }
          continue;
        }
        if (!VOWEL_OR_Y.test(nx) && /[a-z\-]/.test(nx)) {
          out += "ん";
          i++;
          continue;
        }
        if (!/[a-z]/.test(nx)) {
          out += "ん";
          i++;
          continue;
        }
      }
      // Hepburn writes ん as "m" before b/p (shimbun, sampo)
      if (ch === "m" && (s[i + 1] === "b" || s[i + 1] === "p")) {
        out += "ん";
        i++;
        continue;
      }
      // small っ for doubled consonants (kitte) and "tch" (matcha)
      if (DOUBLABLE.test(ch) && s[i + 1] === ch) {
        out += "っ";
        i++;
        continue;
      }
      if (ch === "t" && s[i + 1] === "c" && s[i + 2] === "h") {
        out += "っ";
        i++;
        continue;
      }
      let matched = false;
      for (let len = 4; len >= 1; len--) {
        const chunk = s.substr(i, len);
        if (chunk.length === len && T[chunk]) {
          out += T[chunk];
          i += len;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      // Incomplete sequence: keep it while typing, drop stray letters when final.
      if (!final) out += ch;
      i++;
    }
    return out;
  }

  /* Wires an <input> so romaji turns into kana as the learner types.
     opts.katakana writes katakana instead (used for typing names). */
  function bindIme(input, opts) {
    const kata = !!(opts && opts.katakana);
    const conv = (s, final) => {
      const h = romajiToHiragana(s, final);
      return kata ? toKatakana(h) : h;
    };
    let composing = false;
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("lang", "ja");
    input.addEventListener("compositionstart", () => (composing = true));
    input.addEventListener("compositionend", () => {
      composing = false;
      convert();
    });
    function convert() {
      if (composing) return;
      const before = input.value;
      const after = conv(before, false);
      if (after !== before) {
        input.value = after;
        try {
          input.setSelectionRange(after.length, after.length);
        } catch (e) {
          /* some input types do not support selection */
        }
      }
    }
    input.addEventListener("input", convert);
    return {
      finalize() {
        input.value = conv(input.value, true);
        return input.value;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Answer comparison. Katakana counts as hiragana, punctuation and spaces are
  // ignored, and the long-vowel mark ー equals the vowel it lengthens, so
  // "koohii" (こおひい) matches コーヒー.
  const VOWEL_OF = {};
  (function buildVowelMap() {
    const rows = {
      あ: "あかがさざただなはばぱまやらわぁゃゎ",
      い: "いきぎしじちぢにひびぴみりぃ",
      う: "うくぐすずつづぬふぶぷむゆるぅゅゔ",
      え: "えけげせぜてでねへべぺめれぇ",
      お: "おこごそぞとどのほぼぽもよろをぉょ",
    };
    for (const v in rows) for (const ch of rows[v]) VOWEL_OF[ch] = v;
  })();

  function fold(s) {
    let t = String(s == null ? "" : s);
    if (t.normalize) t = t.normalize("NFKC");
    t = toHiragana(t.toLowerCase());
    t = t.replace(/[\s。、，．,.!?！？・「」『』（）()〜~…:：;；"'“”‘’]/g, "");
    let out = "";
    for (const ch of t) {
      if (ch === "ー" && out.length) {
        out += VOWEL_OF[out[out.length - 1]] || "ー";
      } else {
        out += ch;
      }
    }
    return out;
  }

  NI.kana = {
    isHiragana,
    isKatakana,
    isKana,
    isKanji,
    hasKatakana,
    hasKanji,
    toHiragana,
    toKatakana,
    romajiToHiragana,
    bindIme,
    fold,
  };
})(typeof window !== "undefined" ? window : globalThis);
