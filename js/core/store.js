/* Learner state: settings, finished lesson parts, spaced-repetition items,
   daily activity, the game layer (XP, badges, bests, line exams, the
   mistakes notebook) and the word book. Saved in localStorage; if the browser
   blocks storage the site still works for the current visit.

   Each learning profile has a state of its own under its own key. The first
   profile keeps the original key, so saves from before profiles carry on. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  const KEY = "nihongo-ippo-v1";
  const PKEY = "nihongo-ippo-profiles"; // { cur, list: [{ id, name, icon, t }] }
  const keyOf = (id) => (id === "main" ? KEY : KEY + "@" + id);
  const ICONS = ["🙂", "😺", "🐶", "🦊", "🐼", "🐸", "🐙", "🦉", "🌸", "🍙", "🍣", "🗻", "🚄", "🎮", "📚", "⭐"];

  const DEFAULT_SETTINGS = {
    furigana: "furigana", // furigana | hover | kana
    kataHelp: true,
    gaps: true,
    autoplay: true,
    rate: 0.9,
    voice: "",
    theme: "system", // system | light | dark
    sound: true, // sound effects for right/wrong answers and rewards
    relaxed: false, // no clocks or lives in games, softer sound for mistakes
    buzz: true, // vibrate on answers where the phone supports it
    tapSpeak: true, // say a word aloud when it's tapped
    selBar: true, // Listen / Meaning / Translate bar for selected Japanese text
    dailyGoal: 60, // XP per day
    goal: "", // travel | media | work | exam | people | curious
    focus: "balanced", // balanced | listening | speaking | reading | exam
    textSize: "m", // s | m | l | xl
    gloss: false, // English meaning under each Japanese word
    romaji: false, // romaji under each Japanese word (and in pop-ups)
    romajiPop: false, // romaji in word pop-ups only
    particles: true, // colour-code particles
    reviewLimit: 50, // cards in one review session
    autoNext: false, // move on by itself after a right answer
    retryMissed: true, // a missed question comes back at the end of a lesson
    handFont: true, // the handwriting-style font for big words in questions
  };

  /* The word book: every saved word (saved: id → when), named lists of ids,
     words the learner added themselves (custom: u:n → { j, r, en, pos }), and
     the last vocabulary test results. */
  const blankBooks = () => ({ saved: {}, lists: [], custom: {}, tests: [], seq: 0 });

  function blank() {
    return {
      v: 1, settings: Object.assign({}, DEFAULT_SETTINGS), onboarded: false, planned: false,
      parts: {}, srs: {}, days: {}, kana: {}, intro: {}, created: Date.now(),
      xp: 0, badges: {}, exams: {}, games: {}, mistakes: {}, stories: {},
      rest: { n: 0, days: {}, earned: {} }, books: blankBooks(),
    };
  }

  let state = blank();
  // Saves that couldn't reach localStorage (blocked), so switching profiles still works this visit.
  const mem = {};
  let index = { cur: "main", list: [{ id: "main", name: "Me", icon: ICONS[0], t: Date.now() }] };
  let persistent = true;
  let timer = null;
  let dirty = false;
  const listeners = [];

  function read(key) {
    const k = key || keyOf(index.cur);
    let raw = null;
    try {
      raw = root.localStorage && root.localStorage.getItem(k);
    } catch (e) {
      persistent = false;
    }
    if (raw == null && mem[k]) raw = mem[k];
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function put(k, json) {
    try {
      root.localStorage.setItem(k, json);
      delete mem[k];
      return true;
    } catch (e) {
      mem[k] = json;
      return false;
    }
  }

  function write() {
    timer = null;
    if (!dirty) return;
    persistent = put(keyOf(index.cur), JSON.stringify(state));
    dirty = false;
  }

  // The list of profiles; a missing or broken one means a single profile.
  function readIndex() {
    const saved = read(PKEY);
    if (!saved || !Array.isArray(saved.list) || !saved.list.length) return index;
    const list = saved.list.filter((p) => p && typeof p.id === "string").map((p) => ({ id: p.id, name: String(p.name || "Me").slice(0, 30), icon: p.icon || ICONS[0], t: p.t || Date.now() }));
    if (!list.length) return index;
    return { cur: list.some((p) => p.id === saved.cur) ? saved.cur : list[0].id, list };
  }
  function writeIndex() {
    if (!put(PKEY, JSON.stringify(index))) persistent = false;
  }

  function merge(saved) {
    const s = blank();
    if (!saved || typeof saved !== "object") return s;
    s.settings = Object.assign({}, DEFAULT_SETTINGS, saved.settings || {});
    for (const k of ["parts", "srs", "days", "kana", "intro", "badges", "exams", "games", "mistakes", "stories"]) if (saved[k] && typeof saved[k] === "object") s[k] = saved[k];
    if (saved.rest && typeof saved.rest === "object") s.rest = Object.assign({ n: 0, days: {}, earned: {} }, saved.rest);
    const b = saved.books;
    if (b && typeof b === "object") {
      s.books = Object.assign(blankBooks(), b);
      for (const k of ["saved", "custom"]) if (!b[k] || typeof b[k] !== "object" || Array.isArray(b[k])) s.books[k] = {};
      s.books.lists = (Array.isArray(b.lists) ? b.lists : []).filter((l) => l && l.id && Array.isArray(l.words));
      if (!Array.isArray(b.tests)) s.books.tests = [];
    }
    s.xp = Number(saved.xp) || 0;
    s.onboarded = !!saved.onboarded;
    s.planned = !!saved.planned;
    s.created = saved.created || s.created;
    return s;
  }

  function emit(what) {
    for (const fn of listeners) {
      try {
        fn(what);
      } catch (e) {
        if (root.console) console.error(e);
      }
    }
  }

  const store = {
    KEY,
    PKEY,
    ICONS,
    DEFAULT_SETTINGS,
    // The storage key of the profile in use (for other tabs' storage events).
    get key() {
      return keyOf(index.cur);
    },
    load() {
      index = readIndex();
      state = merge(read());
      return state;
    },
    get state() {
      return state;
    },
    get persistent() {
      return persistent;
    },
    save() {
      dirty = true;
      if (timer) return;
      timer = setTimeout(write, 150);
    },
    // Writes pending changes now (only if there are any, so an idle tab
    // never overwrites progress made in another tab).
    flush() {
      if (timer) clearTimeout(timer);
      write();
    },
    on(fn) {
      listeners.push(fn);
    },
    // Another tab saved: adopt its state unless this tab has unsaved changes.
    syncFrom(raw) {
      if (dirty) return false;
      try {
        state = merge(raw ? JSON.parse(raw) : null);
      } catch (e) {
        return false;
      }
      emit("all");
      return true;
    },

    get settings() {
      return state.settings;
    },
    // quiet: change it without telling listeners (no page re-render).
    set(key, value, quiet) {
      state.settings[key] = value;
      this.save();
      if (!quiet) emit("settings");
    },
    setOnboarded() {
      state.onboarded = true;
      this.save();
    },
    setPlanned() {
      state.planned = true;
      state.onboarded = true;
      this.save();
      emit("settings");
    },

    partKey: (unit, part) => unit + ":" + part,
    partDone(unit, part) {
      return !!state.parts[this.partKey(unit, part)];
    },
    markPart(unit, part) {
      const k = this.partKey(unit, part);
      if (!state.parts[k]) state.parts[k] = Date.now();
      this.save();
      emit("progress");
    },

    // Adds items to the review schedule (already-scheduled items are kept).
    addItems(ids) {
      const now = Date.now();
      let added = 0;
      for (const id of ids) {
        if (!state.srs[id]) {
          state.srs[id] = NI.srs.fresh(now);
          added++;
        }
      }
      if (added) this.log("l", added);
      this.save();
      emit("srs");
      return added;
    },
    hasItem(id) {
      return !!state.srs[id];
    },
    item(id) {
      return state.srs[id] || null;
    },
    grade(id, grade) {
      const cur = state.srs[id];
      if (!cur) return null;
      state.srs[id] = NI.srs.next(cur, grade, Date.now());
      this.log("r", 1);
      this.save();
      emit("srs");
      return state.srs[id];
    },
    removeItem(id) {
      delete state.srs[id];
      this.save();
      emit("srs");
    },

    log(field, n) {
      const d = NI.util.dayKey();
      const day = state.days[d] || (state.days[d] = {});
      day[field] = (day[field] || 0) + n;
      this.save();
    },
    // Keeps the highest value of the day (e.g. the longest combo).
    logMax(field, n) {
      const d = NI.util.dayKey();
      const day = state.days[d] || (state.days[d] = {});
      if (!(day[field] >= n)) day[field] = n;
      this.save();
    },
    today() {
      return state.days[NI.util.dayKey()] || {};
    },
    // Sum of a daily counter over every day.
    total(field) {
      let n = 0;
      for (const d in state.days) n += state.days[d][field] || 0;
      return n;
    },

    // ---- game layer ---------------------------------------------------------
    addXp(n) {
      if (!(n > 0)) return 0;
      state.xp += n;
      this.log("xp", n);
      emit("xp");
      return n;
    },
    // Returns true the first time a badge is earned.
    award(id) {
      if (state.badges[id]) return false;
      state.badges[id] = Date.now();
      this.save();
      return true;
    },
    // Stores a personal best; returns true if it is a new one.
    setBest(game, score, lowerIsBetter) {
      const cur = state.games[game];
      const better = cur == null || (lowerIsBetter ? score < cur : score > cur);
      if (better) state.games[game] = score;
      this.log("g", 1);
      this.save();
      return better;
    },
    setExam(lineId, pct) {
      if (!(state.exams[lineId] >= pct)) state.exams[lineId] = pct;
      this.save();
    },
    // The mistakes notebook: items answered wrong, until answered right twice.
    addMistake(ref) {
      if (!ref) return;
      const m = state.mistakes[ref] || (state.mistakes[ref] = { n: 0, ok: 0 });
      m.n++;
      m.ok = 0;
      m.t = Date.now();
      this.save();
    },
    fixMistake(ref) {
      const m = state.mistakes[ref];
      if (!m) return false;
      m.ok++;
      if (m.ok >= 2) {
        delete state.mistakes[ref];
        this.log("mf", 1);
      }
      this.save();
      return !state.mistakes[ref];
    },
    removeMistake(ref) {
      delete state.mistakes[ref];
      this.save();
    },
    markStory(id) {
      const first = !state.stories[id];
      if (first) state.stories[id] = Date.now();
      this.log("st", 1);
      this.save();
      return first;
    },
    // Consecutive days with any activity, counting today or yesterday as the end.
    // Practised that day, or covered by a rest day.
    active(key) {
      return !!(state.days[key] || state.rest.days[key]);
    },
    streak() {
      let n = 0;
      const t = new Date();
      if (!this.active(NI.util.dayKey(t))) t.setDate(t.getDate() - 1);
      while (this.active(NI.util.dayKey(t))) {
        n++;
        t.setDate(t.getDate() - 1);
      }
      return n;
    },
    /* Rest days keep a streak alive over a missed day or two: when the learner
       comes back, missed days since the streak use up rest days, if there are
       enough to cover them all. Returns how many were used. */
    useRestDays() {
      const r = state.rest;
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const missed = [];
      while (missed.length <= r.n && !this.active(NI.util.dayKey(d))) {
        missed.push(NI.util.dayKey(d));
        d.setDate(d.getDate() - 1);
      }
      if (!missed.length || missed.length > r.n || !this.active(NI.util.dayKey(d))) return 0;
      for (const k of missed) r.days[k] = true;
      r.n -= missed.length;
      this.save();
      return missed.length;
    },
    // Every 7 days in a row earn a rest day (holding at most 2). True when one was earned.
    earnRestDay() {
      const r = state.rest;
      const today = NI.util.dayKey();
      const s = this.streak();
      if (!state.days[today] || s === 0 || s % 7 !== 0 || r.earned[today] || r.n >= 2) return false;
      r.earned[today] = true;
      r.n++;
      this.save();
      return true;
    },

    setIntro(key, value) {
      state.intro[key] = value;
      this.save();
    },

    // Per kana: [right, wrong, right answers in a row]. Older saves lack the run.
    kanaResult(ch, ok) {
      const k = state.kana[ch] || (state.kana[ch] = [0, 0, 0]);
      if (k.length < 3) k[2] = k[1] ? 0 : Math.min(k[0], 3);
      k[ok ? 0 : 1]++;
      k[2] = ok ? k[2] + 1 : 0;
      this.log("kn", 1);
    },

    // ---- learning profiles ---------------------------------------------------
    get profile() {
      return index.list.find((p) => p.id === index.cur) || index.list[0];
    },
    get profiles() {
      return index.list.slice();
    },
    switchProfile(id) {
      if (id === index.cur || !index.list.some((p) => p.id === id)) return false;
      this.flush();
      index.cur = id;
      writeIndex();
      state = merge(read());
      dirty = false;
      emit("all");
      return true;
    },
    /* A new profile starts with no progress. copy: take this profile's
       settings and plan with it (otherwise the plan questions come first). */
    addProfile(name, icon, copy) {
      const id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
      const fresh = blank();
      if (copy) {
        fresh.settings = Object.assign({}, state.settings);
        fresh.planned = fresh.onboarded = true;
      }
      if (!put(keyOf(id), JSON.stringify(fresh))) persistent = false;
      index.list.push({ id, name: String(name || "Learner").slice(0, 30), icon: icon || ICONS[index.list.length % ICONS.length], t: Date.now() });
      writeIndex();
      this.switchProfile(id);
      return id;
    },
    editProfile(id, name, icon) {
      const p = index.list.find((x) => x.id === id);
      if (!p) return;
      if (name != null) p.name = String(name).trim().slice(0, 30) || p.name;
      if (icon) p.icon = icon;
      writeIndex();
      emit("profile");
    },
    // Deletes a profile and its progress for good; the last one can't go.
    removeProfile(id) {
      if (index.list.length < 2 || !index.list.some((p) => p.id === id)) return false;
      if (id === index.cur) this.switchProfile(index.list.find((p) => p.id !== id).id);
      index.list = index.list.filter((p) => p.id !== id);
      writeIndex();
      delete mem[keyOf(id)];
      try {
        root.localStorage.removeItem(keyOf(id));
      } catch (e) {
        /* storage blocked: it was only in memory */
      }
      emit("profile");
      return true;
    },
    // Another tab changed the list of profiles (a new one, a new name).
    syncIndex() {
      const cur = index.cur;
      const next = readIndex();
      index = next;
      if (!next.list.some((p) => p.id === cur)) {
        index.cur = next.list[0].id;
        state = merge(read());
        emit("all");
      } else {
        index.cur = cur;
        emit("profile");
      }
    },
    // A profile's numbers without switching to it, for the profile list.
    peek(id) {
      const st = id === index.cur ? state : read(keyOf(id));
      if (!st) return { xp: 0, words: 0, days: 0 };
      return { xp: Number(st.xp) || 0, words: Object.keys(st.srs || {}).filter((k) => k.startsWith("v:")).length, days: Object.keys(st.days || {}).length };
    },

    // ---- the word book ----------------------------------------------------------
    get books() {
      return state.books;
    },
    isSaved(id) {
      return !!state.books.saved[id];
    },
    // Saves a word (to the All list), and to a list if one is given.
    saveWord(id, listId) {
      const b = state.books;
      if (!b.saved[id]) b.saved[id] = Date.now();
      if (listId) {
        const l = b.lists.find((x) => x.id === listId);
        if (l && l.words.indexOf(id) < 0) l.words.unshift(id);
      }
      this.save();
      emit("books");
    },
    // Takes a word out of the book altogether: All and every list.
    unsaveWord(id) {
      const b = state.books;
      delete b.saved[id];
      for (const l of b.lists) l.words = l.words.filter((w) => w !== id);
      this.save();
      emit("books");
    },
    listsOf(id) {
      return state.books.lists.filter((l) => l.words.indexOf(id) >= 0).map((l) => l.id);
    },
    setInList(id, listId, on) {
      const l = state.books.lists.find((x) => x.id === listId);
      if (!l) return;
      l.words = l.words.filter((w) => w !== id);
      if (on) {
        l.words.unshift(id);
        if (!state.books.saved[id]) state.books.saved[id] = Date.now();
      }
      this.save();
      emit("books");
    },
    newList(name, icon) {
      const b = state.books;
      const id = "l" + ++b.seq;
      b.lists.push({ id, name: String(name || "New list").trim().slice(0, 40) || "New list", icon: icon || "📒", words: [], t: Date.now() });
      this.save();
      emit("books");
      return id;
    },
    editList(id, name, icon) {
      const l = state.books.lists.find((x) => x.id === id);
      if (!l) return;
      if (name != null) l.name = String(name).trim().slice(0, 40) || l.name;
      if (icon) l.icon = icon;
      this.save();
      emit("books");
    },
    // Deletes a list; its words stay saved in All.
    deleteList(id) {
      state.books.lists = state.books.lists.filter((x) => x.id !== id);
      this.save();
      emit("books");
    },
    // A word the learner adds themselves: { j: markup, r: reading, en, pos }.
    addCustom(w) {
      const b = state.books;
      const id = "u:" + ++b.seq;
      b.custom[id] = { j: w.j, r: w.r, en: w.en, pos: w.pos || "n", t: Date.now() };
      b.saved[id] = Date.now();
      this.save();
      emit("books");
      return id;
    },
    editCustom(id, w) {
      const c = state.books.custom[id];
      if (!c) return;
      Object.assign(c, { j: w.j, r: w.r, en: w.en, pos: w.pos || c.pos });
      this.save();
      emit("books");
    },
    removeCustom(id) {
      delete state.books.custom[id];
      this.unsaveWord(id);
      delete state.srs[id];
      delete state.mistakes[id];
      this.save();
    },
    // A vocabulary test's result: src names what was tested (a list, "all", "u1-5" …).
    logTest(src, right, n) {
      const t = state.books.tests;
      t.push({ src, right, n, at: Date.now() });
      if (t.length > 60) t.splice(0, t.length - 60);
      this.save();
    },
    testsOf(src) {
      const list = state.books.tests.filter((t) => t.src === src);
      if (!list.length) return null;
      const pct = (t) => (t.n ? Math.round((t.right / t.n) * 100) : 0);
      return { last: pct(list[list.length - 1]), best: Math.max(...list.map(pct)), n: list.length, at: list[list.length - 1].at };
    },

    exportJson() {
      return JSON.stringify(Object.assign({ app: "nihongo-ippo", exported: new Date().toISOString(), profile: { name: this.profile.name, icon: this.profile.icon } }, state));
    },
    importJson(text) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("That text isn't a backup. Copy the whole backup and try again.");
      }
      if (!data || typeof data !== "object" || !data.srs) throw new Error("This does not look like a Nihongo Ippo backup.");
      state = merge(data);
      dirty = true;
      this.flush();
      emit("all");
    },
    reset() {
      const settings = state.settings;
      state = blank();
      state.settings = settings;
      dirty = true;
      this.flush();
      emit("all");
    },
  };

  NI.store = store;
})(typeof window !== "undefined" ? window : globalThis);
