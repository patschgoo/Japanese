/* Learner state: settings, finished lesson parts, spaced-repetition items,
   daily activity, and the game layer (XP, badges, bests, line exams, the
   mistakes notebook). Saved in localStorage; if the browser blocks storage the
   site still works for the current visit. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  const KEY = "nihongo-ippo-v1";

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
    particles: true, // colour-code particles
  };

  function blank() {
    return {
      v: 1, settings: Object.assign({}, DEFAULT_SETTINGS), onboarded: false, planned: false,
      parts: {}, srs: {}, days: {}, kana: {}, intro: {}, created: Date.now(),
      xp: 0, badges: {}, exams: {}, games: {}, mistakes: {}, stories: {},
      rest: { n: 0, days: {}, earned: {} },
    };
  }

  let state = blank();
  let persistent = true;
  let timer = null;
  let dirty = false;
  const listeners = [];

  function read() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      persistent = false;
      return null;
    }
  }

  function write() {
    timer = null;
    if (!dirty) return;
    try {
      root.localStorage.setItem(KEY, JSON.stringify(state));
      persistent = true;
      dirty = false;
    } catch (e) {
      persistent = false;
    }
  }

  function merge(saved) {
    const s = blank();
    if (!saved || typeof saved !== "object") return s;
    s.settings = Object.assign({}, DEFAULT_SETTINGS, saved.settings || {});
    for (const k of ["parts", "srs", "days", "kana", "intro", "badges", "exams", "games", "mistakes", "stories"]) if (saved[k] && typeof saved[k] === "object") s[k] = saved[k];
    if (saved.rest && typeof saved.rest === "object") s.rest = Object.assign({ n: 0, days: {}, earned: {} }, saved.rest);
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
    DEFAULT_SETTINGS,
    load() {
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

    kanaResult(ch, ok) {
      const k = state.kana[ch] || (state.kana[ch] = [0, 0]);
      k[ok ? 0 : 1]++;
      this.log("kn", 1);
    },

    exportJson() {
      return JSON.stringify(Object.assign({ app: "nihongo-ippo", exported: new Date().toISOString() }, state));
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
