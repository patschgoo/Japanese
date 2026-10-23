/* "How this course works": the learning method and the reasoning behind
   the choice and order of material. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const pages = (NI.pages = NI.pages || {});

  const ext = (href, text) => '<a href="' + href + '" target="_blank" rel="noopener">' + text + "</a>";

  pages.guide = {
    title: "How this course works",
    nav: "guide",
    render() {
      const R = ui.rich;
      return (
        '<article class="guide">' +
        '<header class="page-head"><p class="eyebrow">The method</p><h1>How to learn Japanese once you can read hiragana</h1>' +
        "<p class=\"lede\">Hiragana is the perfect starting point: every Japanese word can be written in it, so from now on you can learn straight from Japanese script, without romaji. What matters next is <b>what</b> you learn, in <b>what order</b>, and <b>how</b> you make it stick. Here is the reasoning this course is built on.</p></header>" +

        '<section><h2>The short version</h2><ol class="short">' +
        "<li><b>Most useful first.</b> A small set of words and patterns makes up most of everyday Japanese. Learn those before anything else.</li>" +
        "<li><b>Words in sentences, phrases as chunks.</b> Meet every word in a real sentence, and learn set phrases like [[いただきます]] whole.</li>" +
        "<li><b>Test yourself, don't re-read.</b> Recalling an answer builds memory far better than looking at it again.</li>" +
        "<li><b>Space it out.</b> Review just as you're about to forget: after hours, then days, then weeks.</li>" +
        "<li><b>Hear it and say it.</b> Listen to every word and sentence, and repeat it out loud.</li>" +
        "<li><b>Read and listen to what you almost fully understand.</b> That is where new words get picked up.</li>" +
        "<li><b>A little every day.</b> Fifteen minutes daily beats two hours on Sunday.</li>" +
        "</ol></section>" +

        "<section><h2>What the research says</h2>" +
        '<div class="principles">' +
        '<div class="principle"><h3>Retrieval beats re-reading</h3><p>In a classic study, students who practised recalling a text remembered much more of it a week later than students who spent the same time re-reading it, even though re-reading felt more effective at the time (Roediger &amp; Karpicke, 2006a). The effect has been replicated many times (Roediger &amp; Karpicke, 2006b).</p><p class="applied"><b>Here:</b> lessons are mostly questions, not explanations, and reviews ask you to recall before showing the answer.</p></div>' +
        '<div class="principle"><h3>Spacing beats cramming</h3><p>A review of 317 experiments found that spreading study out over time improves long-term memory, and that the best gap grows with how long you want to remember (Cepeda et al., 2006).</p><p class="applied"><b>Here:</b> each card comes back after 4 hours, then 1 day, 3 days, a week, two weeks, a month, three months and six months, as long as you remember it. A card you forget comes back sooner. The stages are named after trains, from the local 各停 to the 新幹線.</p></div>' +
        '<div class="principle"><h3>You need to know almost every word</h3><p>Reading research suggests learners need to know about 95% of the words in a text to follow it, and closer to 98% to read it comfortably without help (Laufer, 1989; Hu &amp; Nation, 2000). A study with learners of Japanese found a similar threshold, around 95–96% (Komori, Mikuni &amp; Kondo, 2004). Below that, a text is a puzzle, not practice.</p><p class="applied"><b>Here:</b> every sentence and conversation uses only words you have already met, plus the new ones in the current unit. A script checks this for every sentence in the course.</p></div>' +
        '<div class="principle"><h3>Frequency matters</h3><p>Word use follows a steep curve: a few hundred items cover a large share of what people say and write (Nation, 2013). In frequency counts of written Japanese, such as NINJAL’s BCCWJ corpus, the top of the list is particles and helper words (の, に, は, を, が, です/だ), followed by core verbs like する, ある, いる, なる, 言う and 思う. Learning in order of usefulness means every hour of study buys the most understanding.</p><p class="applied"><b>Here:</b> particles and the です/ます sentence frame come first, then the commonest verbs, adjectives and nouns, chosen for everyday use.</p></div>' +
        '<div class="principle"><h3>Chunks come before rules</h3><p>Fluent speakers rely heavily on ready-made phrases: one corpus analysis found that about half of ordinary English text is made of prefabricated word combinations (Erman &amp; Warren, 2000). Learning [[よろしくお{願|ねが}いします]] or [[{大丈夫|だいじょうぶ}です]] as a single unit gives you usable Japanese on day one and plants grammar you will understand later (Lewis, 1993).</p><p class="applied"><b>Here:</b> unit 1 and the phrasebook teach whole phrases; later units take them apart.</p></div>' +
        '<div class="principle"><h3>Sound from the start</h3><p>Japanese pronunciation is regular, but a few details change meaning: long vowels ([[おばさん]] aunt, [[おばあさん]] grandmother), the small っ ([[きて]] come, [[きって]] stamp) and pitch. Hearing words and repeating them aloud trains your ear and your mouth together.</p><p class="applied"><b>Here:</b> every word, sentence and conversation has audio, played by your device’s Japanese voice.</p></div>' +
        "</div></section>" +

        '<section><h2>Sounds to watch when reading kana</h2><p>You can read hiragana, but a few spellings don\'t sound the way they look:</p><ul class="sounds">' +
        "<li><b>Particles:</b> は is read <b>wa</b>, へ is read <b>e</b> and を is read <b>o</b> when they are particles: [[{私|わたし}は]] (watashi wa).</li>" +
        "<li><b>Long vowels</b> are held for twice as long: おう and おお are a long o ([[がっこう]] gakkō), えい is usually a long e ([[せんせい]] sensē). Katakana marks length with ー: [[コーヒー]].</li>" +
        "<li><b>Small っ</b> is a short silent beat that doubles the next consonant: [[きて]] (come) vs [[きって]] (stamp).</li>" +
        "<li><b>ん</b> changes with the sound after it: it sounds like m before b, p and m ([[さんぽ]], [[しんぶん]]).</li>" +
        "<li><b>Whispered vowels:</b> u and i between voiceless sounds almost disappear, so [[です]] sounds like “des” and [[します]] like “shimas”.</li>" +
        "<li><b>Pitch, not stress:</b> Japanese words rise and fall in pitch ([[はし]] can be chopsticks or bridge). Don't worry about rules yet; copy the audio.</li>" +
        "</ul></section>" +

        '<section><h2>What to learn first, and why</h2><ol class="order">' +
        "<li><b>Survival phrases</b> (unit 1). Greetings, thanks, sorry, please: usable immediately, and they make every later conversation start smoothly.</li>" +
        "<li><b>The sentence frame</b> (2–3). [[AはBです]], questions with か, and the particles は, の, も. The most frequent items in the language, and the skeleton everything else hangs on.</li>" +
        "<li><b>Pointing and asking</b> (3–4). これ/それ/あれ, ここ/そこ/あそこ and the question words 何, 誰, どこ, いくら: you need them in every conversation.</li>" +
        "<li><b>Numbers, prices, time and days</b> (4–5). The first things you need in a shop or at a station.</li>" +
        "<li><b>Verbs in the ます form</b> (6–8). Eat, drink, go, come, see, do, buy, understand, be, with を, に, で, へ and the past tense. Enough to talk about your day.</li>" +
        "<li><b>People and description</b> (9–11). Family, adjectives, likes, wants.</li>" +
        "<li><b>The て-form</b> (12–15). Requests, “is doing” and permission, the gateway to most later grammar, plus invitations with 〜ませんか and 〜ましょう.</li>" +
        "<li><b>Plain forms</b> (16–20). Casual speech, and the base for opinions (と思います), reasons (から), experiences (〜たことがある) and advice (〜たほうがいい).</li>" +
        "</ol><p>This is the core progression shared by the major textbooks (Genki, Minna no Nihongo, Marugoto). It covers roughly the grammar of the JLPT N5 exam and the start of N4.</p></section>" +

        "<section><h2>Choices this course makes</h2>" +
        '<dl class="choices">' +
        "<dt>Polite form first</dt><dd>です/ます forms are regular, safe with anyone, and what you need with strangers. Casual forms arrive in unit 16, once the system makes sense.</dd>" +
        "<dt>Kanji with furigana from day one</dt><dd>Real Japanese is written with kanji, so words appear the way you'll meet them, with the reading on top. You don't have to study kanji yet; you'll absorb the common ones as you go. If it feels like too much, switch to kana only in Options.</dd>" +
        "<dt>No romaji</dt><dd>You already read hiragana. Romaji would make you read Japanese with English spelling habits and hide details like long vowels. You only type romaji, and it turns into kana as you type.</dd>" +
        "<dt>Katakana soon</dt><dd>Katakana writes loanwords such as [[コーヒー]], [[テレビ]] and [[ホテル]]. It has the same 46 sounds you know from hiragana, so it takes days, not months. Until then, “Katakana help” shows hiragana above every katakana word; the Kana trainer gets you reading it.</dd>" +
        "<dt>One story</dt><dd>The conversations follow the same people, Ken, Yuki, Emma and Tanaka-sensei, through everyday situations, so each unit gives context to the next.</dd>" +
        "</dl></section>" +

        '<section><h2>A daily routine</h2><ol class="routine">' +
        "<li><b>Reviews first</b> (5–10 minutes). Clear the cards that are due. Be honest with “Again”: it brings the card back sooner, which is exactly what you want.</li>" +
        "<li><b>One new part</b> (10–15 minutes). A set of words, the sentences, or the conversation of the next unit. One unit every three to five days is a good pace.</li>" +
        "<li><b>Listen and repeat.</b> Play the conversation, then read it aloud along with the audio (shadowing).</li>" +
        "<li><b>Keep the chain going.</b> If you miss a few days, just do your reviews; the schedule adapts.</li>" +
        "</ol><p>By the end of the 20 units you'll know about 450 words and the core grammar of beginner Japanese: enough to introduce yourself, shop, eat out, get around, make plans and talk about your day.</p></section>" +

        "<section><h2>Be realistic, and patient</h2><p>The US Foreign Service Institute puts Japanese in its hardest group for English speakers and estimates about 88 weeks, around 2,200 class hours, to reach professional working proficiency. That's a long road. But the first months bring the fastest gains, and every common word you learn makes real Japanese more readable.</p></section>" +

        "<section><h2>After this course</h2><ul class=\"next\">" +
        "<li><b>Grammar:</b> the Genki or Minna no Nihongo textbooks, or the free " + ext("https://guidetojapanese.org/learn/", "Tae Kim’s Guide to Learning Japanese") + ".</li>" +
        "<li><b>Vocabulary and kanji:</b> keep reviewing daily with " + ext("https://apps.ankiweb.net/", "Anki") + " (a core 2,000-word deck is a good next step) or " + ext("https://www.wanikani.com/", "WaniKani") + " for kanji.</li>" +
        "<li><b>Reading:</b> free graded readers from " + ext("https://tadoku.org/japanese/en/", "Tadoku") + ", then " + ext("https://www3.nhk.or.jp/news/easy/", "NHK News Web Easy") + " (simple news with furigana).</li>" +
        "<li><b>Listening:</b> podcasts and videos made for learners, such as <i>Nihongo con Teppei</i> and <i>Comprehensible Japanese</i>.</li>" +
        "<li><b>Dictionary:</b> " + ext("https://jisho.org/", "Jisho.org") + ".</li>" +
        "<li><b>A goal:</b> the " + ext("https://www.jlpt.jp/e/", "JLPT") + " N5 and N4 exams make a clear target.</li>" +
        "</ul></section>" +

        '<section class="sources"><h2>Sources</h2><ul>' +
        "<li>Roediger, H. L., &amp; Karpicke, J. D. (2006a). Test-enhanced learning: Taking memory tests improves long-term retention. <i>Psychological Science</i>, 17(3), 249–255.</li>" +
        "<li>Roediger, H. L., &amp; Karpicke, J. D. (2006b). The power of testing memory: Basic research and implications for educational practice. <i>Perspectives on Psychological Science</i>, 1(3), 181–210.</li>" +
        "<li>Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., &amp; Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. <i>Psychological Bulletin</i>, 132(3), 354–380.</li>" +
        "<li>Laufer, B. (1989). What percentage of text-lexis is essential for comprehension? In C. Laurén &amp; M. Nordman (Eds.), <i>Special Language: From Humans Thinking to Thinking Machines</i>. Multilingual Matters.</li>" +
        "<li>Komori, K., Mikuni, J., &amp; Kondo, A. (2004). 文章理解を促進する語彙知識の量的側面: 既知語率の閾値探索の試み [Quantitative aspects of vocabulary knowledge that support text comprehension: Looking for a threshold of known-word coverage]. <i>日本語教育</i>, 120.</li>" +
        "<li>Hu, M., &amp; Nation, I. S. P. (2000). Unknown vocabulary density and reading comprehension. <i>Reading in a Foreign Language</i>, 13(1), 403–430.</li>" +
        "<li>Nation, I. S. P. (2013). <i>Learning Vocabulary in Another Language</i> (2nd ed.). Cambridge University Press.</li>" +
        "<li>Erman, B., &amp; Warren, B. (2000). The idiom principle and the open choice principle. <i>Text</i>, 20(1), 29–62.</li>" +
        "<li>Lewis, M. (1993). <i>The Lexical Approach</i>. Language Teaching Publications.</li>" +
        "<li>National Institute for Japanese Language and Linguistics (NINJAL). <i>Balanced Corpus of Contemporary Written Japanese</i> (BCCWJ) word frequency list.</li>" +
        "<li>Foreign Service Institute, U.S. Department of State. Foreign language training: language difficulty categories.</li>" +
        "</ul></section>" +
        '<p class="row center"><a class="btn primary" href="#home">Back to the route map</a></p>' +
        "</article>"
      ).replace(/\[\[(.+?)\]\]/g, (m) => R(m));
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
