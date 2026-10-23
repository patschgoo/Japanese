# Nihongo Ippo · 日本語いっぽ

A free, static website for learning Japanese **once you can read hiragana**.
Thirty short units take you from greetings to real conversations, with
spaced-repetition reviews, audio for every word and sentence, games, graded
stories and an optional katakana trainer. No accounts, no tracking, no build
step: open `index.html` or host the folder anywhere.

The course is drawn as a railway map: six lines, thirty stations. Each unit
opens with a station name board, you collect a station stamp for every unit
you finish, and review cards “speed up” from the local train (各停) to the
shinkansen (新幹線) as you remember them.

## What's in it

| | |
|---|---|
| **30 units** on 6 lines | 646 words, 564 example sentences, 30 dialogues, 152 grammar points, culture notes. Units 1–20 cover roughly JLPT N5, units 21–30 much of N4 |
| **Lessons** | 14 exercise types: new-word cards, meaning/word choice, listening, typing (romaji turns into kana), matching, particle gaps, sentence building, translation, conjugation drills, numbers and counters, “what do you say?” situations, conversation questions, and “say it aloud” cards |
| **Reviews** | Spaced repetition with expanding intervals (4 h → 1 d → 3 d → 1 w → 2 w → 1 mo → 3 mo → 6 mo) |
| **Games** | Time Attack (meanings, listening or pictures), Kana Rain, Memory Match and Sentence Sprint, built from the words and sentences you've met; a relaxed mode takes out clocks and hearts |
| **More ways to practise** | Role-play any course conversation (pick or say your lines), Listen on the go (hands-free audio with pauses to recall, Japanese or English first), write kana by hand on a tracing pad, and a pronunciation check with the browser's speech recognition that marks the sounds it missed |
| **Motivation** | XP and levels, a daily goal and streak with rest days that cover a missed day, combos, 29 badges, three daily missions, an omikuji fortune once the goal is reached, a stamp for every station, a gold exam for every line, a mistakes notebook |
| **Reading help** | Furigana on every kanji (or on tap, or kana only), hiragana above katakana until you can read it, English meanings under every word, colour-coded particles, tap any word for its meaning and form |
| **Sentence breakdown** | Any sentence, word by word: each particle's job, each verb form, slow audio, and record-and-compare for your own pronunciation |
| **Stories** | 6 graded stories with audio and shadowing, written only with words you know |
| **Tools** | Reader (paste any Japanese: coverage check, meanings, Jisho/Google Translate/DeepL links, English → Japanese look-up), Sentence Maker (build correct sentences in any tense, polite or casual), phrasebook (~90 survival phrases) |
| **Kana trainer** | Hiragana check, katakana drills (answer with the hiragana you know), 75 loanwords, look-alike katakana (シ/ツ, ソ/ン…) |
| **Your plan** | Pick a goal (travel, anime, work, the JLPT, people, curiosity), a daily target and a focus (listening, speaking, reading, exam); lessons adapt their mix of exercises |

## The method, in short

The full reasoning, with sources, is on the site's **Guide** page
(`#guide`), including routes for different goals, schedules and kinds of
learner. The main points:

1. **Most useful first.** Word use follows a steep frequency curve. In corpus
   counts of Japanese (e.g. NINJAL's BCCWJ) the top items are particles and
   helper words (の, に, は, を, が, です), then core verbs (する, ある, いる,
   なる, 言う, 思う). So the course starts with survival phrases and the
   AはBです frame, then the commonest verbs, adjectives and nouns.
2. **Retrieval, not re-reading.** Lessons are mostly questions; reviews ask
   before they show (testing effect, Roediger & Karpicke 2006).
3. **Spaced and mixed practice.** Reviews come back at growing intervals and
   sooner when forgotten (Cepeda et al. 2006); lessons, reviews and games mix
   kinds of question and material (interleaving: Kornell & Bjork 2008;
   Brunmair & Richter 2019).
4. **Comprehensible input (i+1).** Learners need to know roughly 95–98 % of
   the words in a text to follow it (Laufer 1989; Hu & Nation 2000). Every
   sentence, dialogue and story uses only words already taught plus the
   current unit's new ones, enforced by `tools/validate.js`. Lots of easy
   reading builds fluency (Jeon & Day 2016).
5. **Say it, hear it, write it.** Words said aloud are remembered better
   (production effect, MacLeod et al. 2010); shadowing helps beginners'
   listening (Hamada 2016); reading while listening builds reading speed
   (Chang & Millett 2015); speech-recognition feedback improves pronunciation
   (Ngo et al. 2024); writing new characters by hand helps recognition
   (Longcamp et al. 2008). Every word, sentence and dialogue has audio.
6. **Chunks before rules.** いただきます, よろしくお願いします and 大丈夫です
   are learned whole on day one and taken apart later.
7. **Habits, not willpower.** A small daily goal, a streak that survives a
   missed day (Lally et al. 2010), and if-then plans (Gollwitzer & Sheeran
   2006). It all works on a phone, where short sessions fit into the day
   (mobile learning meta-analysis: Sung et al. 2015). Points reward practice only, and mistakes are safe: language
   anxiety goes with lower achievement (Teimouri et al. 2019).
8. **No "learning styles".** Matching lessons to a supposed visual or
   auditory style isn't supported by evidence (Pashler et al. 2008), so the
   course adapts to goals and preferences instead, and everyone sees, hears
   and says every word.
9. **Polite form first, plain forms later** (unit 16); **kanji with furigana
   from day one**; **no romaji** (you type romaji, it becomes kana);
   **katakana soon**, with hiragana help until then.

Grammar order: greetings → AはBです, か, の, も → こそあど and question words →
numbers, prices, time → ます-verbs with を/に/で/へ/と and the past →
あります/います, family, adjectives, likes/wants → て-form (requests,
〜ています, permission) and invitations (〜ませんか, 〜ましょう) → plain
forms, と思います, から, 〜たことがある, 〜くなる, 〜たほうがいい → giving and
receiving, the potential form, 〜たら, 〜ながら, plans and かもしれません →
〜てみる, 〜てしまう, 〜そう, 〜ば and なら, 〜なければならない, and the polite
service Japanese you hear in shops.

## Run it

Any static file server works, or just open `index.html` in a browser.

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Progress is saved in the browser (`localStorage`). Options → *Your progress*
copies or downloads a backup that you can restore on another device.

Audio uses the browser's built-in speech synthesis. If no Japanese voice is
installed, the Options page explains how to add one (Windows, macOS, Android,
iOS). Recordings made in the sentence breakdown stay on the device.

### Publish with GitHub Pages

Settings → Pages → *Deploy from a branch* → `main`, folder `/ (root)`. The
site is plain HTML/CSS/JS, so nothing needs building. Once it's served over
HTTPS, a small service worker (`sw.js`) lets it open offline too.

## Project layout

```
index.html            app shell; loads every script in order
css/app.css           all styles (light and dark themes)
js/core/              engines with no DOM: kana & romaji input, furigana,
                      conjugation, number readings, word segmenter,
                      spaced repetition, storage, speech, XP and badges,
                      the sentence maker
js/data/              course content (units-h/m/d/k/t/s.js = the six lines),
                      stories, phrasebook, kana tables, grammar-word glosses,
                      emoji for concrete words, sentence-maker fillers,
                      omikuji fortunes
js/ui/                pages, exercise types, lesson/review sessions, games,
                      reader and maker, stories, stamps, the sentence breakdown,
                      role-play, hands-free listening, kana writing and the
                      pronunciation check
js/app.js             router and start-up
tools/validate.js     content checks and engine tests (`npm test`)
tools/vocab.js        what a learner knows by a given unit (for writers)
```

### Content format

Japanese text uses a small markup: `{漢字|かんじ}` adds furigana, and a space
marks a phrase break (shown as a small gap, and used as the pieces of the
sentence-building exercise).

```js
{ jp: "{毎朝|まいあさ} コーヒーを {飲|の}みます。", en: "I drink coffee every morning.", p: "を" }
```

`p` names a particle to blank out in the particle exercise; `alt` can list
other particles that would also fit there, so they are never offered as wrong
answers. Words are listed once, in dictionary form with a part-of-speech
code; all conjugated forms are generated:

```js
{ j: "{飲|の}む", pos: "v5", en: "drink" }   // → 飲みます, 飲んで, 飲まない, 飲んだ, 飲める, 飲んだら, 飲めば …
```

Numbers with counters are digits with ruby (`{3|さん}{本|ぼん}`); the
validator checks the sound changes. A unit's `drill` picks conjugation
targets and counters (`{ conj: ["pot"], words: ["食べる", "来る"], num: "ctr:hon,mai" }`).
Stories are registered with `NI.addStory({ id, line, unit, title, en, lines, q })`.

Run `npm test` (or `node tools/validate.js`) after editing content. It checks
that every sentence splits into known words, that furigana matches each
word's reading, that nothing is used before the unit that teaches it, that
number readings include the right sound changes (さんびゃく, いっぷん, よにん,
さんぼん, しちがつ…), that stories and the sentence maker stay within what
the learner knows, and that every lesson can be generated.

## Licence

Content and code are provided as-is for learning. Fonts are loaded from
Google Fonts (Fira Sans, BIZ UDPGothic, Klee One) under their own licences.
