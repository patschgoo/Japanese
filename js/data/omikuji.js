/* Omikuji: the paper fortunes drawn at shrines. One can be drawn each day
   once the daily goal is reached. Only the good fortunes are in the box. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  NI.data = NI.data || {};
  NI.data.omikuji = {
    // [markup, English, chance in %, XP]
    levels: [
      // [fortune, English, chance, XP, its parts]
      ["{大吉|だいきち}", "Great blessing", 12, 10, [["{大|だい}", "big, great"], ["{吉|きち}", "good luck"]]],
      ["{中吉|ちゅうきち}", "Middle blessing", 20, 5, [["{中|ちゅう}", "middle"], ["{吉|きち}", "good luck"]]],
      ["{小吉|しょうきち}", "Small blessing", 23, 3, [["{小|しょう}", "small"], ["{吉|きち}", "good luck"]]],
      ["{吉|きち}", "Blessing", 25, 3],
      ["{末吉|すえきち}", "Future blessing", 20, 3, [["{末|すえ}", "the end; later on"], ["{吉|きち}", "good luck"]]],
    ],
    messages: [
      ["{明日|あした}も いい {日|ひ}に なりますよ。", "Tomorrow will be a good day too."],
      ["{新|あたら}しい {友達|ともだち}に {会|あ}えるかもしれません。", "You might meet a new friend."],
      ["{日本語|にほんご}が もっと {上手|じょうず}に なります。", "Your Japanese will get even better."],
      ["{今日|きょう}は {早|はや}く {寝|ね}た ほうが いいです。", "Better get an early night tonight."],
      ["{旅行|りょこう}に いい {日|ひ}です。", "A good day for travel."],
      ["おいしい ものを {食|た}べましょう！", "Treat yourself to something delicious!"],
      ["{好|す}きな {歌|うた}を {聞|き}きましょう。", "Listen to a song you love."],
      ["{誰|だれ}かに 「ありがとう」と {言|い}いましょう。", "Say “thank you” to someone."],
      ["{少|すこ}し {休|やす}んでも いいですよ。", "It’s fine to rest a little."],
      ["{散歩|さんぽ}を すると、 いい ことが あります。", "Take a walk and something good will happen."],
      ["{分|わ}からない ことは、 {聞|き}いて みましょう。", "If you don’t understand something, just ask."],
      ["{毎日|まいにち} {続|つづ}けるのが {一番|いちばん}です。", "Keeping at it every day is what counts."],
    ],
  };
})(typeof window !== "undefined" ? window : globalThis);
