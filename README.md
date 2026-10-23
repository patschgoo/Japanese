# Nihongo Ippo · 日本語いっぽ

A free, static website for learning Japanese **once you can read hiragana**.
Twenty short units take you from greetings to real conversations, with
spaced-repetition reviews, audio for every word and sentence, and an optional
katakana trainer. No accounts, no tracking, no build step: open `index.html`
or host the folder anywhere.

The course is drawn as a railway map: four lines, twenty stations. Each unit
opens with a station name board, and review cards “speed up” from the local
train (各停) to the shinkansen (新幹線) as you remember them.

## What's in it

| | |
|---|---|
| **20 units** in 4 stages | 448 words, 364 example sentences, 20 dialogues, grammar notes and culture notes |
| **Lessons** | 13 exercise types: new-word cards, meaning/word choice, listening, typing (romaji turns into kana), matching, particle gaps, sentence building, conjugation drills, prices and times, “what do you say?” situations, conversation questions |
| **Reviews** | Spaced repetition with expanding intervals (4 h → 1 d → 3 d → 1 w → 2 w → 1 mo → 3 mo → 6 mo) |
| **Kana trainer** | Hiragana check, katakana drills (answer with the hiragana you know), 75 loanwords, look-alike katakana (シ/ツ, ソ/ン…) |
| **Phrasebook** | ~90 survival phrases by situation; star any to add it to your reviews |
| **Reference** | Particles, verb and adjective tables, numbers and counters, searchable word list |
| **Reading help** | Furigana on every kanji (or on tap, or kana only), hiragana above katakana until you can read it, small gaps between phrases, tap any word for its meaning and grammatical form |

## The method, in short

The full reasoning (with sources) is on the site's **Guide** page
(`#guide`). The main points:

1. **Most useful first.** Word use follows a steep frequency curve. In corpus
   counts of Japanese (e.g. NINJAL's BCCWJ) the top items are particles and
   helper words (の, に, は, を, が, です), then core verbs (する, ある, いる,
   なる, 言う, 思う). So the course starts with survival phrases and the
   AはBです frame, then the commonest verbs, adjectives and nouns.
2. **Retrieval, not re-reading.** Lessons are mostly questions; reviews ask
   before they show (testing effect, Roediger & Karpicke 2006).
3. **Spaced repetition.** Reviews come back at growing intervals and sooner
   when forgotten (spacing effect, Cepeda et al. 2006).
4. **Comprehensible input (i+1).** Learners need to know roughly 95–98 % of
   the words in a text to follow it (Laufer 1989; Hu & Nation 2000). Every
   sentence and dialogue here uses only words already taught plus the
   current unit's new ones — enforced by `tools/validate.js`.
5. **Chunks before rules.** いただきます, よろしくお願いします and 大丈夫です
   are learned whole on day one and taken apart later.
6. **Sound from the start.** Every word, sentence and dialogue is spoken by
   the device's Japanese voice (Web Speech API).
7. **Polite form first, plain forms later** (unit 16); **kanji with furigana
   from day one**; **no romaji** (you type romaji, it becomes kana);
   **katakana soon**, with hiragana help until then.

Grammar order: greetings → AはBです, か, の, も → こそあど and question words →
numbers, prices, time → ます-verbs with を/に/で/へ/と and the past →
あります/います, family, adjectives, likes/wants → て-form (requests,
〜ています, permission) and invitations (〜ませんか, 〜ましょう) → plain
forms, と思います, から, 〜たことがある, 〜くなる, 〜たほうがいい. Roughly JLPT N5 and the start of N4.

## Run it

Any static file server works, or just open `index.html` in a browser.

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Progress is saved in the browser (`localStorage`). Options → *Your progress*
copies or downloads a backup that you can restore on another device.

Audio uses the browser's built-in speech synthesis. If no Japanese voice is
installed, the Options page explains how to add one (Windows, macOS, Android,
iOS).

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
                      spaced repetition, storage, speech
js/data/              course content (units-h/m/d/k.js = the four lines),
                      phrasebook, kana tables, grammar-word glosses
js/ui/                pages, exercise types, lesson/review sessions
js/app.js             router and start-up
tools/validate.js     content checks and engine tests (`npm test`)
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
answers. Words are listed
once, in dictionary form with a part-of-speech code; all conjugated forms are
generated:

```js
{ j: "{飲|の}む", pos: "v5", en: "drink" }   // → 飲みます, 飲んで, 飲まない, 飲んだ …
```

Run `npm test` (or `node tools/validate.js`) after editing content. It checks
that every sentence splits into known words, that furigana matches each
word's reading, that nothing is used before the unit that teaches it, that
number readings include the right sound changes (さんびゃく, いっぷん, よにん…),
and that every lesson can be generated.

## Licence

Content and code are provided as-is for learning. Fonts are loaded from
Google Fonts (Fira Sans, BIZ UDPGothic, Klee One) under their own licences.
