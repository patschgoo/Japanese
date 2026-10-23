/* Sentence Maker patterns. Fillers are [markup, English, …]; verbs are
   dictionary-form markup with their English [base, past] and the objects
   that make sense with them (an object can bring its own English verb: you
   look at photos but watch films). Only words taught in the course are used,
   and tools/validate.js builds sentences from every filler to check them. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  NI.data = NI.data || {};

  NI.data.maker = {
    // A は B です
    is: {
      topic: [
        ["{私|わたし}", "I", "am", "was"],
        ["{友達|ともだち}", "My friend", "is", "was"],
        ["{田中|たなか}さん", "Tanaka-san", "is", "was"],
        ["{母|はは}", "My mother", "is", "was"],
        ["{兄|あに}", "My older brother", "is", "was"],
        ["ケンさん", "Ken", "is", "was"],
      ],
      noun: [
        ["{学生|がくせい}", "a student"],
        ["{先生|せんせい}", "a teacher"],
        ["{会社員|かいしゃいん}", "an office worker"],
        ["{医者|いしゃ}", "a doctor"],
        ["{日本人|にほんじん}", "Japanese"],
      ],
    },
    // A は [adjective] です. Each topic has a kind, and an adjective lists the
    // kinds it suits (none: all): hot weather is 暑い, but hot ramen is 熱い.
    adj: {
      topic: [
        ["この {町|まち}", "This town", "place"],
        ["{今日|きょう}", "Today", "day"],
        ["{日本語|にほんご}", "Japanese", "subject"],
        ["この ラーメン", "This ramen", "food"],
        ["{私|わたし}の {部屋|へや}", "My room", "place"],
        ["この {本|ほん}", "This book", "thing"],
      ],
      adj: [
        ["{大|おお}きい", "adj-i", "big", "place thing food"],
        ["{小|ちい}さい", "adj-i", "small", "place thing food"],
        ["{新|あたら}しい", "adj-i", "new", "place thing"],
        ["{古|ふる}い", "adj-i", "old", "place thing"],
        ["{高|たか}い", "adj-i", "expensive", "place thing food"],
        ["{安|やす}い", "adj-i", "cheap", "place thing food"],
        ["おいしい", "adj-i", "delicious", "food"],
        ["{暑|あつ}い", "adj-i", "hot (weather)", "place day"],
        ["{寒|さむ}い", "adj-i", "cold (weather)", "place day"],
        ["{熱|あつ}い", "adj-i", "hot (to the touch)", "food"],
        ["{冷|つめ}たい", "adj-i", "cold (to the touch)", "food"],
        ["{楽|たの}しい", "adj-i", "fun", "place day subject thing"],
        ["{難|むずか}しい", "adj-i", "difficult", "subject thing"],
        ["いい", "adj-ix", "good"],
        ["{静|しず}か", "adj-na", "quiet", "place day"],
        ["きれい", "adj-na", "pretty", "place thing"],
        ["{有名|ゆうめい}", "adj-na", "famous", "place food thing"],
        ["{便利|べんり}", "adj-na", "convenient", "place thing"],
        ["{簡単|かんたん}", "adj-na", "easy", "subject thing"],
      ],
    },
    // [time] [place]で [object]を [verb]
    action: {
      time: [
        ["", "", null],
        ["{毎日|まいにち}", "every day", "present"],
        ["{毎朝|まいあさ}", "every morning", "present"],
        // [markup, English, the tense it sets, whether English needs "will"]
        ["{明日|あした}", "tomorrow", "present", true],
        ["{週末|しゅうまつ}に", "at the weekend", null],
        ["{来週|らいしゅう}", "next week", "present", true],
        ["{昨日|きのう}", "yesterday", "past"],
        ["{先週|せんしゅう}", "last week", "past"],
      ],
      place: [
        ["", ""],
        ["{家|うち}", "at home"],
        ["{学校|がっこう}", "at school"],
        ["{駅|えき}", "at the station"],
        ["{公園|こうえん}", "in the park"],
        ["{図書館|としょかん}", "at the library"],
        ["{会社|かいしゃ}", "at the office"],
      ],
      verb: [
        { j: "{飲|の}む", pos: "v5", en: ["drink", "drank"], obj: [["コーヒー", "coffee"], ["お{茶|ちゃ}", "tea"], ["{水|みず}", "water"]] },
        { j: "{食|た}べる", pos: "v1", en: ["eat", "ate"], obj: [["すし", "sushi"], ["ラーメン", "ramen"], ["パン", "bread"], ["{肉|にく}", "meat"], ["{魚|さかな}", "fish"], ["おにぎり", "rice balls"], ["{野菜|やさい}", "vegetables"]] },
        { j: "{見|み}る", pos: "v1", en: ["watch", "watched"], obj: [["{映画|えいが}", "a film"], ["テレビ", "TV"], ["{写真|しゃしん}", "photos", ["look at", "looked at"]]] },
        { j: "{読|よ}む", pos: "v5", en: ["read", "read"], obj: [["{本|ほん}", "a book"]] },
        { j: "{買|か}う", pos: "v5", en: ["buy", "bought"], obj: [["{本|ほん}", "a book"], ["{傘|かさ}", "an umbrella"], ["お{土産|みやげ}", "souvenirs"], ["{服|ふく}", "clothes"], ["{靴|くつ}", "shoes"], ["パン", "bread"]] },
        { j: "{聞|き}く", pos: "v5", en: ["listen to", "listened to"], obj: [["{音楽|おんがく}", "music"]] },
        { j: "{勉強|べんきょう}する", pos: "vs", en: ["study", "studied"], obj: [["{日本語|にほんご}", "Japanese"], ["{英語|えいご}", "English"]] },
        { j: "{作|つく}る", pos: "v5", en: ["make", "made"], obj: [["{料理|りょうり}", "a meal"], ["{晩|ばん}ご{飯|はん}", "dinner"]] },
        { j: "{撮|と}る", pos: "v5", en: ["take", "took"], obj: [["{写真|しゃしん}", "photos"]] },
        { j: "する", pos: "vs", en: ["do", "did"], obj: [["{宿題|しゅくだい}", "my homework"], ["ゲーム", "games", ["play", "played"]], ["{仕事|しごと}", "my work"]] },
      ],
    },
    // [with] [place]に [how] [go / come / go back]
    go: {
      verb: [
        { j: "{行|い}く", pos: "v5k-s", en: ["go", "went"] },
        // "Let's come to the park" isn't something people say, in either language.
        { j: "{来|く}る", pos: "vk", en: ["come", "came"], noMood: ["lets"] },
        { j: "{帰|かえ}る", pos: "v5", en: ["go back", "went back"] },
      ],
      place: [
        ["{学校|がっこう}", "to school"],
        ["{駅|えき}", "to the station"],
        ["{日本|にほん}", "to Japan"],
        ["{京都|きょうと}", "to Kyoto"],
        ["{公園|こうえん}", "to the park"],
        ["{図書館|としょかん}", "to the library"],
        ["{病院|びょういん}", "to the hospital"],
        ["{温泉|おんせん}", "to a hot spring"],
        ["{家|うち}", "home"],
      ],
      how: [
        ["", ""],
        ["{電車|でんしゃ}で", "by train"],
        ["バスで", "by bus"],
        ["{車|くるま}で", "by car"],
        ["{自転車|じてんしゃ}で", "by bike"],
        ["タクシーで", "by taxi"],
        ["{新幹線|しんかんせん}で", "by shinkansen"],
      ],
      with: [
        ["", ""],
        ["{友達|ともだち}と", "with a friend"],
        ["{家族|かぞく}と", "with my family"],
        ["{一人|ひとり}で", "alone"],
      ],
    },
    // [place]に [thing]が あります / います
    exist: {
      place: [
        ["{机|つくえ}の {上|うえ}", "on the desk"],
        ["{部屋|へや}", "in the room"],
        ["{駅|えき}の {前|まえ}", "in front of the station"],
        ["{公園|こうえん}", "in the park"],
        ["{家|うち}", "at home"],
      ],
      thing: [
        ["{本|ほん}", "a book", false],
        ["{傘|かさ}", "an umbrella", false],
        ["{銀行|ぎんこう}", "a bank", false],
        ["コンビニ", "a convenience store", false],
        ["{猫|ねこ}", "a cat", true],
        ["{犬|いぬ}", "a dog", true],
        ["{友達|ともだち}", "a friend", true],
        ["{子供|こども}", "a child", true],
      ],
    },
    // [thing]が 好き / 嫌い / 上手 / 下手 です
    like: {
      feel: [
        ["{好|す}き", "like"],
        ["{嫌|きら}い", "dislike"],
        ["{上手|じょうず}", "good at"],
        ["{下手|へた}", "bad at"],
      ],
      thing: [
        ["すし", "sushi"],
        ["{犬|いぬ}", "dogs"],
        ["{猫|ねこ}", "cats"],
        ["{音楽|おんがく}", "music"],
        ["スポーツ", "sports"],
        ["カラオケ", "karaoke"],
        ["{料理|りょうり}", "cooking"],
        ["{日本語|にほんご}", "Japanese"],
        ["{歌|うた}", "singing"],
        ["ゲーム", "games"],
      ],
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
