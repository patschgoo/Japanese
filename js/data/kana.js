/* Kana charts, katakana loanwords, look-alike katakana, and the word lists
   for the self-introduction builder. */
(function (root) {
  "use strict";
  const NI = root.NI;

  // Each row has five slots (a i u e o); null keeps the grid aligned.
  const ROWS = [
    { id: "a", cells: [["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"]] },
    { id: "ka", cells: [["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"]] },
    { id: "sa", cells: [["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"]] },
    { id: "ta", cells: [["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"]] },
    { id: "na", cells: [["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"]] },
    { id: "ha", cells: [["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"]] },
    { id: "ma", cells: [["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"]] },
    { id: "ya", cells: [["や", "ya"], null, ["ゆ", "yu"], null, ["よ", "yo"]] },
    { id: "ra", cells: [["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"]] },
    { id: "wa", cells: [["わ", "wa"], null, null, null, ["を", "wo"]] },
    { id: "n", cells: [["ん", "n"], null, null, null, null] },
  ];
  const DAKUTEN = [
    { id: "ga", cells: [["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"]] },
    { id: "za", cells: [["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"]] },
    { id: "da", cells: [["だ", "da"], ["ぢ", "ji"], ["づ", "zu"], ["で", "de"], ["ど", "do"]] },
    { id: "ba", cells: [["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"]] },
    { id: "pa", cells: [["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"]] },
  ];
  const YOON = [
    { id: "kya", cells: [["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"]] },
    { id: "sha", cells: [["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"]] },
    { id: "cha", cells: [["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"]] },
    { id: "nya", cells: [["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"]] },
    { id: "hya", cells: [["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"]] },
    { id: "mya", cells: [["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"]] },
    { id: "rya", cells: [["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"]] },
    { id: "gya", cells: [["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"]] },
    { id: "ja", cells: [["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"]] },
    { id: "bya", cells: [["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"]] },
    { id: "pya", cells: [["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"]] },
  ];
  // Combinations that only exist in katakana, for sounds borrowed from other languages.
  const EXTENDED = [
    { id: "fa", cells: [["ファ", "fa"], ["フィ", "fi"], ["フェ", "fe"], ["フォ", "fo"], ["フュ", "fyu"]] },
    { id: "ti", cells: [["ティ", "ti"], ["ディ", "di"], ["トゥ", "tu"], ["ドゥ", "du"], ["デュ", "dyu"]] },
    { id: "wi", cells: [["ウィ", "wi"], ["ウェ", "we"], ["ウォ", "wo"], ["イェ", "ye"]] },
    { id: "she", cells: [["シェ", "she"], ["ジェ", "je"], ["チェ", "che"]] },
    { id: "tsa", cells: [["ツァ", "tsa"], ["ツィ", "tsi"], ["ツェ", "tse"], ["ツォ", "tso"]] },
    { id: "va", cells: [["ヴァ", "va"], ["ヴィ", "vi"], ["ヴ", "vu"], ["ヴェ", "ve"], ["ヴォ", "vo"]] },
  ];

  /* Katakana words: mostly English loans you can often guess once you can read them. */
  const LOANWORDS = [
    { k: "テレビ", en: "TV" },
    { k: "コーヒー", en: "coffee" },
    { k: "パン", en: "bread", note: "From Portuguese pão, not English." },
    { k: "ホテル", en: "hotel" },
    { k: "レストラン", en: "restaurant" },
    { k: "タクシー", en: "taxi" },
    { k: "バス", en: "bus; bath" },
    { k: "トイレ", en: "toilet" },
    { k: "エレベーター", en: "lift, elevator" },
    { k: "エスカレーター", en: "escalator" },
    { k: "エアコン", en: "air conditioner", note: "Short for エアコンディショナー." },
    { k: "リモコン", en: "remote control" },
    { k: "パソコン", en: "computer, PC", note: "Short for パーソナルコンピューター." },
    { k: "ノートパソコン", en: "laptop" },
    { k: "スマホ", en: "smartphone" },
    { k: "インターネット", en: "internet" },
    { k: "メール", en: "email" },
    { k: "カメラ", en: "camera" },
    { k: "ゲーム", en: "game" },
    { k: "アニメ", en: "anime, animation" },
    { k: "ジュース", en: "juice, soft drink" },
    { k: "ビール", en: "beer" },
    { k: "ワイン", en: "wine" },
    { k: "ミルク", en: "milk" },
    { k: "チーズ", en: "cheese" },
    { k: "ケーキ", en: "cake" },
    { k: "アイスクリーム", en: "ice cream" },
    { k: "チョコレート", en: "chocolate" },
    { k: "サンドイッチ", en: "sandwich" },
    { k: "ハンバーガー", en: "hamburger" },
    { k: "ピザ", en: "pizza" },
    { k: "サラダ", en: "salad" },
    { k: "スープ", en: "soup" },
    { k: "カレー", en: "curry" },
    { k: "ステーキ", en: "steak" },
    { k: "ナイフ", en: "knife" },
    { k: "フォーク", en: "fork" },
    { k: "スプーン", en: "spoon" },
    { k: "コップ", en: "glass, cup", note: "From Dutch kop." },
    { k: "テーブル", en: "table" },
    { k: "ベッド", en: "bed" },
    { k: "シャワー", en: "shower" },
    { k: "タオル", en: "towel" },
    { k: "シャツ", en: "shirt" },
    { k: "ズボン", en: "trousers", note: "From French jupon." },
    { k: "スカート", en: "skirt" },
    { k: "セーター", en: "sweater, jumper" },
    { k: "コート", en: "coat" },
    { k: "ネクタイ", en: "necktie" },
    { k: "ハンカチ", en: "handkerchief" },
    { k: "ボールペン", en: "ballpoint pen" },
    { k: "ノート", en: "notebook", note: "Not a note; a notebook." },
    { k: "ニュース", en: "news" },
    { k: "ラジオ", en: "radio" },
    { k: "ピアノ", en: "piano" },
    { k: "ギター", en: "guitar" },
    { k: "サッカー", en: "football, soccer" },
    { k: "テニス", en: "tennis" },
    { k: "プレゼント", en: "present, gift" },
    { k: "チケット", en: "ticket (for an event)" },
    { k: "パスポート", en: "passport" },
    { k: "デパート", en: "department store" },
    { k: "アルバイト", en: "part-time job", note: "From German Arbeit; often shortened to バイト." },
    { k: "マンション", en: "apartment, flat", note: "False friend: a block of flats, not a mansion." },
    { k: "サラリーマン", en: "salaried office worker", note: "Made in Japan from English words." },
    { k: "ガソリンスタンド", en: "petrol station, gas station", note: "Made in Japan." },
    { k: "コンセント", en: "power socket", note: "Made in Japan; nothing to do with consent." },
    { k: "ホッチキス", en: "stapler", note: "From the Hotchkiss brand name." },
    { k: "シャープペンシル", en: "mechanical pencil", note: "Often シャーペン. The Sharp company took its name from an early one, the Ever-Ready Sharp Pencil." },
    { k: "ペットボトル", en: "plastic bottle", note: "From PET, the plastic." },
    { k: "レジ", en: "till, checkout", note: "From register." },
    { k: "バイキング", en: "all-you-can-eat buffet", note: "From “Viking”, after a Tokyo hotel restaurant." },
    { k: "ピーマン", en: "green pepper", note: "From French piment." },
    { k: "ストーブ", en: "heater" },
  ];

  // Katakana that are easy to mix up, with a tip for telling them apart.
  const LOOKALIKES = [
    { set: ["シ", "ツ"], tip: "シ (shi): dots on the left, long stroke sweeps up from the bottom. ツ (tsu): dots along the top, long stroke falls from the top right." },
    { set: ["ソ", "ン"], tip: "ソ (so): short stroke at the top, both strokes fall downward. ン (n): a dot on the left, the long stroke sweeps up." },
    { set: ["ク", "ケ", "タ"], tip: "ク (ku) is two strokes. タ (ta) adds a short stroke inside. ケ (ke): the top line runs straight across without turning down, and a third stroke falls from its middle." },
    { set: ["ウ", "ワ", "フ"], tip: "ウ (u) has a short stroke on top. ワ (wa) has a vertical stroke on the left. フ (fu) is a single stroke." },
    { set: ["ヌ", "ス"], tip: "ヌ (nu) has an extra stroke crossing its tail. ス (su) doesn't." },
    { set: ["マ", "ア"], tip: "ア (a) has a long tail sweeping down. マ (ma) ends in a short dot." },
    { set: ["チ", "テ"], tip: "チ (chi) has a slanted top stroke. テ (te) has a flat top line." },
    { set: ["コ", "ロ", "ユ"], tip: "ロ (ro) is a closed box. コ (ko) is open on the left. ユ (yu) has a bottom line that sticks out." },
    { set: ["ル", "レ"], tip: "ル (ru) is two strokes. レ (re) is a single stroke." },
    { set: ["ノ", "メ"], tip: "ノ (no) is one stroke. メ (me) crosses it with a second." },
  ];

  // Self-introduction builder
  const COUNTRIES = [
    ["アメリカ", "USA"], ["イギリス", "UK"], ["カナダ", "Canada"], ["オーストラリア", "Australia"], ["ニュージーランド", "New Zealand"],
    ["アイルランド", "Ireland"], ["ドイツ", "Germany"], ["フランス", "France"], ["イタリア", "Italy"], ["スペイン", "Spain"],
    ["ポルトガル", "Portugal"], ["オランダ", "Netherlands"], ["ベルギー", "Belgium"], ["スイス", "Switzerland"], ["オーストリア", "Austria"],
    ["スウェーデン", "Sweden"], ["ノルウェー", "Norway"], ["デンマーク", "Denmark"], ["フィンランド", "Finland"], ["ポーランド", "Poland"],
    ["チェコ", "Czechia"], ["ウクライナ", "Ukraine"], ["トルコ", "Türkiye"], ["インド", "India"], ["{中国|ちゅうごく}", "China"],
    ["{韓国|かんこく}", "South Korea"], ["{台湾|たいわん}", "Taiwan"], ["タイ", "Thailand"], ["ベトナム", "Vietnam"], ["フィリピン", "Philippines"],
    ["インドネシア", "Indonesia"], ["マレーシア", "Malaysia"], ["シンガポール", "Singapore"], ["メキシコ", "Mexico"], ["ブラジル", "Brazil"],
    ["アルゼンチン", "Argentina"], ["チリ", "Chile"], ["コロンビア", "Colombia"], ["エジプト", "Egypt"], ["{南|みなみ}アフリカ", "South Africa"],
    ["ナイジェリア", "Nigeria"], ["ケニア", "Kenya"], ["モロッコ", "Morocco"],
  ].map(([j, en]) => ({ j, en }));

  const JOBS = [
    ["{学生|がくせい}", "student"], ["{大学生|だいがくせい}", "university student"], ["{高校生|こうこうせい}", "high-school student"],
    ["{会社員|かいしゃいん}", "office worker"], ["エンジニア", "engineer"], ["プログラマー", "programmer"], ["デザイナー", "designer"],
    ["{教師|きょうし}", "teacher (about yourself)"], ["{医者|いしゃ}", "doctor"], ["{看護師|かんごし}", "nurse"],
    ["{公務員|こうむいん}", "civil servant"], ["{店員|てんいん}", "shop assistant"], ["シェフ", "chef"], ["{研究者|けんきゅうしゃ}", "researcher"],
    ["{弁護士|べんごし}", "lawyer"], ["アーティスト", "artist"], ["フリーランス", "freelancer"], ["{主婦|しゅふ}", "housewife"], ["{主夫|しゅふ}", "househusband"],
  ].map(([j, en]) => ({ j, en }));

  const HOBBIES = [
    ["{料理|りょうり}", "cooking"], ["{旅行|りょこう}", "travel"], ["{音楽|おんがく}", "music"], ["{映画|えいが}", "films"],
    ["{読書|どくしょ}", "reading"], ["スポーツ", "sport"], ["サッカー", "football"], ["ゲーム", "video games"], ["アニメ", "anime"],
    ["{写真|しゃしん}", "photography"], ["{山登|やまのぼ}り", "hiking"], ["ヨガ", "yoga"], ["{歌|うた}", "singing"], ["ダンス", "dancing"],
  ].map(([j, en]) => ({ j, en }));

  NI.data.kana = { ROWS, DAKUTEN, YOON, EXTENDED, LOANWORDS, LOOKALIKES };
  NI.data.builder = { COUNTRIES, JOBS, HOBBIES };
})(typeof window !== "undefined" ? window : globalThis);
