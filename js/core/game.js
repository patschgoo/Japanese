/* The game layer: XP, levels, badges, daily missions, station stamps and the
   word of the day. No DOM here: sessions and pages call in and show results.
   Rewards follow what helps learning — answering (retrieval), coming back
   every day (spacing, habit), finishing what you start — so XP is never for
   just clicking around. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});

  const XP = {
    correct: 10, // right answer in a lesson
    hinted: 5, // right, but after a hint
    combo: 5, // extra per answer while on a streak of 5+
    lesson: 20, // finishing a lesson part
    perfect: 10, // …without a mistake
    review: 5, // grading a due card
    remembered: 3, // …and remembering it
    gamePoint: 2, // per point in a game
    story: 15, // reading a story (first time each day)
    missions: 30, // all three daily missions
    exam: 100, // passing a line exam
    made: 2, // a sentence in the Sentence Maker
    roleLine: 5, // your line in a role-play
    roleplay: 15, // finishing a role-play
    listen: 1, // an item heard in hands-free listening
    written: 2, // a kana written by hand and got right
  };

  // Level n starts at 100(n−1) + 25(n−1)(n−2) XP: each level takes 50 XP more than the one before.
  const levelStart = (n) => 100 * (n - 1) + 25 * (n - 1) * (n - 2);
  const TITLES = [
    [1, "{見習|みなら}い", "Trainee"],
    [3, "{乗客|じょうきゃく}", "Passenger"],
    [6, "{旅人|たびびと}", "Traveller"],
    [10, "{車掌|しゃしょう}", "Conductor"],
    [15, "{運転士|うんてんし}", "Driver"],
    [20, "{駅長|えきちょう}", "Station master"],
    [30, "{名人|めいじん}", "Master"],
  ];

  function titleFor(n) {
    let t = TITLES[0];
    for (const x of TITLES) if (n >= x[0]) t = x;
    return { ja: t[1], en: t[2] };
  }

  function level(xp) {
    let n = 1;
    while (levelStart(n + 1) <= xp) n++;
    const lo = levelStart(n);
    const hi = levelStart(n + 1);
    return { n, title: titleFor(n), into: xp - lo, need: hi - lo, frac: (xp - lo) / (hi - lo), next: hi };
  }

  // ---------------------------------------------------------------------------
  // Streaks and stamps

  function dayKeysBack(n) {
    const out = [];
    const t = new Date();
    for (let i = 0; i < n; i++) {
      out.unshift(NI.util.dayKey(t));
      t.setDate(t.getDate() - 1);
    }
    return out;
  }

  // Last 7 days, oldest first: which had any activity.
  function week() {
    const days = NI.store.state.days;
    const rest = NI.store.state.rest.days;
    return dayKeysBack(7).map((k) => ({ key: k, on: !!days[k], rest: !days[k] && !!rest[k], today: k === NI.util.dayKey() }));
  }

  function bestStreak() {
    const keys = Object.keys(Object.assign({}, NI.store.state.days, NI.store.state.rest.days)).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const k of keys) {
      const d = new Date(k + "T12:00:00");
      run = prev && Math.round((d - prev) / 864e5) === 1 ? run + 1 : 1;
      prev = d;
      if (run > best) best = run;
    }
    return best;
  }

  // A station stamp is earned by finishing every part of a unit.
  function stamps() {
    const parts = NI.store.state.parts;
    return NI.course.units.map((u) => {
      const ps = NI.course.parts(u);
      const times = ps.map((p) => parts[NI.store.partKey(u.n, p.key)]).filter(Boolean);
      const done = times.length === ps.length && ps.length > 0;
      return { unit: u, done, date: done ? Math.max(...times) : null, em: stampEmoji(u) };
    });
  }

  function stampEmoji(u) {
    if (u.stamp) return u.stamp;
    if (NI.data.stamps && NI.data.stamps[u.n]) return NI.data.stamps[u.n];
    const w = u.words.find((x) => x.em);
    return w ? w.em : "🚉";
  }

  // ---------------------------------------------------------------------------
  // Badges

  function context() {
    const st = NI.store.state;
    const srs = st.srs;
    const stampList = stamps();
    const stamped = new Set(stampList.filter((s) => s.done).map((s) => s.unit.n));
    let words = 0;
    for (const id in srs) if (id.startsWith("v:")) words++;
    let kata = 0;
    for (const ch in st.kana) if (/[ァ-ヺ]/.test(ch) && st.kana[ch][0] > 0) kata++;
    let bestCombo = 0;
    for (const d in st.days) bestCombo = Math.max(bestCombo, st.days[d].cmb || 0);
    return {
      parts: Object.keys(st.parts).length,
      words,
      reviews: NI.store.total("r"),
      bestCombo,
      bestStreak: Math.max(bestStreak(), NI.store.streak()),
      stamps: stamped.size,
      units: NI.course.units.length,
      linesDone: NI.course.lines.filter((l) => l.units.every((n) => stamped.has(n))).length,
      examsPassed: Object.values(st.exams).filter((p) => p >= 80).length,
      kataKnown: kata,
      gamesPlayed: Object.keys(st.games).length,
      best: st.games,
      storiesRead: Object.keys(st.stories).length,
      mistakesFixed: NI.store.total("mf"),
      shadowed: NI.store.total("sh"),
      made: NI.store.total("mk"),
      roleplays: NI.store.total("rp"),
      asrGood: NI.store.total("ag"),
      written: NI.store.total("wr"),
      listened: NI.store.total("ls"),
      level: level(st.xp).n,
    };
  }

  const BADGES = [
    { id: "first", icon: "🚃", t: "First ride", d: "Finish your first lesson part.", test: (c) => c.parts >= 1 },
    { id: "perfect", icon: "💮", t: "Hanamaru", d: "Finish a lesson without a single mistake.", event: true },
    { id: "combo10", icon: "🔥", t: "On a roll", d: "Get 10 answers right in a row.", test: (c) => c.bestCombo >= 10 },
    { id: "streak3", icon: "📅", t: "Three days running", d: "Practise three days in a row.", test: (c) => c.bestStreak >= 3 },
    { id: "streak7", icon: "🗓️", t: "A full week", d: "Practise seven days in a row.", test: (c) => c.bestStreak >= 7 },
    { id: "streak30", icon: "🏆", t: "A month of Japanese", d: "Practise 30 days in a row.", test: (c) => c.bestStreak >= 30 },
    { id: "words50", icon: "🌱", t: "50 words", d: "Have 50 words in your reviews.", test: (c) => c.words >= 50 },
    { id: "words200", icon: "🌿", t: "200 words", d: "Have 200 words in your reviews.", test: (c) => c.words >= 200 },
    { id: "words500", icon: "🌳", t: "500 words", d: "Have 500 words in your reviews.", test: (c) => c.words >= 500 },
    { id: "reviews100", icon: "🔁", t: "100 reviews", d: "Grade 100 review cards.", test: (c) => c.reviews >= 100 },
    { id: "reviews1000", icon: "💯", t: "1,000 reviews", d: "Grade 1,000 review cards.", test: (c) => c.reviews >= 1000 },
    { id: "line", icon: "🚉", t: "End of the line", d: "Collect every stamp on one line.", test: (c) => c.linesDone >= 1 },
    { id: "exam", icon: "🎓", t: "Line exam passed", d: "Pass a line exam with 80% or more.", test: (c) => c.examsPassed >= 1 },
    { id: "network", icon: "🗾", t: "The whole network", d: "Collect every station stamp.", test: (c) => c.stamps >= c.units },
    { id: "katakana", icon: "🔤", t: "Katakana reader", d: "Get 40 different katakana right in the Kana trainer.", test: (c) => c.kataKnown >= 40 },
    { id: "games", icon: "🎮", t: "Game on", d: "Play all four games.", test: (c) => c.gamesPlayed >= 4 },
    { id: "speed", icon: "⚡", t: "Speedster", d: "Score 20 or more in Time Attack.", test: (c) => (c.best.timeattack || 0) >= 20 },
    { id: "stories", icon: "📖", t: "Bookworm", d: "Read three stories.", test: (c) => c.storiesRead >= 3 },
    { id: "fixer", icon: "🩹", t: "Second chances", d: "Clear 20 items from your mistakes notebook.", test: (c) => c.mistakesFixed >= 20 },
    { id: "echo", icon: "🗣️", t: "Echo", d: "Shadow a whole conversation.", test: (c) => c.shadowed >= 1 },
    { id: "maker", icon: "🛠️", t: "Wordsmith", d: "Make 10 sentences in the Sentence Maker.", test: (c) => c.made >= 10 },
    { id: "actor", icon: "🎭", t: "Actor", d: "Play a role in five conversations.", test: (c) => c.roleplays >= 5 },
    { id: "voice", icon: "🎙️", t: "Clear voice", d: "Score 90% or more in five pronunciation checks.", test: (c) => c.asrGood >= 5 },
    { id: "brush", icon: "🖌️", t: "Steady hand", d: "Write 50 kana by hand.", test: (c) => c.written >= 50 },
    { id: "ears", icon: "🎧", t: "All ears", d: "Listen to 100 words and sentences hands-free.", test: (c) => c.listened >= 100 },
    { id: "daikichi", icon: "🎋", t: "Great blessing", d: "Draw 大吉 from the omikuji.", event: true },
    { id: "kanamaster", icon: "🏯", t: "Kana master", d: "Score 100% in a kana test of 20 questions or more.", event: true },
    { id: "level10", icon: "⭐", t: "Level 10", d: "Reach level 10.", test: (c) => c.level >= 10 },
    { id: "early", icon: "🌅", t: "Early bird", d: "Finish a lesson before 7 a.m.", event: true },
    { id: "night", icon: "🌙", t: "Night owl", d: "Finish a lesson after 10 p.m.", event: true },
  ];

  // Awards every badge whose condition now holds; returns the new ones.
  function check() {
    const c = context();
    const fresh = [];
    for (const b of BADGES) if (b.test && !NI.store.state.badges[b.id] && b.test(c) && NI.store.award(b.id)) fresh.push(b);
    return fresh;
  }

  function event(id) {
    const b = BADGES.find((x) => x.id === id);
    return b && NI.store.award(id) ? [b] : [];
  }

  // ---------------------------------------------------------------------------
  // Daily missions: three a day, chosen from what is available to this learner.

  const MISSIONS = [
    { id: "review", t: "Review 10 cards", field: "r", goal: 10, core: true, when: (a) => a.cards >= 10 },
    { id: "lesson", t: "Finish a lesson part", field: "p", goal: 1, core: true, when: (a) => a.lessonsLeft },
    { id: "combo", t: "Get 5 right in a row", field: "cmb", goal: 5 },
    { id: "game", t: "Play a game", field: "g", goal: 1 },
    { id: "perfect", t: "Finish a lesson with no mistakes", field: "pf", goal: 1, when: (a) => a.lessonsLeft },
    { id: "mistakes", t: "Practise 5 of your mistakes", field: "mp", goal: 5, when: (a) => a.mistakes >= 5 },
    { id: "story", t: "Read a story", field: "st", goal: 1, when: (a) => a.stories },
    { id: "shadow", t: "Shadow a conversation", field: "sh", goal: 1, when: (a) => a.voice && a.dialogues },
    { id: "speak", t: "Say 5 sentences out loud", field: "sp", goal: 5, when: (a) => a.parts > 0 },
    { id: "maker", t: "Make 3 sentences in the Sentence Maker", field: "mk", goal: 3 },
    { id: "reader", t: "Read a text in the Reader", field: "rd", goal: 1, when: (a) => a.parts > 2 },
    { id: "kana", t: "Answer 20 kana in the Kana trainer", field: "kn", goal: 20 },
    { id: "roleplay", t: "Play a role in a conversation", field: "rp", goal: 1, when: (a) => a.dialogues },
    { id: "listen", t: "Listen to 10 items hands-free", field: "ls", goal: 10, when: (a) => a.voice && a.parts > 0 },
    { id: "write", t: "Write 10 kana by hand", field: "wr", goal: 10 },
  ];

  function available() {
    const st = NI.store.state;
    const step = NI.nextStep ? NI.nextStep() : null;
    const reached = step ? step.u.n : 999;
    return {
      cards: Object.keys(st.srs).length,
      lessonsLeft: !!step,
      mistakes: Object.keys(st.mistakes).length,
      stories: NI.course.stories.some((s) => s.unit <= reached),
      voice: NI.speech && NI.speech.canListen,
      dialogues: NI.course.units.some((u) => u.dialogue && u.n <= reached),
      parts: Object.keys(st.parts).length,
    };
  }

  function missions(dayKey) {
    const key = dayKey || NI.util.dayKey();
    const a = available();
    const rng = NI.util.rng(NI.util.hash("missions:" + key));
    const ok = MISSIONS.filter((m) => !m.when || m.when(a));
    const core = NI.util.shuffle(ok.filter((m) => m.core), rng).slice(0, 1);
    const rest = NI.util.shuffle(ok.filter((m) => !m.core || core.indexOf(m) < 0).filter((m) => core.indexOf(m) < 0), rng).slice(0, 3 - core.length);
    const day = NI.store.state.days[key] || {};
    return core.concat(rest).map((m) => {
      const v = Math.min(day[m.field] || 0, m.goal);
      return { id: m.id, t: m.t, goal: m.goal, v, done: v >= m.goal };
    });
  }

  // Grants the bonus once all of today's missions are done; returns the XP given.
  function missionBonus() {
    const list = missions();
    if (!list.length || !list.every((m) => m.done) || NI.store.today().mb) return 0;
    NI.store.log("mb", 1);
    return NI.store.addXp(XP.missions);
  }

  // ---------------------------------------------------------------------------
  // Word of the day: a word from the unit you're on (or just finished).

  function wordOfTheDay() {
    const step = NI.nextStep ? NI.nextStep() : null;
    const n = step ? step.u.n : NI.course.units.length;
    const pool = NI.course.words.filter((w) => w.unit <= n && w.unit >= Math.max(1, n - 2) && !/^(exp|int)$/.test(w.pos));
    const list = pool.length ? pool : NI.course.words;
    if (!list.length) return null;
    return list[NI.util.hash("wotd:" + NI.util.dayKey()) % list.length];
  }

  // Daily goal progress.
  function goal() {
    const target = Number(NI.store.settings.dailyGoal) || 60;
    const xp = NI.store.today().xp || 0;
    return { xp, target, frac: Math.min(1, xp / target), done: xp >= target };
  }

  NI.game = { XP, level, levelStart, titleFor, week, bestStreak, stamps, BADGES, check, event, context, MISSIONS, missions, missionBonus, wordOfTheDay, goal };
})(typeof window !== "undefined" ? window : globalThis);
