/* "How this course works": the learning method, the research behind it, and
   routes for different goals, schedules and kinds of learner. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const pages = (NI.pages = NI.pages || {});

  const ext = (href, text) => '<a href="' + href + '" target="_blank" rel="noopener">' + text + "</a>";
  const about = (n) => (n >= 100 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);

  const principle = (title, body, applied) => '<div class="principle"><h3>' + title + "</h3>" + body + '<p class="applied"><b>Here:</b> ' + applied + "</p></div>";

  // "If you …": preferences and worries, and the parts of the site that suit them.
  const IF_YOU = [
    ["like to listen", "Play conversations and stories with <b>Play all</b>, then <b>Shadow</b> them. <b>Listen on the go</b> plays your words and sentences hands-free, with pauses to answer. Time Attack has a listening mode, and the 🔍 breakdown plays any sentence slowly.", [["#listen", "Listen on the go"], ["#stories", "Stories"]]],
    ["like to talk", "Take a part in a <b>role-play</b> and answer Ken, Yuki and the others. Lessons include <b>Say it</b> cards, and where your browser can recognise speech, a microphone check shows which sounds it heard. In the 🔍 breakdown you can also record yourself and compare.", [["#roleplays", "Role-play"], ["#maker", "Sentence Maker"]]],
    ["like to do things with your hands", "Write kana with your finger or a mouse in the Kana trainer, with every stroke checked; build sentences from tiles, and match cards in Memory Match.", [["#kana-write", "Write kana"], ["#game-memory", "Memory Match"]]],
    ["are often on the move", "Use <b>Listen on the go</b> on a walk or a commute, and keep a few reviews for the bus. Everything works offline once the site has loaded.", [["#listen", "Listen on the go"], ["#review", "Reviews"]]],
    ["like to read", "Read the graded <b>Stories</b>, or paste any Japanese into the <b>Reader</b> to see how much of it you know. Turn on word meanings when a text is a stretch.", [["#stories", "Stories"], ["#reader", "Reader"]]],
    ["like rules and systems", "The <b>Grammar</b> list collects every pattern. Tap 🔍 on any sentence for a word-by-word breakdown with each particle’s job and each verb form named.", [["#grammar", "Grammar list"]]],
    ["like games and goals", "Daily missions, XP and levels, a stamp for every station, line exams for gold, and four games with personal bests.", [["#play", "Play"], ["#stamps", "Stamp book"]]],
    ["get nervous about mistakes", "Mistakes are just practice here: hints are always there, wrong answers come back gently in your mistakes notebook, and recordings never leave your device. <b>Relaxed mode</b> takes the clocks and hearts out of the games.", [["#options", "Options"], ["#mistakes", "Mistakes notebook"]]],
    ["prefer short bursts", "A lesson part takes five to ten minutes and a game one or two. A low daily goal still keeps a streak going, and two short sessions beat one long one.", [["#options", "Daily goal"]]],
    ["aren’t sure of your kana yet", "Use <b>Kana practice</b>: let it pick the kana as you improve, or tick the rows you want, and work up stage by stage from recognising each one to writing it from memory. A test gives you a score; the <b>chart</b> shows how well you know each kana.", [["#kana-practice", "Kana practice"], ["#kana-chart", "Kana chart"]]],
    ["find kanji daunting","Every kanji has its reading on top. If that is still too much, switch to kana only in Options; switch back once the common ones look familiar.", [["#options", "Options"]]],
    ["already read Chinese characters", "Many kanji will look familiar, though the readings and some meanings differ. Lean on reading: the Stories and the Reader will move fast for you.", [["#reader", "Reader"]]],
  ];

  const TIME = [
    ["About 5 minutes", "Clear your reviews. On days with a little more time, add one lesson part.", "Casual · 30 XP"],
    ["10–15 minutes", "Reviews, then one new lesson part: a unit every four or five days.", "Regular · 60 XP"],
    ["20–30 minutes", "Reviews and a lesson part, then a story, a game or shadowing a conversation.", "Serious · 120 XP"],
    ["An hour or more", "Split it into two or three sittings. Add the Reader with real texts and record yourself.", "Intense · 200 XP"],
  ];

  pages.guide = {
    title: "How this course works",
    nav: "guide",
    render() {
      const R = ui.rich;
      const words = NI.course.words;
      const units = NI.course.units;
      const lastUnit = units.length ? units[units.length - 1].n : 0;
      const wordsTo = (n) => about(words.filter((w) => w.unit <= n).length);
      const goal = NI.store.settings.goal;
      const toc = [
        ["short", "In short"],
        ["routes", "Find your route"],
        ["research", "The research"],
        ["helpers", "Helpers"],
        ["order", "What comes when"],
        ["routine", "A daily routine"],
        ["sources", "Sources"],
      ];
      return (
        '<article class="guide">' +
        '<header class="page-head"><p class="eyebrow">The method</p><h1>How to learn Japanese once you can read hiragana</h1>' +
        "<p class=\"lede\">Hiragana is the perfect starting point: every Japanese word can be written in it, so from now on you can learn straight from Japanese script, without romaji. What matters next is <b>what</b> you learn, in <b>what order</b>, and <b>how</b> you make it stick. Here is the reasoning this course is built on, and how to make it fit you.</p></header>" +
        '<nav class="toc" aria-label="On this page">' + toc.map(([id, t]) => '<button class="chip" type="button" data-jump="' + id + '">' + t + "</button>").join("") + "</nav>" +

        '<section id="g-short"><h2>The short version</h2><ol class="short">' +
        "<li><b>Most useful first.</b> A small set of words and patterns makes up most of everyday Japanese. Learn those before anything else.</li>" +
        "<li><b>Words in sentences, phrases as chunks.</b> Meet every word in a real sentence, and learn set phrases like [[いただきます]] whole.</li>" +
        "<li><b>Test yourself, don't re-read.</b> Recalling an answer builds memory far better than looking at it again.</li>" +
        "<li><b>Space it out, and mix it up.</b> Review just as you're about to forget, and mix different kinds of practice.</li>" +
        "<li><b>Hear it and say it.</b> Listen to every word and sentence, and say it out loud yourself.</li>" +
        "<li><b>Read and listen to lots of easy Japanese.</b> Text you almost fully understand is where new words get picked up.</li>" +
        "<li><b>A little every day.</b> Fifteen minutes daily beats two hours on Sunday. Tie it to something you already do.</li>" +
        "<li><b>Make it yours.</b> Pick your goal and the practice you enjoy; just keep the core: daily reviews, new material, and plenty of listening and speaking.</li>" +
        "</ol></section>" +

        '<section id="g-routes"><h2>Find your route</h2>' +
        "<p>People really do differ in how they learn languages: in their goals, how much time they have, what they already know, how confident they feel and what keeps them going (Dörnyei, 2005). Those differences are worth planning around.</p>" +
        "<p>One popular idea is not: that you are a “visual”, “auditory” or “hands-on” learner and should be taught that way. A major review found no good evidence that matching lessons to a preferred learning style improves learning (Pashler et al., 2008). Your preferences are real, and enjoying what you do matters, but everyone remembers more when they see, hear <i>and</i> say a word.</p>" +
        "<h3>By goal</h3>" +
        '<p class="small muted">Choosing a goal sets your lesson focus: what lessons practise most. You can change it any time in <a href="#options">Options</a>.</p>' +
        '<div class="routes">' +
        NI.plan.GOALS.map(
          (g) =>
            '<div class="route' + (goal === g.id ? " mine" : "") + '"><h4><span aria-hidden="true">' + g.icon + "</span> " + esc(g.t) + (goal === g.id ? ' <span class="tag ok">Your goal</span>' : "") + "</h4>" +
            "<p>" + esc(g.tip) + "</p>" +
            '<p class="route-links">' + (g.go || []).map(([h, t]) => '<a href="' + h + '">' + esc(t) + "</a>").join(" · ") + "</p>" +
            (goal === g.id ? "" : '<button class="btn small ghost" type="button" data-goal="' + g.id + '">Make this my goal</button>') +
            "</div>"
        ).join("") +
        "</div>" +
        "<h3>By time</h3>" +
        '<dl class="times">' + TIME.map(([t, d, plan]) => "<div><dt>" + t + "</dt><dd>" + d + ' <span class="tag">' + plan + "</span></dd></div>").join("") + "</dl>" +
        '<p class="small muted">The daily goal in <a href="#options">Options</a> sets your XP target. Pick one you can hit on a bad day: a habit that survives busy weeks is worth more than an ambitious one that breaks.</p>' +
        "<h3>By what suits you</h3>" +
        '<ul class="if-you">' +
        IF_YOU.map(([who, what, links]) => "<li><b>If you " + who + ":</b> " + what + ' <span class="route-links">' + links.map(([h, t]) => '<a href="' + h + '">' + esc(t) + "</a>").join(" · ") + "</span></li>").join("") +
        "</ul>" +
        "<p>What helps also depends on what you already know. In one study, picture mnemonics for hiragana helped learners who had only ever used the Roman alphabet, but not those who already read another script, and the advantage had faded a few days later (Matsunaga, 2003). So treat tricks as starting aids and keep the reviews going.</p>" +
        "</section>" +

        '<section id="g-research"><h2>What the research says</h2>' +
        "<h3>Making it stick</h3>" +
        '<div class="principles">' +
        principle(
          "Retrieval beats re-reading",
          "<p>In a classic study, students who practised recalling a text remembered much more of it a week later than students who spent the same time re-reading it, even though re-reading felt more effective at the time (Roediger &amp; Karpicke, 2006a). The effect has been replicated many times (Roediger &amp; Karpicke, 2006b).</p>",
          "lessons are mostly questions, not explanations, and reviews ask you to recall before showing the answer."
        ) +
        principle(
          "Spacing beats cramming",
          "<p>A review of 317 experiments found that spreading study out over time improves long-term memory, and that the best gap grows with how long you want to remember (Cepeda et al., 2006).</p>",
          "each card comes back after 4 hours, then 1 day, 3 days, a week, two weeks, a month, three months and six months, as long as you remember it. A card you forget comes back sooner. The stages are named after trains, from the local 各停 to the 新幹線."
        ) +
        principle(
          "Mix it up",
          "<p>Students who studied paintings by several artists mixed together were much better at recognising new paintings by those artists than students who studied one artist at a time, yet most of them believed the one-at-a-time order had worked as well or better (Kornell &amp; Bjork, 2008). Across 59 studies the benefit of mixing was moderate and varied a lot, and was largest for things that are similar and easy to confuse (Brunmair &amp; Richter, 2019).</p>",
          "lessons switch between kinds of question, reviews mix words and sentences from every unit you've done, and the games and line exams draw on everything at once."
        ) +
        principle(
          "Say it out loud",
          "<p>Words read aloud are remembered better than words read silently: the “production effect” (MacLeod et al., 2010). Saying it yourself works better than hearing someone else say it, or even hearing a recording of yourself (Forrin &amp; MacLeod, 2018).</p>",
          "<b>Say it</b> cards in lessons ask you to say a sentence aloud before you check it, and the 🔍 breakdown lets you record yourself and compare with the model voice."
        ) +
        principle(
          "Write new characters by hand",
          "<p>Adults learning an unfamiliar script recognised the characters better later when they had practised writing them by hand than when they had typed them (Longcamp et al., 2008). Writing builds a memory of how each character is formed, not just how it looks.</p>",
          "the Kana trainer has a <b>Write</b> tab, and practice stages for tracing and for writing from memory: each stroke is checked for its shape, its direction and its place in the order."
        ) +
        principle(
          "Pictures can help, a little",
          "<p>Concrete words that call up a mental image are easier to learn, and a picture next to a word can help it stick (Sadoski, 2005). The evidence is mixed for abstract words and for long-term memory, so pictures are a bonus, not a method.</p>",
          "concrete words show an emoji next to them; the sentence and the sound do the real work."
        ) +
        "</div>" +

        "<h3>Understanding and fluency</h3>" +
        '<div class="principles">' +
        principle(
          "You need to know almost every word",
          "<p>Reading research suggests learners need to know about 95% of the words in a text to follow it, and closer to 98% to read it comfortably without help (Laufer, 1989; Hu &amp; Nation, 2000). A study with learners of Japanese found a similar threshold, around 95–96% (Komori, Mikuni &amp; Kondo, 2004). Below that, a text is a puzzle, not practice.</p>",
          "every sentence and conversation uses only words you have already met, plus the new ones in the current unit. A script checks this for every sentence in the course. The Reader shows the share of words you know in any text you paste."
        ) +
        principle(
          "Frequency matters",
          "<p>Word use follows a steep curve: a few hundred items cover a large share of what people say and write (Nation, 2013). In frequency counts of written Japanese, such as NINJAL’s BCCWJ corpus, the top of the list is particles and helper words (の, に, は, を, が, です/だ), followed by core verbs like する, ある, いる, なる, 言う and 思う. Learning in order of usefulness means every hour of study buys the most understanding.</p>",
          "particles and the です/ます sentence frame come first, then the commonest verbs, adjectives and nouns, chosen for everyday use."
        ) +
        principle(
          "Chunks come before rules",
          "<p>Fluent speakers rely heavily on ready-made phrases: one corpus analysis found that about half of ordinary English text is made of prefabricated word combinations (Erman &amp; Warren, 2000). Learning [[よろしくお{願|ねが}いします]] or [[{大丈夫|だいじょうぶ}です]] as a single unit gives you usable Japanese on day one and plants grammar you will understand later (Lewis, 1993).</p>",
          "unit 1 and the phrasebook teach whole phrases; later units take them apart."
        ) +
        principle(
          "Read lots of easy text",
          "<p>A meta-analysis of 49 studies found that extensive reading, meaning lots of easy, enjoyable text rather than slow study of hard text, improves reading ability (d = 0.46 against comparison groups), with larger gains for adults and for longer programmes (Jeon &amp; Day, 2016). It fits the idea that we acquire a language by understanding messages in it (Krashen, 1982).</p>",
          "graded Stories use only words you know, and the Reader lets you check any text before you dive in."
        ) +
        principle(
          "Help while you read",
          "<p>On-screen glosses, meanings you can call up while you read, help both comprehension and the learning of new words (Abraham, 2008). Highlighting grammar on its own, such as colouring particles, has only a small effect (Lee &amp; Huang, 2008): it helps you notice, which is where learning starts (Schmidt, 1990), but practice does the rest.</p>",
          "tap any word for its reading and meaning, turn on meanings under every word, or colour-code the particles. The 🔍 breakdown names every particle's job."
        ) +
        principle(
          "Sound from the start",
          "<p>Japanese pronunciation is regular, but a few details change meaning: long vowels ([[おばさん]] aunt, [[おばあさん]] grandmother), the small っ ([[きて]] come, [[きって]] stamp) and pitch. Hearing words and repeating them aloud trains your ear and your mouth together.</p>",
          "every word, sentence and conversation has audio, played by your device’s Japanese voice, at normal or slow speed."
        ) +
        principle(
          "Shadowing trains your ear",
          "<p>Shadowing means repeating a recording a moment behind the speaker. A study with Japanese learners of English found it improved listening comprehension, especially for lower-level learners, mainly by helping them pick out sounds and words in natural-speed speech (Hamada, 2016).</p>",
          "conversations and stories have a <b>Shadow</b> button that plays each line, then gives you time to say it."
        ) +
        principle(
          "Read while you listen",
          "<p>Reading a text while hearing it read aloud improved learners’ reading speed and comprehension more than reading silently, and the gains lasted (Chang &amp; Millett, 2015).</p>",
          "stories and conversations highlight each line as it’s read, and every sentence has audio at normal or slow speed."
        ) +
        principle(
          "Feedback on your pronunciation",
          "<p>Across 15 studies, practice with automatic speech recognition improved learners’ pronunciation (g = 0.69), most of all when it showed them clearly what was wrong (Ngo, Chen &amp; Lai, 2024).</p>",
          "where your browser can recognise speech, a microphone check shows what it heard and marks the sounds it missed."
        ) +
        principle(
          "Use it, too",
          "<p>Listening and reading build understanding, but trying to say something yourself shows you what you can't say yet, and pushes you to notice how Japanese does it (Swain, 1985).</p>",
          "you type answers from memory, build sentences from tiles, make your own in the Sentence Maker, and take a part in role-plays of the course conversations."
        ) +
        "</div>" +

        "<h3>Keeping going</h3>" +
        '<div class="principles">' +
        principle(
          "A phone is a good place to learn",
          "<p>A meta-analysis of 44 studies found that learning a language with mobile devices beat comparable teaching without them (d = 0.55) (Sung, Chang &amp; Yang, 2015). Short sessions fit into the gaps of a day.</p>",
          "everything works on a phone and offline: a lesson part takes a few minutes, a game one or two, and Listen on the go needs no hands at all."
        ) +
        principle(
          "Habits take about two months",
          "<p>When people built a new daily habit, it took a median of 66 days to become automatic, from 18 to over 250 depending on the person and the habit, and missing a single day made no real difference (Lally et al., 2010). Making an if-then plan (“after breakfast, I’ll do my reviews”) makes people clearly more likely to follow through: a medium-to-large effect (d = 0.65) across 94 studies (Gollwitzer &amp; Sheeran, 2006).</p>",
          "a daily goal, a streak and this week's dots. Every 7 days in a row earn a <b>rest day</b> 🎫, which keeps your streak alive if you miss a day. Pick a fixed moment for Japanese, and if you miss a day, just carry on."
        ) +
        principle(
          "Games help when the game is the learning",
          "<p>A meta-analysis found that gamified learning has small to medium benefits for what students learn (g = 0.49), their motivation (g = 0.36) and their behaviour (g = 0.25) (Sailer &amp; Homner, 2020).</p>",
          "points are only as good as what they reward, so XP comes from practising: answering, reviewing, reading and speaking. Every game is retrieval practice with words you've met, and mistakes go into your notebook."
        ) +
        principle(
          "Relaxed learners learn more",
          "<p>A meta-analysis found that the more anxious learners feel about a language, the lower their achievement tends to be (r = −0.36) (Teimouri, Goetze &amp; Plonsky, 2019). Making mistakes feel safe matters.</p>",
          "hints, retries and a mistakes notebook instead of penalties; nothing in lessons is timed; recordings stay on your device; Relaxed mode takes the clocks out of the games."
        ) +
        principle(
          "Choice, progress and people",
          "<p>Motivation lasts when people feel in control of what they do, feel themselves getting better, and feel connected to others (Ryan &amp; Deci, 2000).</p>",
          "you choose your goal, focus and daily target; levels, stamps and the route map show your progress; the conversations follow the same people. Find a friend, class or language exchange to use what you learn."
        ) +
        "</div></section>" +

        '<section id="g-helpers"><h2>Helpers for beginners</h2><ul class="helpers">' +
        "<li><b>Tap any Japanese</b>, wherever it appears, to hear it and see its reading and meaning, with links to Jisho, Google Translate and DeepL. That includes headings, the phrasebook and the culture notes, and grammar written in English text such as い-adjective or 〜ませんか, which opens its grammar point. <b>Select</b> a longer stretch to hear it, slowly too, or to see each word’s meaning. During a question the meaning stays hidden until you ask for it, and then counts as a hint.</li>" +
        "<li><b>Reading aids</b> above Japanese text: meanings or romaji under every word, colour-coded particles, furigana only on tap. Tapping a name or compound shows what it's made of: はじめ線 is はじめ “the start” + 線 “line”.</li>" +
        "<li><b>🔍 Break it down</b> on any sentence: word by word, what each particle does, which verb form is used, slow audio, and record-and-compare.</li>" +
        '<li><b><a href="#reader">Reader</a>:</b> paste any Japanese text to see how much of it you know, look up the rest, or send it to Google Translate or DeepL. It also finds course words and sentences for English you type.</li>' +
        '<li><b><a href="#maker">Sentence Maker</a>:</b> pick a pattern and the parts, and it builds a correct sentence in any tense, polite or casual, as a question or a request.</li>' +
        "<li><b>Hints</b> in every lesson (press H): fewer options, or the first letters of the answer, for half the XP.</li>" +
        '<li><b><a href="#mistakes">Mistakes notebook</a>:</b> everything you get wrong, until you get it right twice.</li>' +
        '<li><b><a href="#book">Word book</a>:</b> save any word you meet (tap it and choose Save, or the bookmark beside it), sort words into your own lists next to All saved words, and add words from outside the course. Any list can go into your reviews.</li>' +
        '<li><b><a href="#vtest">Vocabulary tests</a>:</b> test yourself on a list, your saved words, your reviews, your mistakes or any course units, with the question types you choose (meaning, Japanese, listening, typing, kanji readings). Each list keeps its last and best score; flashcards are there for a quick run-through.</li>' +
        '<li><b><a href="#profiles">Learning profiles</a>:</b> one for each person learning on this device, each with its own progress, word book, plan and settings.</li>' +
        '<li><b><a href="#phrases">Phrasebook</a>:</b> ready-made phrases for shops, restaurants, stations and emergencies.</li>' +
        '<li><b><a href="#roleplays">Role-play</a>:</b> take a part in any course conversation and answer your partner.</li>' +
        '<li><b><a href="#listen">Listen on the go</a>:</b> hands-free audio with pauses to recall, Japanese first or English first.</li>' +
        '<li><b><a href="#kana-practice">Kana practice</a>:</b> choose the kana or let it choose them as you improve, from recognising each one to writing it from memory; train, or take a test with a score. Save what you chose as a setup (Hiragana and Katakana are there to begin with) and switch between them.</li>' +
        '<li><b><a href="#kana-chart">Kana chart</a>:</b> hiragana and katakana side by side, coloured by how well you know each; tap one to hear it and watch its stroke order.</li>' +
        '<li><b><a href="#kana-write">Write kana</a>:</b> trace, then write from memory, with every stroke checked.</li>' +
        "</ul></section>" +

        '<section><h2>Sounds to watch when reading kana</h2><p>You can read hiragana, but a few spellings don\'t sound the way they look:</p><ul class="sounds">' +
        "<li><b>Particles:</b> は is read <b>wa</b>, へ is read <b>e</b> and を is read <b>o</b> when they are particles: [[{私|わたし}は]] (watashi wa).</li>" +
        "<li><b>Long vowels</b> are held for twice as long: おう and おお are a long o ([[がっこう]] gakkō), えい is usually a long e ([[せんせい]] sensē). Katakana marks length with ー: [[コーヒー]].</li>" +
        "<li><b>Small っ</b> is a short silent beat that doubles the next consonant: [[きて]] (come) vs [[きって]] (stamp).</li>" +
        "<li><b>ん</b> changes with the sound after it: it sounds like m before b, p and m ([[さんぽ]], [[しんぶん]]).</li>" +
        "<li><b>Whispered vowels:</b> u and i between voiceless sounds almost disappear, so [[です]] sounds like “des” and [[します]] like “shimas”.</li>" +
        "<li><b>Pitch, not stress:</b> Japanese words rise and fall in pitch ([[はし]] can be chopsticks or bridge). Don't worry about rules yet; copy the audio.</li>" +
        "</ul></section>" +

        '<section id="g-order"><h2>What to learn first, and why</h2><ol class="order">' +
        "<li><b>Survival phrases</b> (unit 1). Greetings, thanks, sorry, please: usable immediately, and they make every later conversation start smoothly.</li>" +
        "<li><b>The sentence frame</b> (2–3). [[AはBです]], questions with か, and the particles は, の, も. The most frequent items in the language, and the skeleton everything else hangs on.</li>" +
        "<li><b>Pointing and asking</b> (3–4). これ/それ/あれ, ここ/そこ/あそこ and the question words 何, 誰, どこ, いくら: you need them in every conversation.</li>" +
        "<li><b>Numbers, prices, time and days</b> (4–5). The first things you need in a shop or at a station.</li>" +
        "<li><b>Verbs in the ます form</b> (6–8). Eat, drink, go, come, see, do, buy, understand, be, with を, に, で, へ and the past tense. Enough to talk about your day.</li>" +
        "<li><b>People and description</b> (9–11). Family, adjectives, likes, wants.</li>" +
        "<li><b>The て-form</b> (12–15). Requests, “is doing” and permission, the gateway to most later grammar, plus invitations with 〜ませんか and 〜ましょう.</li>" +
        "<li><b>Plain forms</b> (16–20). Casual speech, and the base for opinions (と思います), reasons (から), experiences (〜たことがある) and advice (〜たほうがいい).</li>" +
        (lastUnit >= 21 ? "<li><b>Connecting ideas</b> (21–25). Giving and receiving favours (あげる, もらう, くれる), what you can do (the potential form), if and when (〜たら), before, after and while (〜ながら), and plans (つもり, 〜かもしれません).</li>" : "") +
        (lastUnit >= 26 ? "<li><b>Going further</b> (26–30). Trying and finishing (〜てみる, 〜てしまう), how things look and what you hear (〜そう), conditions, reasons and advice (〜ば, なら, ので, どうすればいいですか), rules (〜なければなりません, 〜なくてもいい), and the polite service Japanese you hear in shops.</li>" : "") +
        "</ol><p>This is the core progression shared by the major textbooks (Genki, Minna no Nihongo, Marugoto). Units 1–20 cover roughly the grammar of the JLPT N5 exam" + (lastUnit >= 26 ? ", and units 21–30 much of N4" : "") + ".</p></section>" +

        "<section><h2>Choices this course makes</h2>" +
        '<dl class="choices">' +
        "<dt>Polite form first</dt><dd>です/ます forms are regular, safe with anyone, and what you need with strangers. Casual forms arrive in unit 16, once the system makes sense.</dd>" +
        "<dt>Kanji with furigana from day one</dt><dd>Real Japanese is written with kanji, so words appear the way you'll meet them, with the reading on top. You don't have to study kanji yet; you'll absorb the common ones as you go. If it feels like too much, switch to kana only in Options.</dd>" +
        "<dt>Kana, not romaji</dt><dd>You already read hiragana. Romaji would make you read Japanese with English spelling habits and hide details like long vowels, so the course is written in kana and you only type romaji (it turns into kana as you type). If you'd like to see how something is written in romaji, such as a line name (はじめ線 is Hajime-sen), switch on <b>Romaji</b> in the reading aids or in Options: under every word, or only in the pop-up when you tap a word. Use it as a stepping stone, not a crutch.</dd>" +
        "<dt>Katakana soon</dt><dd>Katakana writes loanwords such as [[コーヒー]], [[テレビ]] and [[ホテル]]. It has the same 46 sounds you know from hiragana, so it takes days, not months. Until then, “Katakana help” shows hiragana above every katakana word; the Kana trainer gets you reading it.</dd>" +
        "<dt>One story</dt><dd>The conversations follow the same people, Ken, Yuki, Emma and Tanaka-sensei, through everyday situations, so each unit gives context to the next.</dd>" +
        "<dt>Rewards that follow the learning</dt><dd>XP, stamps and badges are there to make the daily habit fun. They count practice, not time spent or taps, so the quickest way up is the one that also teaches you the most.</dd>" +
        "</dl></section>" +

        '<section id="g-routine"><h2>A daily routine</h2><ol class="routine">' +
        "<li><b>Reviews first</b> (5–10 minutes). Clear the cards that are due. Be honest with “Again”: it brings the card back sooner, which is exactly what you want.</li>" +
        "<li><b>One new part</b> (10–15 minutes). A set of words, the sentences, or the conversation of the next unit. One unit every three to five days is a good pace.</li>" +
        "<li><b>Listen and say.</b> Play the conversation, then shadow it, or read a story aloud.</li>" +
        "<li><b>Something fun.</b> A game, the daily missions, or a few sentences of your own in the Sentence Maker.</li>" +
        "<li><b>Keep the chain going.</b> If you miss a few days, just do your reviews; the schedule adapts.</li>" +
        "</ol><p>By the end of unit 20 you'll know about " + wordsTo(20) + " words and the core grammar of beginner Japanese: enough to introduce yourself, shop, eat out, get around, make plans and talk about your day." +
        (lastUnit > 20 ? " All " + units.length + " units together teach about " + wordsTo(lastUnit) + " words." : "") + "</p></section>" +

        "<section><h2>Be realistic, and patient</h2><p>The US Foreign Service Institute puts Japanese in its hardest group for English speakers and estimates about 88 weeks, around 2,200 class hours, to reach professional working proficiency. That's a long road. But the first months bring the fastest gains, and every common word you learn makes real Japanese more readable.</p></section>" +

        "<section><h2>After this course</h2><ul class=\"next\">" +
        "<li><b>Grammar:</b> the Genki or Minna no Nihongo textbooks, or the free " + ext("https://guidetojapanese.org/learn/", "Tae Kim’s Guide to Learning Japanese") + ".</li>" +
        "<li><b>Vocabulary and kanji:</b> keep reviewing daily with " + ext("https://apps.ankiweb.net/", "Anki") + " (a core 2,000-word deck is a good next step) or " + ext("https://www.wanikani.com/", "WaniKani") + " for kanji.</li>" +
        "<li><b>Reading:</b> free graded readers from " + ext("https://tadoku.org/japanese/en/", "Tadoku") + ", then " + ext("https://www3.nhk.or.jp/news/easy/", "NHK News Web Easy") + " (simple news with furigana).</li>" +
        "<li><b>Listening:</b> podcasts and videos made for learners, such as <i>Nihongo con Teppei</i> and <i>Comprehensible Japanese</i>.</li>" +
        "<li><b>Speaking:</b> a language exchange partner or an online tutor; you know enough to start.</li>" +
        "<li><b>Dictionary:</b> " + ext("https://jisho.org/", "Jisho.org") + ".</li>" +
        "<li><b>A goal:</b> the " + ext("https://www.jlpt.jp/e/", "JLPT") + " N5 and N4 exams make a clear target.</li>" +
        "</ul></section>" +

        '<section class="sources" id="g-sources"><h2>Sources</h2><ul>' +
        "<li>Abraham, L. B. (2008). Computer-mediated glosses in second language reading comprehension and vocabulary learning: A meta-analysis. <i>Computer Assisted Language Learning</i>, 21(3), 199–226. " + ext("https://doi.org/10.1080/09588220802090246", "doi") + "</li>" +
        "<li>Brunmair, M., &amp; Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. <i>Psychological Bulletin</i>, 145(11), 1029–1052. " + ext("https://doi.org/10.1037/bul0000209", "doi") + "</li>" +
        "<li>Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., &amp; Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. <i>Psychological Bulletin</i>, 132(3), 354–380.</li>" +
        "<li>Dörnyei, Z. (2005). <i>The Psychology of the Language Learner: Individual Differences in Second Language Acquisition</i>. Lawrence Erlbaum.</li>" +
        "<li>Erman, B., &amp; Warren, B. (2000). The idiom principle and the open choice principle. <i>Text</i>, 20(1), 29–62.</li>" +
        "<li>Forrin, N. D., &amp; MacLeod, C. M. (2018). This time it’s personal: The memory benefit of hearing oneself. <i>Memory</i>, 26(4), 574–579.</li>" +
        "<li>Gollwitzer, P. M., &amp; Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. <i>Advances in Experimental Social Psychology</i>, 38, 69–119.</li>" +
        "<li>Chang, A. C.-S., &amp; Millett, S. (2015). Improving reading rates and comprehension through audio-assisted extensive reading for beginner learners. <i>System</i>, 52, 91–102.</li>" +
        "<li>Hamada, Y. (2016). Shadowing: Who benefits and how? Uncovering a booming EFL teaching technique for listening comprehension. <i>Language Teaching Research</i>, 20(1), 35–52. See also Hamada (2019), " + ext("https://journals.sagepub.com/doi/10.1177/0033688218771380", "Shadowing: What is it? How to use it. Where will it go?") + " <i>RELC Journal</i>.</li>" +
        "<li>Hu, M., &amp; Nation, I. S. P. (2000). Unknown vocabulary density and reading comprehension. <i>Reading in a Foreign Language</i>, 13(1), 403–430.</li>" +
        "<li>Jeon, E.-Y., &amp; Day, R. R. (2016). The effectiveness of ER on reading proficiency: A meta-analysis. <i>Reading in a Foreign Language</i>, 28(2), 246–265. " + ext("https://scholarspace.manoa.hawaii.edu/items/b52a5591-ec04-4026-816f-434361a4e899", "open access") + "</li>" +
        "<li>Komori, K., Mikuni, J., &amp; Kondo, A. (2004). 文章理解を促進する語彙知識の量的側面: 既知語率の閾値探索の試み [Quantitative aspects of vocabulary knowledge that support text comprehension: Looking for a threshold of known-word coverage]. <i>日本語教育</i>, 120.</li>" +
        "<li>Kornell, N., &amp; Bjork, R. A. (2008). Learning concepts and categories: Is spacing the “enemy of induction”? <i>Psychological Science</i>, 19(6), 585–592.</li>" +
        "<li>Krashen, S. (1982). <i>Principles and Practice in Second Language Acquisition</i>. Pergamon.</li>" +
        "<li>Longcamp, M., Boucard, C., Gilhodes, J.-C., Anton, J.-L., Roth, M., Nazarian, B., &amp; Velay, J.-L. (2008). Learning through hand- or typewriting influences visual recognition of new graphic shapes: Behavioral and functional imaging evidence. <i>Journal of Cognitive Neuroscience</i>, 20(5), 802–815.</li>" +
        "<li>Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., &amp; Wardle, J. (2010). How are habits formed: Modelling habit formation in the real world. <i>European Journal of Social Psychology</i>, 40(6), 998–1009. " + ext("https://doi.org/10.1002/ejsp.674", "doi") + "</li>" +
        "<li>Laufer, B. (1989). What percentage of text-lexis is essential for comprehension? In C. Laurén &amp; M. Nordman (Eds.), <i>Special Language: From Humans Thinking to Thinking Machines</i>. Multilingual Matters.</li>" +
        "<li>Lee, S.-K., &amp; Huang, H.-T. (2008). Visual input enhancement and grammar learning: A meta-analytic review. <i>Studies in Second Language Acquisition</i>, 30(3), 307–331.</li>" +
        "<li>Lewis, M. (1993). <i>The Lexical Approach</i>. Language Teaching Publications.</li>" +
        "<li>MacLeod, C. M., Gopie, N., Hourihan, K. L., Neary, K. R., &amp; Ozubko, J. D. (2010). The production effect: Delineation of a phenomenon. <i>Journal of Experimental Psychology: Learning, Memory, and Cognition</i>, 36(3), 671–685.</li>" +
        "<li>Matsunaga, S. (2003). Effects of mnemonics on immediate and delayed recalls of hiragana by learners of Japanese as a foreign language. <i>世界の日本語教育</i>, 13, 19–40. " + ext("https://jpf.repo.nii.ac.jp/records/337", "open access") + "</li>" +
        "<li>Ngo, T. T.-N., Chen, H. H.-J., &amp; Lai, K. K.-W. (2024). The effectiveness of automatic speech recognition in ESL/EFL pronunciation: A meta-analysis. <i>ReCALL</i>. " + ext("https://www.cambridge.org/core/journals/recall/article/effectiveness-of-automatic-speech-recognition-in-eslefl-pronunciation-a-metaanalysis/A915444CF252B61D14961D2FE733822D", "open access") + "</li>" +
        "<li>Nation, I. S. P. (2013). <i>Learning Vocabulary in Another Language</i> (2nd ed.). Cambridge University Press.</li>" +
        "<li>National Institute for Japanese Language and Linguistics (NINJAL). <i>Balanced Corpus of Contemporary Written Japanese</i> (BCCWJ) word frequency list.</li>" +
        "<li>Pashler, H., McDaniel, M., Rohrer, D., &amp; Bjork, R. (2008). Learning styles: Concepts and evidence. <i>Psychological Science in the Public Interest</i>, 9(3), 105–119. " + ext("https://digitalcommons.usf.edu/psy_facpub/1765/", "open access") + "</li>" +
        "<li>Roediger, H. L., &amp; Karpicke, J. D. (2006a). Test-enhanced learning: Taking memory tests improves long-term retention. <i>Psychological Science</i>, 17(3), 249–255.</li>" +
        "<li>Roediger, H. L., &amp; Karpicke, J. D. (2006b). The power of testing memory: Basic research and implications for educational practice. <i>Perspectives on Psychological Science</i>, 1(3), 181–210.</li>" +
        "<li>Ryan, R. M., &amp; Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. <i>American Psychologist</i>, 55(1), 68–78. " + ext("https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf", "PDF") + "</li>" +
        "<li>Sadoski, M. (2005). A dual coding view of vocabulary learning. <i>Reading &amp; Writing Quarterly</i>, 21(3), 221–238.</li>" +
        "<li>Sailer, M., &amp; Homner, L. (2020). The gamification of learning: A meta-analysis. <i>Educational Psychology Review</i>, 32, 77–112. " + ext("https://link.springer.com/article/10.1007/s10648-019-09498-w", "open access") + "</li>" +
        "<li>Schmidt, R. (1990). The role of consciousness in second language learning. <i>Applied Linguistics</i>, 11(2), 129–158.</li>" +
        "<li>Swain, M. (1985). Communicative competence: Some roles of comprehensible input and comprehensible output in its development. In S. Gass &amp; C. Madden (Eds.), <i>Input in Second Language Acquisition</i> (pp. 235–253). Newbury House.</li>" +
        "<li>Sung, Y.-T., Chang, K.-E., &amp; Yang, J.-M. (2015). How effective are mobile devices for language learning? A meta-analysis. <i>Educational Research Review</i>, 16, 68–84.</li>" +
        "<li>Teimouri, Y., Goetze, J., &amp; Plonsky, L. (2019). Second language anxiety and achievement: A meta-analysis. <i>Studies in Second Language Acquisition</i>, 41(2), 363–387. " + ext("https://doi.org/10.1017/S0272263118000311", "doi") + "</li>" +
        "<li>Foreign Service Institute, U.S. Department of State. Foreign language training: language difficulty categories.</li>" +
        "</ul></section>" +
        '<p class="row center"><a class="btn primary" href="#home">Back to the route map</a></p>' +
        "</article>"
      ).replace(/\[\[(.+?)\]\]/g, (m) => R(m));
    },
    mount(el, args) {
      const jump = (id) => {
        const t = el.querySelector("#g-" + id);
        if (!t) return;
        const calm = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
        t.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      };
      el.querySelectorAll("[data-jump]").forEach((b) => b.addEventListener("click", () => jump(b.getAttribute("data-jump"))));
      el.querySelectorAll("[data-goal]").forEach((b) =>
        b.addEventListener("click", () => {
          const g = NI.plan.GOALS.find((x) => x.id === b.getAttribute("data-goal"));
          if (!g) return;
          NI.store.set("goal", g.id, true);
          NI.store.set("focus", g.focus, true);
          NI.store.setPlanned();
          ui.toast("Your goal: " + g.t + ". " + NI.plan.focusLine(g.focus));
          NI.app.render();
          setTimeout(() => jump("routes"), 30);
        })
      );
      if (args && args[0]) setTimeout(() => jump(args[0]), 30);
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
