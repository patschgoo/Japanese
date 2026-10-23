/* Learner state: settings, finished lesson parts, spaced-repetition items and
   daily activity. Saved in localStorage; if the browser blocks storage the
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
  };

  function blank() {
    return { v: 1, settings: Object.assign({}, DEFAULT_SETTINGS), onboarded: false, parts: {}, srs: {}, days: {}, kana: {}, intro: {}, created: Date.now() };
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
    for (const k of ["parts", "srs", "days", "kana", "intro"]) if (saved[k] && typeof saved[k] === "object") s[k] = saved[k];
    s.onboarded = !!saved.onboarded;
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
    set(key, value) {
      state.settings[key] = value;
      this.save();
      emit("settings");
    },
    setOnboarded() {
      state.onboarded = true;
      this.save();
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
    // Consecutive days with any activity, counting today or yesterday as the end.
    streak() {
      let n = 0;
      const t = new Date();
      if (!state.days[NI.util.dayKey(t)]) t.setDate(t.getDate() - 1);
      while (state.days[NI.util.dayKey(t)]) {
        n++;
        t.setDate(t.getDate() - 1);
      }
      return n;
    },

    setIntro(key, value) {
      state.intro[key] = value;
      this.save();
    },

    kanaResult(ch, ok) {
      const k = state.kana[ch] || (state.kana[ch] = [0, 0]);
      k[ok ? 0 : 1]++;
      this.save();
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
