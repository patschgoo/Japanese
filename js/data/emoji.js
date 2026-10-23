/* Emoji for concrete words, by word id ("v:" + the word as written).
   Shown on new-word cards, in word lists and in games: a picture next to a
   word helps it stick (dual coding). Units can also set em on a word directly.
   Only picturable words get one: abstract words, verbs and adjectives don't,
   and neither do words no emoji shows fairly (older vs younger siblings,
   お寺, 机). Emoji are Unicode 13 or older, and words with different
   meanings never share a picture (父 and お父さん do: same person). */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  NI.data = NI.data || {};
  NI.data.emoji = {
    // 2 · people and countries
    "v:学生": "🧑‍🎓",
    "v:先生": "🧑‍🏫",
    "v:会社員": "🧑‍💼",
    "v:日本": "🗾",
    "v:アメリカ": "🇺🇸",
    "v:イギリス": "🇬🇧",
    "v:中国": "🇨🇳",
    "v:韓国": "🇰🇷",
    // 3 · things around you
    "v:本": "📖",
    "v:かばん": "👜",
    "v:傘": "☂️",
    "v:時計": "⌚",
    "v:財布": "👛",
    "v:スマホ": "📱",
    "v:写真": "📷",
    "v:車": "🚗",
    "v:水": "💧",
    "v:お茶": "🍵",
    "v:コーヒー": "☕",
    // 4 · shopping
    "v:円": "💴",
    "v:トイレ": "🚻",
    "v:おにぎり": "🍙",
    "v:パン": "🍞",
    // 5 · time
    "v:朝": "🌅",
    "v:夜": "🌙",
    "v:テスト": "📝",
    // 6 · daily life
    "v:朝ご飯": "🍳",
    "v:昼ご飯": "🍱",
    "v:晩ご飯": "🍲",
    "v:ご飯": "🍚",
    "v:テレビ": "📺",
    "v:音楽": "🎧",
    "v:映画": "🎬",
    // 7 · going places
    "v:学校": "🏫",
    "v:会社": "🏢",
    "v:駅": "🚉",
    "v:家": "🏠",
    "v:電車": "🚃",
    "v:新幹線": "🚅",
    "v:バス": "🚌",
    "v:自転車": "🚲",
    "v:歩いて": "🚶",
    "v:友達": "🧑‍🤝‍🧑",
    "v:図書館": "📚",
    "v:スーパー": "🛒",
    // 8 · where things are
    "v:鍵": "🔑",
    "v:犬": "🐶",
    "v:猫": "🐱",
    "v:子供": "🧒",
    "v:男の人": "👨",
    "v:女の人": "👩",
    "v:コンビニ": "🏪",
    "v:銀行": "🏦",
    "v:病院": "🏥",
    "v:ホテル": "🏨",
    "v:公園": "🌳",
    "v:お金": "💰",
    // 9 · family
    "v:家族": "👪",
    "v:父": "👨‍🍼",
    "v:お父さん": "👨‍🍼",
    "v:母": "👩‍🍼",
    "v:お母さん": "👩‍🍼",
    "v:夫": "🤵",
    "v:妻": "👰",
    // 10 · describing
    "v:町": "🏙️",
    "v:天気": "⛅",
    // 11 · food and likes
    "v:食べ物": "🍴",
    "v:飲み物": "🥤",
    "v:肉": "🍖",
    "v:魚": "🐟",
    "v:野菜": "🥦",
    "v:果物": "🍎",
    "v:卵": "🥚",
    "v:すし": "🍣",
    "v:ラーメン": "🍜",
    "v:料理": "🧑‍🍳",
    "v:歌": "🎶",
    "v:スポーツ": "⚽",
    // 12 · requests
    "v:ドア": "🚪",
    // 13 · now
    "v:雨": "🌧️",
    "v:雪": "❄️",
    "v:服": "👕",
    "v:大学": "🎓",
    // 14 · plans
    "v:買い物": "🛍️",
    "v:誕生日": "🎂",
    "v:パーティー": "🎉",
    "v:カラオケ": "🎤",
    "v:お花見": "🌸",
    "v:荷物": "🧳",
    // 15 · rules
    "v:たばこ": "🚬",
    "v:電気": "💡",
    "v:靴": "👟",
    "v:美術館": "🖼️",
    // 16 · casual speech
    "v:宿題": "📓",
    "v:ゲーム": "🎮",
    // 17 · opinions
    "v:晴れ": "☀️",
    "v:曇り": "☁️",
    "v:タクシー": "🚕",
    // 18 · travel and seasons
    "v:温泉": "♨️",
    "v:着物": "👘",
    "v:神社": "⛩️",
    "v:海": "🌊",
    "v:景色": "🏞️",
    "v:お土産": "🍘",
    "v:プレゼント": "🎁",
    "v:春": "🌷",
    "v:夏": "🌻",
    "v:秋": "🍁",
    "v:冬": "⛄",
    "v:夏休み": "🏖️",
    // 19 · directions
    "v:道": "🛣️",
    "v:右": "➡️",
    "v:左": "⬅️",
    "v:信号": "🚥",
    "v:切符": "🎫",
    "v:地図": "🗺️",
    "v:交番": "👮",
    // 20 · health and help
    "v:歯": "🦷",
    "v:目": "👀",
    "v:手": "✋",
    "v:足": "🦶",
    "v:熱": "🌡️",
    "v:風邪": "🤧",
    "v:薬": "💊",
    "v:病気": "🤒",
    "v:医者": "🧑‍⚕️",
    "v:救急車": "🚑",
    "v:警察": "🚓",
  };
  // The picture on each unit's station stamp (see the stamp book).
  NI.data.stamps = {
    1: "🙇", 2: "🤝", 3: "🔍", 4: "💴", 5: "⏰", 6: "☕", 7: "🚃", 8: "🗺️", 9: "🏠", 10: "🏙️",
    11: "❤️", 12: "🙏", 13: "📱", 14: "🌸", 15: "📷", 16: "💬", 17: "💭", 18: "♨️", 19: "🚉", 20: "🏥",
    21: "🎁", 22: "💪", 23: "🌦️", 24: "🍳", 25: "🏖️", 26: "🎯", 27: "😋", 28: "💡", 29: "📋", 30: "🏪",
  };
})(typeof window !== "undefined" ? window : globalThis);
