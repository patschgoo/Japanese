/* Grammar words, names and the six course "lines".
   Grammar words are not review cards; they are glossed when tapped and are
   taught in the unit given by u. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  NI.data = NI.data || { units: [], grammar: [], names: [], phrases: [], lines: [] };

  NI.data.lines = [
    { id: "H", ja: "はじめ{線|せん}", kana: "はじめせん", en: "First Steps Line", color: "h", units: [1, 2, 3, 4, 5], blurb: "Greetings, introductions, things, numbers and time — the survival kit." },
    { id: "M", ja: "まいにち{線|せん}", kana: "まいにちせん", en: "Everyday Line", color: "m", units: [6, 7, 8, 9, 10], blurb: "Verbs, going places, where things are, family and describing the world." },
    { id: "D", ja: "できる{線|せん}", kana: "できるせん", en: "Can-Do Line", color: "d", units: [11, 12, 13, 14, 15], blurb: "Likes and wants, requests, what's happening now, invitations and permission." },
    { id: "K", ja: "かいわ{線|せん}", kana: "かいわせん", en: "Conversation Line", color: "k", units: [16, 17, 18, 19, 20], blurb: "Casual speech, opinions, past experiences, directions and getting help." },
    { id: "T", ja: "つながる{線|せん}", kana: "つながるせん", en: "Connections Line", color: "t", units: [21, 22, 23, 24, 25], blurb: "Giving and receiving, can and can't, if and when, before and after, and making plans." },
    { id: "S", ja: "すすむ{線|せん}", kana: "すすむせん", en: "Onward Line", color: "s", units: [26, 27, 28, 29, 30], blurb: "Trying things, how things look, asking for advice, rules, and the polite Japanese of shops and work." },
  ];

  NI.data.grammar = [
    // particles
    { s: "は", u: 2, kind: "particle", en: "topic marker — “as for …” (read わ)" },
    { s: "が", u: 8, kind: "particle", en: "subject marker; between two clauses: “but”" },
    { s: "を", u: 4, kind: "particle", en: "marks the object of an action (read お); also a route or a place you leave (道を渡る, 電車を降りる)" },
    { s: "に", u: 6, kind: "particle", en: "at (a time); to (a place or person); in/at (where something is); for (a purpose: 飲みに行く); from (someone you receive from: 友達にもらう)" },
    { s: "で", u: 3, kind: "particle", en: "in/by (a language or means); at (where an action happens)" },
    { s: "へ", u: 7, kind: "particle", en: "to, toward (direction; read え)" },
    { s: "と", u: 4, kind: "particle", en: "and (between nouns); with (someone); quotes what is said or thought" },
    { s: "も", u: 2, kind: "particle", en: "also, too; with a negative: (not) … either" },
    { s: "の", u: 2, kind: "particle", en: "’s, of — links two nouns; alone: “the one, mine”" },
    { s: "か", u: 2, kind: "particle", en: "question marker (a spoken question mark)" },
    { s: "ね", u: 4, kind: "particle", en: "“…, isn’t it? / right?” — invites agreement" },
    { s: "よ", u: 5, kind: "particle", en: "“…, you know” — tells the listener something new" },
    { s: "から", u: 5, kind: "particle", en: "from; after a sentence: because, so; after a て-form: after doing (食べてから)" },
    { s: "まで", u: 5, kind: "particle", en: "until; as far as" },
    { s: "より", u: 11, kind: "particle", en: "than" },
    { s: "だけ", u: 11, kind: "particle", en: "only, just" },
    { s: "ぐらい", u: 19, kind: "particle", en: "about, approximately" },
    { s: "けど", u: 16, kind: "particle", en: "but (casual)" },
    { s: "たち", u: 13, kind: "suffix", en: "plural for people (子供たち = children)" },
    { s: "お", u: 2, kind: "prefix", en: "polite prefix (お名前, お茶)" },
    { s: "ご", u: 9, kind: "prefix", en: "polite prefix (ご家族)" },
    // copula and helpers
    { s: "です", u: 1, kind: "copula", en: "is / am / are (polite)" },
    { s: "じゃありません", u: 2, kind: "copula", en: "is not (polite)" },
    { s: "ではありません", u: 2, kind: "copula", en: "is not (polite, formal)" },
    { s: "じゃないです", u: 2, kind: "copula", en: "is not (polite, conversational)" },
    { s: "でした", u: 5, kind: "copula", en: "was (polite)" },
    { s: "じゃありませんでした", u: 5, kind: "copula", en: "was not (polite)" },
    { s: "じゃなかったです", u: 18, kind: "copula", en: "was not (polite, conversational)" },
    { s: "だ", u: 16, kind: "copula", en: "is (plain)" },
    { s: "だった", u: 16, kind: "copula", en: "was (plain)" },
    { s: "じゃない", u: 16, kind: "copula", en: "is not (plain)" },
    { s: "じゃなかった", u: 16, kind: "copula", en: "was not (plain)" },
    { s: "んです", u: 19, kind: "ending", en: "explains a situation: “(it’s that) …”" },
    { s: "いけません", u: 15, kind: "ending", en: "(…ては いけません) must not" },
    { s: "こと", u: 18, kind: "noun", en: "thing, matter; 〜たことがある = have done before" },
    { s: "ほう", u: 11, kind: "noun", en: "side; Aのほうが = A is more …; 〜たほうがいい = had better" },
    { s: "{何|なに}か", u: 14, kind: "pronoun", en: "something" },
    { s: "どのぐらい", u: 19, kind: "question", en: "how long / how much (approximately)" },
    { s: "だったら", u: 23, kind: "copula", en: "if (it) is … (after a noun or な-adjective)" },
    { s: "かもしれません", u: 25, kind: "ending", en: "might, may (polite)" },
    { s: "かもしれない", u: 25, kind: "ending", en: "might, may (plain)" },
    { s: "なら", u: 28, kind: "copula", en: "if it's …; as for … (after a noun)" },
    { s: "でございます", u: 30, kind: "copula", en: "is (very polite: shop and hotel staff)" },
    // interjections and fillers
    { s: "あ", u: 3, kind: "interjection", en: "oh!" },
    { s: "あっ", u: 1, kind: "interjection", en: "oh! (sudden)" },
    { s: "ええ", u: 10, kind: "interjection", en: "yes (soft)" },
    { s: "えっ", u: 16, kind: "interjection", en: "huh? what?!" },
    { s: "へえ", u: 9, kind: "interjection", en: "wow, really? (interested)" },
    { s: "わあ", u: 18, kind: "interjection", en: "wow!" },
    { s: "あのう", u: 5, kind: "interjection", en: "um, excuse me… (before a question)" },
    { s: "えーと", u: 5, kind: "interjection", en: "let me see…, um…" },
  ];

  NI.data.names = [
    { j: "{田中|たなか}", en: "Tanaka (family name)" },
    { j: "{佐藤|さとう}", en: "Satō (family name)" },
    { j: "{山田|やまだ}", en: "Yamada (family name)" },
    { j: "{鈴木|すずき}", en: "Suzuki (family name)" },
    { j: "ゆき", en: "Yuki (given name)" },
    { j: "ケン", en: "Ken (given name)" },
    { j: "エマ", en: "Emma (given name)" },
    { j: "{東京|とうきょう}", en: "Tokyo" },
    { j: "{京都|きょうと}", en: "Kyoto" },
    { j: "{大阪|おおさか}", en: "Osaka" },
    { j: "{新宿|しんじゅく}", en: "Shinjuku (area of Tokyo)" },
    { j: "{渋谷|しぶや}", en: "Shibuya (area of Tokyo)" },
    { j: "{上野|うえの}", en: "Ueno (area of Tokyo)" },
    { j: "{浅草|あさくさ}", en: "Asakusa (area of Tokyo)" },
    { j: "{浅草寺|せんそうじ}", en: "Sensō-ji (temple in Asakusa)" },
    { j: "{富士山|ふじさん}", en: "Mount Fuji" },
    { j: "{沖縄|おきなわ}", en: "Okinawa" },
    { j: "{北海道|ほっかいどう}", en: "Hokkaido" },
  ];
})(typeof window !== "undefined" ? window : globalThis);
