/* Sync between devices, through the learner's own GitHub account. 日本 has
   no server, so the profiles live in one secret gist (a private snippet) that
   every connected device reads and writes with a GitHub key limited to gists.
   Opt-in: without a key nothing leaves the device.

   A sync pulls the gist, combines each profile with the copy here and pushes
   the result when it differs. Learning is never lost when two devices were
   used in between: review cards, days, finished parts, kana, badges, exams
   and stories are combined; for the rest (settings, word book, plan) the
   copy changed last wins. It runs when the app opens or comes back, a few
   seconds after progress is saved, and never under a running lesson. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const U = NI.util;
  const ui = NI.ui;
  const esc = ui.esc;
  const doc = root.document;

  const KEY = "nihongo-ippo-sync"; // this device's connection: { token, login, gist, last, err }
  const FILE = "nihon-sync.json";
  const API = "https://api.github.com";
  const TOKEN_PAGE = "https://github.com/settings/tokens/new?scopes=gist&description=" + encodeURIComponent("日本 (Nihon) sync");
  const isSid = (x) => typeof x === "string" && /^[a-z0-9]{8,32}$/.test(x);

  let cfg = load();
  let busy = false;
  let applying = false;
  let timer = null;
  const listeners = [];

  function load() {
    try {
      return JSON.parse(root.localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function save() {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(cfg));
    } catch (e) {
      /* storage blocked: the connection lasts this visit only */
    }
    listeners.forEach((fn) => fn());
  }
  const connected = () => !!(cfg.token && cfg.gist);

  function fail(code, msg) {
    const e = new Error(msg);
    e.code = code;
    return e;
  }

  async function gh(path, opts) {
    const o = opts || {};
    let r;
    try {
      r = await root.fetch(API + path, {
        method: o.method || "GET",
        cache: "no-store",
        headers: Object.assign({ Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json" }, o.body ? { "Content-Type": "application/json" } : {}),
        body: o.body ? JSON.stringify(o.body) : undefined,
      });
    } catch (e) {
      throw fail("offline", "GitHub can't be reached: this device seems to be offline.");
    }
    if (r.status === 401) throw fail("auth", "GitHub doesn't accept the key any more (it may have expired). Make a new key and connect again.");
    if (r.status === 404 && /^\/gists\//.test(path)) throw fail("gone", "The sync gist is gone from GitHub. Connect again to start a new one.");
    if (!r.ok) throw fail("http", "GitHub answered " + r.status + ". Try again in a little while.");
    return r;
  }

  // ---------------------------------------------------------------------------
  // Combining two copies of one profile

  // The same content, whenever it was saved and in whatever order its keys came.
  function canon(x) {
    if (Array.isArray(x)) return "[" + x.map(canon).join(",") + "]";
    if (x && typeof x === "object") return "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + canon(x[k])).join(",") + "}";
    return JSON.stringify(x === undefined ? null : x);
  }
  const same = (a, b) => canon(Object.assign({}, a, { mod: 0 })) === canon(Object.assign({}, b, { mod: 0 }));
  const obj = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
  const plain = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  /* Three-way: against the copy both devices had at the last sync (base),
     a value changed on one side only takes that side's change (a setting, a
     saved word, a deleted list); changed on both, the newer side wins. */
  const NOBASE = {}; // no copy from a last sync (as opposed to "not there at the last sync")
  function merge3(base, a, b, aNewer) {
    const ca = canon(a);
    const cb = canon(b);
    if (ca === cb) return a;
    if (base !== NOBASE) {
      const c0 = canon(base);
      if (c0 === ca) return b;
      if (c0 === cb) return a;
    }
    if (plain(a) && plain(b)) {
      const out = {};
      for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) {
        const v = merge3(plain(base) ? base[k] : base === NOBASE ? NOBASE : undefined, a[k], b[k], aNewer);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    return aNewer ? a : b;
  }

  /* Two copies of one profile, from two devices. Learning is never lost:
     review cards (the one reviewed last), days (the larger counts), finished
     parts, kana, badges, exams and stories are combined; everything else
     merges three-way against the last synced copy. A profile reset on one
     side since then (it starts again with a new created time) wins whole. */
  function mergeStates(a, b, base) {
    const created = (x) => Number(x && x.created) || 0;
    if (base && created(a) > created(base) && created(b) === created(base)) return clone(a);
    if (base && created(b) > created(base) && created(a) === created(base)) return clone(b);
    const aNewer = (Number(a.mod) || 0) > (Number(b.mod) || 0);
    const [older, newer] = aNewer ? [b, a] : [a, b];
    const out = clone(merge3(base || NOBASE, a, b, aNewer));
    out.srs = Object.assign({}, obj(older.srs));
    for (const [id, c] of Object.entries(obj(newer.srs))) {
      const o = out.srs[id];
      if (!o || (Number(c.last) || 0) >= (Number(o.last) || 0)) out.srs[id] = c;
    }
    out.days = Object.assign({}, obj(older.days));
    for (const [k, d] of Object.entries(obj(newer.days))) {
      const o = out.days[k];
      if (!o) {
        out.days[k] = d;
        continue;
      }
      const m = Object.assign({}, o);
      for (const f in d) m[f] = typeof d[f] === "number" && typeof o[f] === "number" ? Math.max(d[f], o[f]) : d[f];
      out.days[k] = m;
    }
    for (const k of ["parts", "badges", "stories"]) out[k] = Object.assign({}, obj(older[k]), obj(newer[k]));
    out.exams = Object.assign({}, obj(older.exams));
    for (const [k, v] of Object.entries(obj(newer.exams))) out.exams[k] = Math.max(Number(v) || 0, Number(out.exams[k]) || 0);
    out.kana = Object.assign({}, obj(older.kana));
    for (const [k, v] of Object.entries(obj(newer.kana))) {
      const o = out.kana[k];
      const n = (x) => (Array.isArray(x) ? (x[0] || 0) + (x[1] || 0) : -1);
      if (n(v) >= n(o)) out.kana[k] = v;
    }
    out.xp = Math.max(Number(a.xp) || 0, Number(b.xp) || 0);
    out.onboarded = !!(a.onboarded || b.onboarded);
    out.planned = !!(a.planned || b.planned);
    out.created = Math.min(created(a) || Date.now(), created(b) || Date.now());
    out.mod = Math.max(Number(a.mod) || 0, Number(b.mod) || 0);
    return out;
  }

  // The copy of each profile as it was at the last sync, for three-way merging.
  const BASE = KEY + "-base";
  function bases() {
    try {
      return JSON.parse(root.localStorage.getItem(BASE)) || {};
    } catch (e) {
      return {};
    }
  }
  function keepBases(list) {
    const out = {};
    for (const p of list) out[p.sid] = p.state;
    try {
      root.localStorage.setItem(BASE, JSON.stringify(out));
    } catch (e) {
      /* full or blocked: the next sync merges two-way */
    }
  }

  const empty = (st) => !Number(st.xp) && !Object.keys(obj(st.srs)).length && !Object.keys(obj(st.days)).length;

  // ---------------------------------------------------------------------------
  // The gist

  async function pull() {
    const g = await (await gh("/gists/" + cfg.gist)).json();
    const f = g.files && g.files[FILE];
    if (!f) return { profiles: [], gone: [] };
    let text = f.content;
    if (f.truncated) text = await (await root.fetch(f.raw_url, { cache: "no-store" })).text();
    let d;
    try {
      d = JSON.parse(text);
    } catch (e) {
      throw fail("broken", "The sync gist on GitHub can't be read. Connect again to start a new one.");
    }
    // Names, icons and states are cleaned the way a link from another device is.
    const profiles = (Array.isArray(d.profiles) ? d.profiles : []).filter((p) => p && isSid(p.sid) && p.state && typeof p.state === "object");
    const clean = NI.store.unbundle({ profiles });
    return { profiles: profiles.map((p, i) => Object.assign(clean[i] || {}, { sid: p.sid })).filter((p) => p.state), gone: (Array.isArray(d.gone) ? d.gone : []).filter(isSid) };
  }

  function content(list, gone) {
    return JSON.stringify({ app: "nihon", v: 1, updated: new Date().toISOString(), gone: gone.slice(-50), profiles: list.map((p) => ({ sid: p.sid, name: p.name, icon: p.icon, state: p.state })) });
  }

  // ---------------------------------------------------------------------------
  // One sync

  async function sync(why) {
    if (!connected() || busy || cfg.err === "auth" || cfg.err === "gone") return false;
    // Never under a running lesson or test: the profile in use might change.
    if (doc.body.classList.contains("in-session")) return later(20000);
    busy = true;
    try {
      const remote = await pull();
      const base = bases();
      const locals = NI.store.syncList();
      const curId = NI.store.profile.id;
      const curMod = NI.store.state.mod;
      const gone = U.uniq(remote.gone.concat(NI.store.gone));
      let touched = false;
      applying = true;
      // Profiles deleted on another device go here too (the last one stays).
      for (const l of locals.slice()) {
        if (!gone.includes(l.sid) || NI.store.profiles.length < 2) continue;
        if (NI.store.removeProfile(l.id)) locals.splice(locals.indexOf(l), 1);
      }
      for (const r of remote.profiles) {
        if (gone.includes(r.sid)) continue;
        let l = locals.find((x) => x.sid === r.sid);
        // A fresh device's empty profile of the same name becomes this one.
        if (!l) {
          l = locals.find((x) => !remote.profiles.some((y) => y.sid === x.sid) && !x.taken && x.name === r.name && empty(x.state));
          if (l) {
            l.taken = true;
            NI.store.linkSync(l.id, r.sid, r.name, r.icon);
            l.sid = r.sid;
          }
        }
        if (!l) {
          const id = NI.store.bring(r, null);
          locals.push({ id, sid: r.sid, name: r.name, icon: r.icon, state: r.state });
          touched = true;
          continue;
        }
        const m = mergeStates(l.state, r.state, base[r.sid]);
        if ((Number(r.state.mod) || 0) > (Number(l.state.mod) || 0) && (l.name !== r.name || l.icon !== r.icon)) {
          NI.store.linkSync(l.id, r.sid, r.name, r.icon);
          l.name = r.name;
          l.icon = r.icon;
        }
        if (same(m, l.state)) continue;
        // The profile in use changed while GitHub answered: next time.
        if (l.id === curId && NI.store.state.mod !== curMod) return later(5000);
        NI.store.putSynced(l.id, m);
        l.state = m;
        touched = true;
      }
      // Push when the gist doesn't hold what this device now has.
      const mine = locals.filter((l) => !gone.includes(l.sid));
      const differs = mine.length !== remote.profiles.filter((r) => !gone.includes(r.sid)).length || mine.some((l) => {
        const r = remote.profiles.find((x) => x.sid === l.sid);
        return !r || r.name !== l.name || r.icon !== l.icon || !same(r.state, l.state);
      }) || gone.length !== remote.gone.length;
      if (differs) await gh("/gists/" + cfg.gist, { method: "PATCH", body: { files: { [FILE]: { content: content(mine, gone) } } } });
      keepBases(mine);
      cfg.last = Date.now();
      delete cfg.err;
      delete cfg.msg;
      save();
      if (touched && why === "manual") ui.toast("Synced: progress from your other devices is here.");
      return true;
    } catch (e) {
      cfg.err = e.code || "http";
      cfg.msg = e.message;
      save();
      if (why === "manual" || e.code === "auth") ui.toast(e.message);
      return false;
    } finally {
      applying = false;
      busy = false;
    }
  }

  function later(ms) {
    clearTimeout(timer);
    timer = setTimeout(() => sync("auto"), ms);
    return false;
  }

  // Connecting this device: check the key, find the gist another device made, or make it.
  async function connect(token) {
    const t = String(token || "").trim();
    if (!/^[A-Za-z0-9_]{20,255}$/.test(t)) throw fail("key", "That doesn't look like a GitHub key. Copy the whole key (it starts with ghp_) and paste it again.");
    const keep = cfg;
    cfg = { token: t };
    try {
      const r = await gh("/user");
      const scopes = r.headers.get("x-oauth-scopes");
      if (scopes != null && !/\bgist\b/.test(scopes)) throw fail("scope", "That key can't reach your gists. Make a new one with “gist” ticked.");
      cfg.login = (await r.json()).login;
      let found = null;
      for (let page = 1; page <= 5 && !found; page++) {
        const list = await (await gh("/gists?per_page=100&page=" + page)).json();
        found = list.find((g) => g.files && g.files[FILE]);
        if (list.length < 100) break;
      }
      if (!found) {
        const list = NI.store.syncList();
        found = await (await gh("/gists", { method: "POST", body: { description: "日本 (Nihon): learning progress, synced between devices", public: false, files: { [FILE]: { content: content(list, NI.store.gone) } } } })).json();
      }
      cfg.gist = found.id;
      save();
      await sync("manual");
      return cfg.login;
    } catch (e) {
      cfg = keep;
      save();
      throw e;
    }
  }

  function disconnect() {
    cfg = {};
    save();
    try {
      root.localStorage.removeItem(BASE);
    } catch (e) {
      /* nothing kept */
    }
  }

  // A link that connects another device: the key travels in the #sync= part.
  const link = () => NI.move.base() + "#sync=" + cfg.token;

  // ---------------------------------------------------------------------------
  // When to sync

  function init() {
    if (!root.fetch || root.NI_EMBED) return;
    if (connected()) later(1500);
    NI.store.on((what) => {
      if (applying || !connected()) return;
      if (what === "srs" || what === "progress" || what === "books" || what === "settings" || what === "profile") later(8000);
    });
    doc.addEventListener("visibilitychange", () => {
      if (!connected()) return;
      if (doc.visibilityState === "visible" && Date.now() - (cfg.last || 0) > 2 * 60 * 1000) later(500);
      else if (doc.visibilityState === "hidden" && timer) sync("auto");
    });
    root.addEventListener("online", () => connected() && later(1000));
  }

  // ---------------------------------------------------------------------------
  // The section on the Move page

  function ago(t) {
    if (!t) return "not yet";
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return U.plural(Math.round(s / 60), "minute") + " ago";
    return new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function sectionHtml() {
    if (root.NI_EMBED) return "";
    const head = '<section class="u-sec mv-step sync-sec" id="sync" aria-labelledby="sync-h"><h2 id="sync-h"><span class="mv-n" aria-hidden="true">⟳</span>Sync automatically</h2>';
    if (connected())
      return (
        head +
        '<p class="sync-on"><b>✓ Syncing</b> with the GitHub account <b>' + esc(cfg.login || "") + "</b> · last synced " + esc(ago(cfg.last)) + ".</p>" +
        (cfg.msg ? '<p class="note mv-err" role="alert">' + esc(cfg.msg) + "</p>" : "") +
        "<p>Every profile on this device is kept the same as on your other connected devices: when the app opens, after each lesson and when you come back to it.</p>" +
        '<div class="row wrap"><button class="btn small primary" type="button" data-sync-now>Sync now</button><button class="btn small ghost" type="button" data-sync-link>Connect another device</button><button class="btn small ghost danger-text" type="button" data-sync-off>Stop syncing here</button></div>' +
        '<p class="small muted">Connect another device copies a link with this device’s GitHub key in it. Send it only to yourself: anyone with it can read and change your synced progress.</p></section>'
      );
    return (
      head +
      "<p>Instead of sending links, keep the same profiles on all your devices. 日本 has no server, so your progress is kept in a secret gist (a note) on your own GitHub account: it isn’t listed or searchable, and only someone with its exact address could open it.</p>" +
      '<ol class="sync-steps"><li><a href="' + TOKEN_PAGE + '" target="_blank" rel="noopener">Make a GitHub key</a> that can only reach gists (a free GitHub account is enough). Under Expiration choose <b>No expiration</b>, then <b>Generate token</b>, and copy the key.</li>' +
      '<li><label for="sync-key">Paste it here</label><div class="answer-row"><input id="sync-key" type="password" autocomplete="off" spellcheck="false" placeholder="ghp_…"><button class="btn primary" type="button" data-sync-connect>Connect</button></div></li>' +
      "<li>On your other devices, paste the same key, or open the link this device makes once it’s connected.</li></ol>" +
      '<p class="small muted">The key stays on this device. Stop syncing at any time; your progress stays where it is.</p></section>'
    );
  }

  function bindSection(el, rerender) {
    const sec = el.querySelector("#sync");
    if (!sec) return;
    const go = (b, fn) => b && b.addEventListener("click", fn);
    go(sec.querySelector("[data-sync-connect]"), async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = "Connecting…";
      try {
        const who = await connect(sec.querySelector("#sync-key").value);
        ui.toast("Connected as " + who + ". This device now syncs by itself.");
      } catch (err) {
        ui.toast(err.message);
      }
      rerender();
    });
    go(sec.querySelector("[data-sync-now]"), async (e) => {
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = "Syncing…";
      delete cfg.err;
      if (await sync("manual")) ui.toast("All synced.");
      rerender();
    });
    go(sec.querySelector("[data-sync-link]"), () => NI.copyText(link(), "Link copied. Send it to yourself and open it on the other device."));
    go(sec.querySelector("[data-sync-off]"), () =>
      ui.confirm({ title: "Stop syncing on this device?", body: "Your profiles stay here as they are, and on your other devices too. Paste a key again to sync again.", ok: "Stop syncing" }).then((yes) => {
        if (!yes) return;
        disconnect();
        ui.toast("This device no longer syncs.");
        rerender();
      })
    );
  }

  // Opened from a "Connect another device" link: offer to connect with its key.
  function fromLink(el, rerender) {
    const m = /^#sync=([A-Za-z0-9_]{20,255})$/.exec(root.location.hash);
    if (!m) return;
    try {
      root.history.replaceState(null, "", root.location.pathname + root.location.search + "#move");
    } catch (e) {
      /* the next navigation replaces it */
    }
    const sec = el.querySelector("#sync");
    if (!sec || connected()) return;
    const box = doc.createElement("div");
    box.className = "note sync-offer";
    box.innerHTML = "<p><b>Connect this device?</b> The link carries the GitHub key of your other device, so this one will sync with it.</p>" + '<div class="row wrap"><button class="btn primary" type="button" data-yes>Connect</button><button class="btn ghost" type="button" data-no>Not now</button></div>';
    sec.insertBefore(box, sec.children[1]);
    sec.scrollIntoView({ block: "start" });
    box.querySelector("[data-no]").addEventListener("click", () => box.remove());
    box.querySelector("[data-yes]").addEventListener("click", async () => {
      try {
        const who = await connect(m[1]);
        ui.toast("Connected as " + who + ". This device now syncs by itself.");
      } catch (err) {
        ui.toast(err.message);
      }
      rerender();
    });
  }

  NI.sync = {
    init,
    sync: () => sync("manual"),
    connect,
    disconnect,
    mergeStates,
    sectionHtml,
    bindSection,
    fromLink,
    get connected() {
      return connected();
    },
    get status() {
      return { connected: connected(), login: cfg.login || "", last: cfg.last || 0, err: cfg.err || "", msg: cfg.msg || "" };
    },
    onChange: (fn) => listeners.push(fn),
  };
})(typeof window !== "undefined" ? window : globalThis);
