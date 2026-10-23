/* Japanese number readings with the sound changes learners trip over
   (さんびゃく, ろっぴゃく, はっせん, いっぷん, よじ, ひとり …). */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});

  const DIG = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

  function under10000(n) {
    let out = "";
    const th = Math.floor(n / 1000);
    const h = Math.floor((n % 1000) / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    if (th) out += th === 1 ? "せん" : th === 3 ? "さんぜん" : th === 8 ? "はっせん" : DIG[th] + "せん";
    if (h) out += h === 1 ? "ひゃく" : h === 3 ? "さんびゃく" : h === 6 ? "ろっぴゃく" : h === 8 ? "はっぴゃく" : DIG[h] + "ひゃく";
    if (t) out += t === 1 ? "じゅう" : DIG[t] + "じゅう";
    if (o) out += DIG[o];
    return out;
  }

  /* 0 … 999,999,999 → kana. */
  function toKana(n) {
    n = Math.floor(n);
    if (n === 0) return "ゼロ";
    let out = "";
    const oku = Math.floor(n / 1e8);
    const man = Math.floor((n % 1e8) / 1e4);
    const rest = n % 1e4;
    if (oku) out += under10000(oku) + "おく";
    if (man) {
      let m = man === 1 ? "いち" : under10000(man);
      if (man >= 1000 && Math.floor(man / 1000) === 1) m = "いっ" + m; // 一千万 いっせんまん
      out += m + "まん";
    }
    if (rest) out += under10000(rest);
    return out;
  }

  // Replace the reading of the final digit (used by counters).
  function withLastDigit(n, map) {
    const o = n % 10;
    const head = n - o;
    if (o === 0) return null;
    if (!(o in map)) return null;
    return (head ? toKana(head) : "") + map[o];
  }

  const COUNTERS = {
    yen(n) {
      return (withLastDigit(n, { 4: "よ" }) || toKana(n)) + "えん";
    },
    ji(n) {
      return (withLastDigit(n, { 4: "よ", 7: "しち", 9: "く" }) || toKana(n)) + "じ";
    },
    fun(n) {
      const o = n % 10;
      const head = n - o;
      const units = { 1: "いっぷん", 2: "にふん", 3: "さんぷん", 4: "よんぷん", 5: "ごふん", 6: "ろっぷん", 7: "ななふん", 8: "はっぷん", 9: "きゅうふん" };
      if (o === 0) {
        // 10 じゅっぷん, 20 にじゅっぷん …
        const tens = toKana(n).replace(/じゅう$/, "");
        return tens + "じゅっぷん";
      }
      return (head ? toKana(head) : "") + units[o];
    },
    nin(n) {
      if (n === 1) return "ひとり";
      if (n === 2) return "ふたり";
      return (withLastDigit(n, { 4: "よ" }) || toKana(n)) + "にん";
    },
    tsu(n) {
      return ["", "ひとつ", "ふたつ", "みっつ", "よっつ", "いつつ", "むっつ", "ななつ", "やっつ", "ここのつ", "とお"][n] || null;
    },
    sai(n) {
      if (n === 20) return "はたち";
      const o = n % 10;
      if (o === 0) return toKana(n).replace(/じゅう$/, "じゅっ") + "さい";
      return (withLastDigit(n, { 1: "いっ", 8: "はっ" }) || toKana(n)) + "さい";
    },
    bansen(n) {
      return toKana(n) + "ばんせん";
    },
    // 本 (long things), 枚 (flat things), 冊 (books), 匹 (small animals), 回 (times), 階 (floors), 月 (months)
    hon(n) {
      return soundChange(n, { 1: "いっぽん", 2: "にほん", 3: "さんぼん", 4: "よんほん", 5: "ごほん", 6: "ろっぽん", 7: "ななほん", 8: "はっぽん", 9: "きゅうほん" }, "じゅっぽん");
    },
    mai(n) {
      return toKana(n) + "まい";
    },
    satsu(n) {
      return soundChange(n, { 1: "いっさつ", 8: "はっさつ" }, "じゅっさつ", "さつ");
    },
    hiki(n) {
      return soundChange(n, { 1: "いっぴき", 2: "にひき", 3: "さんびき", 4: "よんひき", 5: "ごひき", 6: "ろっぴき", 7: "ななひき", 8: "はっぴき", 9: "きゅうひき" }, "じゅっぴき");
    },
    kai(n) {
      return soundChange(n, { 1: "いっかい", 6: "ろっかい", 8: "はっかい" }, "じゅっかい", "かい");
    },
    floor(n) {
      return soundChange(n, { 1: "いっかい", 3: "さんがい", 6: "ろっかい", 8: "はっかい" }, "じゅっかい", "かい");
    },
    // Months: 4月 しがつ, 7月 しちがつ, 9月 くがつ.
    gatsu(n) {
      if (n < 1 || n > 12) return null;
      return (withLastDigit(n, { 4: "し", 7: "しち", 9: "く" }) || toKana(n)) + "がつ";
    },
  };

  /* Counter reading with the sound changes on the last digit (いっぽん, さんぼん)
     and on round tens (じゅっぽん, にじゅっぽん). Digits missing from the table
     take the plain number + suffix. */
  function soundChange(n, units, tensForm, suffix) {
    const o = n % 10;
    const head = n - o;
    if (o === 0) return toKana(n).replace(/じゅう$/, "") + tensForm;
    return (head ? toKana(head) : "") + (units[o] || DIG[o] + suffix);
  }

  /* "3:30" style clock time → kana, e.g. さんじはん. */
  function timeKana(h, m) {
    let s = COUNTERS.ji(h);
    if (m === 30) s += "はん";
    else if (m) s += COUNTERS.fun(m);
    return s;
  }

  function withCommas(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Which reading rule each counter follows (3本 さんぼん, 3分 さんぷん …).
  const COUNTER_FN = { 円: "yen", 時: "ji", 分: "fun", 人: "nin", 歳: "sai", 番線: "bansen", 本: "hon", 枚: "mai", 冊: "satsu", 匹: "hiki", 回: "kai", 階: "floor", 月: "gatsu" };

  NI.num = { toKana, COUNTERS, COUNTER_FN, timeKana, withCommas };
})(typeof window !== "undefined" ? window : globalThis);
