/* Graded stories: short reads that use only words taught up to their unit.
   NI.addStory({ id, line, unit, title, en, lines: [[japanese, english], …], q: [{ q, a, o }] }) */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});

  // はじめ線 (units 1–5): only です/でした, no verbs yet. Follows the unit 5 talk about Monday's test.
  NI.addStory({
    id: "h1",
    line: "H",
    unit: 5,
    title: "ケンさんの {休|やす}み",
    en: "Ken's Day Off",
    lines: [
      ["{朝|あさ}です。ケンさんは {学生|がくせい}です。ゆきさんは {会社員|かいしゃいん}です。", "It's morning. Ken is a student, and Yuki is an office worker."],
      ["「ゆきさん、 おはようございます。{今日|きょう}は {休|やす}みですね。」", "“Good morning, Yuki. It's a day off today, isn't it?”"],
      ["「いいえ、 {仕事|しごと}ですよ。」", "“No, I have work.”"],
      ["「{仕事|しごと}ですか。{今日|きょう}は {日曜日|にちようび}ですよ。」", "“Work? But it's Sunday today.”"],
      ["「ケンさん、 {日曜日|にちようび}は {昨日|きのう}でしたよ。{今日|きょう}は {月曜日|げつようび}です。」", "“Ken, Sunday was yesterday. Today is Monday.”"],
      ["「あっ！{田中|たなか}{先生|せんせい}の テストは {今日|きょう}です！{9|く}{時|じ}からです！」", "“Oh no! Tanaka-sensei's test is today! It starts at nine!”"],
      ["「{今|いま} {8|はち}{時|じ}{50|ごじゅっ}{分|ぷん}ですよ！{頑張|がんば}ってください！」", "“It's 8:50 now! Good luck!”"],
      ["{夜|よる}です。「ケンさん、 テストは？」", "It's evening. “Ken, how was the test?”"],
      ["「{大丈夫|だいじょうぶ}でした。ゆきさん、 {明日|あした}は {火曜日|かようび}ですね？」", "“It went fine. Yuki… tomorrow is Tuesday, right?”"],
    ],
    q: [
      { q: "What day is it in the story?", a: "Monday", o: ["Sunday", "Saturday", "Tuesday"] },
      { q: "What time does Ken's test start?", a: "At nine", o: ["At 8:50", "At eight", "In the evening"] },
      { q: "How did the test go?", a: "It went fine.", o: ["Ken missed it.", "It was cancelled.", "It moved to next week."] },
    ],
  });

  // まいにち線 (units 6–10): ます-verbs, あります, describing with adjectives.
  NI.addStory({
    id: "m1",
    line: "M",
    unit: 10,
    title: "{古|ふる}い {時計|とけい}",
    en: "The Old Clock",
    lines: [
      ["{日曜日|にちようび}、 ケンさんは ゆきさんと {浅草|あさくさ}へ {行|い}きました。", "On Sunday, Ken went to Asakusa with Yuki."],
      ["{浅草|あさくさ}は {古|ふる}くて にぎやかな {町|まち}です。{店|みせ}が たくさん あります。", "Asakusa is an old, lively part of the city. There are lots of shops."],
      ["{小|ちい}さい {店|みせ}に、 {古|ふる}くて きれいな {時計|とけい}が ありました。", "In a small shop, there was a beautiful old clock."],
      ["「すみません、 この {時計|とけい}は いくらですか。」", "“Excuse me, how much is this clock?”"],
      ["「{500|ごひゃく}{円|えん}です。」", "“It's 500 yen.”"],
      ["「ケンさん、 {安|やす}いですね！」", "“Ken, that's cheap!”"],
      ["「じゃあ、 これを ください。」", "“I'll take it, then.”"],
      ["{夜|よる} {9|く}{時|じ}、 ケンさんは {部屋|へや}で {時計|とけい}を {見|み}ました。{時計|とけい}は {3|さん}{時|じ}でした。", "At nine that evening, Ken looked at the clock in his room. It said three o'clock."],
      ["{月曜日|げつようび}の {朝|あさ}、 {7|しち}{時|じ}に {起|お}きました。 でも、 {時計|とけい}は {3|さん}{時|じ}でした。", "On Monday morning, he got up at seven. But the clock said three o'clock."],
      ["「ゆきさん、 この {時計|とけい}は いつも {3|さん}{時|じ}です。」", "“Yuki, this clock always says three o'clock.”"],
      ["「{500|ごひゃく}{円|えん}の {時計|とけい}ですから…。」", "“Well, it's a 500-yen clock…”"],
      ["でも、 きれいな {時計|とけい}です。ケンさんの {部屋|へや}は、 {今日|きょう}も {3|さん}{時|じ}です。", "But it's a beautiful clock. In Ken's room, it's three o'clock again today."],
    ],
    q: [
      { q: "Where did Ken find the clock?", a: "In a small shop in Asakusa", o: ["At a big supermarket", "At the station", "In Yuki's room"] },
      { q: "How much was the clock?", a: "500 yen", o: ["300 yen", "3,000 yen", "5,000 yen"] },
      { q: "What is strange about the clock?", a: "It always says three o'clock.", o: ["It is very loud.", "It is brand new.", "It rings at seven every morning."] },
    ],
  });

  // できる線 (units 11–15): て-form, 〜ています, offers and invitations, permission.
  NI.addStory({
    id: "d1",
    line: "D",
    unit: 15,
    title: "{大|おお}きい おにぎり",
    en: "One Big Rice Ball",
    lines: [
      ["{土曜日|どようび}、 ゆきさんの ご{両親|りょうしん}が ケンさんを {昼|ひる}ご{飯|はん}に {呼|よ}びました。", "On Saturday, Yuki's parents invited Ken over for lunch."],
      ["ゆきさんの {家|いえ}で、 お{母|かあ}さんが {料理|りょうり}を していました。", "At Yuki's family home, her mother was cooking."],
      ["「{何|なに}か {手伝|てつだ}いましょうか。」", "“Can I help with anything?”"],
      ["「ありがとう。じゃあ、 おにぎりを {作|つく}ってください。」", "“Thank you. Then could you make the rice balls?”"],
      ["ケンさんは {料理|りょうり}が あまり {上手|じょうず}じゃありません。 でも、 {頑張|がんば}りました。", "Ken isn't much of a cook. But he did his best."],
      ["ケンさんは おにぎりを {一|ひと}つだけ {作|つく}りました。とても {大|おお}きい おにぎりでした。", "Ken made just one rice ball. It was a very, very big one."],
      ["{中|なか}に {肉|にく}と {魚|さかな}と {卵|たまご}と {野菜|やさい}が {入|はい}っていました。", "Inside, there was meat, fish, egg and vegetables."],
      ["ゆきさんの {妹|いもうと}さんが {来|き}ました。", "Yuki's younger sister came in."],
      ["「ケンさん、 その おにぎりの {写真|しゃしん}を {撮|と}っても いいですか。」", "“Ken, may I take a photo of that rice ball?”"],
      ["{昼|ひる}ご{飯|はん}の {時間|じかん}です。{5|ご}{人|にん}で ケンさんの おにぎりを {食|た}べました。", "Then it was time for lunch. The five of them shared Ken's rice ball."],
      ["ゆきさんの お{父|とう}さんは {一番|いちばん} たくさん {食|た}べました。", "Yuki's father ate the most."],
      ["「{大|おお}きくて おいしい おにぎりですね！」", "“What a big, tasty rice ball!”"],
      ["「ケンさん、 また {来|き}てくださいね。{今度|こんど}は {一緒|いっしょ}に {小|ちい}さい おにぎりを {作|つく}りましょう。」", "“Ken, please come again. Next time, let's make some small rice balls together.”"],
    ],
    q: [
      { q: "Who invited Ken for lunch?", a: "Yuki's parents", o: ["Emma", "Tanaka-sensei", "Ken's classmates"] },
      { q: "How many rice balls did Ken make?", a: "Just one, but a very big one", o: ["Five small ones", "Ten", "None"] },
      { q: "What did Yuki's sister want to do?", a: "Take a photo of the rice ball", o: ["Eat it all by herself", "Watch TV", "Go to a restaurant"] },
    ],
  });

  // かいわ線 (units 16–20): Ken and Yuki talk casually now; health and getting help.
  NI.addStory({
    id: "k1",
    line: "K",
    unit: 20,
    title: "お{大事|だいじ}に",
    en: "Get Well Soon",
    lines: [
      ["ケンさんと ゆきさんは {毎朝|まいあさ}、 {一緒|いっしょ}に {駅|えき}まで {歩|ある}いて {行|い}きます。", "Every morning, Ken and Yuki walk to the station together."],
      ["でも、 {金曜日|きんようび}の {朝|あさ}、 ケンさんは {来|き}ませんでした。ゆきさんは ケンさんに {電話|でんわ}しました。", "But on Friday morning, Ken didn't come. Yuki phoned him."],
      ["「もしもし、 ケン？どうした？」", "“Hello, Ken? What's wrong?”"],
      ["「{風邪|かぜ}を ひいたと {思|おも}う…。{熱|ねつ}が あって、 {頭|あたま}も {痛|いた}い。{薬|くすり}も ない…。」", "“I think I've caught a cold… I've got a fever and a headache. And I'm out of medicine…”"],
      ["「えっ、 {大丈夫|だいじょうぶ}？じゃあ、 {夜|よる}に {薬|くすり}を {持|も}って {行|い}くね。{今日|きょう}は ゆっくり {寝|ね}て。」", "“Oh no, are you OK? I'll bring you some medicine this evening, then. Get some rest today.”"],
      ["{夜|よる}、 ゆきさんは {薬|くすり}と {果物|くだもの}と おにぎりを {持|も}って {来|き}ました。", "That evening, Yuki came over with medicine, fruit and rice balls."],
      ["「ありがとう、 ゆき。もう {大丈夫|だいじょうぶ}だよ。{明日|あした}、 カラオケに {行|い}かない？」", "“Thanks, Yuki. I'm fine now. Want to go to karaoke tomorrow?”"],
      ["「だめ！{薬|くすり}を {飲|の}んで、 {早|はや}く {寝|ね}た ほうが いいよ。」", "“No way! You'd better take your medicine and go to bed early.”"],
      ["ケンさんは {薬|くすり}を {飲|の}んで、 {週末|しゅうまつ}は ゆっくり {休|やす}みました。", "Ken took the medicine and rested all weekend."],
      ["{月曜日|げつようび}、 ケンさんは {元気|げんき}に なりました。 でも、 {今度|こんど}は ゆきさんが {風邪|かぜ}を ひきました。", "By Monday, Ken was well again. But this time, Yuki caught a cold."],
      ["{夜|よる}、 ケンさんは {薬|くすり}と {果物|くだもの}を {持|も}って、 ゆきさんの {部屋|へや}へ {行|い}きました。", "That evening, Ken took medicine and fruit over to Yuki's flat."],
      ["「ありがとう、 ケン。もう {大丈夫|だいじょうぶ}だよ。{明日|あした}、 カラオケに {行|い}かない？」", "“Thanks, Ken. I'm fine now. Want to go to karaoke tomorrow?”"],
      ["「だめ！{早|はや}く {寝|ね}た ほうが いいよ。お{大事|だいじ}に！」", "“No way! You'd better go to bed early. Get well soon!”"],
    ],
    q: [
      { q: "Why didn't Ken walk to the station on Friday?", a: "He had a cold.", o: ["He overslept.", "He took a taxi.", "He went to Kyoto."] },
      { q: "What did Yuki bring Ken?", a: "Medicine, fruit and rice balls", o: ["A new video game", "Ramen and coffee", "Flowers"] },
      { q: "What happened after Ken got better?", a: "Yuki caught a cold.", o: ["They went to karaoke.", "Ken caught another cold.", "Yuki went to Hokkaido."] },
    ],
  });
})(typeof window !== "undefined" ? window : globalThis);
