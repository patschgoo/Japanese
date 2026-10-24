/* Moving profiles to another device (引っ越し). Progress lives in each browser,
   so a profile travels in a link (or a file) you send yourself: the profile is
   packed into the link's #move= part, which browsers never send to the server.
   Opening the link, pasting it or choosing the file shows what arrived, and it
   goes here as a new profile or over one on this device. Nothing changes until
   you say where. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const U = NI.util;
  const ui = NI.ui;
  const esc = ui.esc;
  const doc = root.document;
  const pages = (NI.pages = NI.pages || {});
  // Links made where the page has no address of its own (an embedded preview) open the site.
  const SITE = "https://patschgoo.github.io/Japanese/";

  // ---------------------------------------------------------------------------
  // Packing: JSON → deflate (where the browser can) → base64url, behind a tag
  // that says which: nihon1.… is compressed, nihon0.… is not.

  function b64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return root.btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64(s) {
    let t = s.replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    const bin = root.atob(t);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const through = (bytes, stream) => new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then((b) => new Uint8Array(b));

  async function pack(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (root.CompressionStream) {
      try {
        return "nihon1." + b64(await through(bytes, new root.CompressionStream("deflate-raw")));
      } catch (e) {
        /* fall back to the plain code */
      }
    }
    return "nihon0." + b64(bytes);
  }

  async function unpack(kind, body) {
    let bytes = unb64(body);
    if (kind === "1") {
      if (!root.DecompressionStream) throw new Error("This browser is too old to open the link. Update it, or send the file instead.");
      bytes = await through(bytes, new root.DecompressionStream("deflate-raw"));
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  const BROKEN = "That link is cut short or broken. Copy all of it again, or send the file instead.";

  // What was sent, from pasted text, a file or a link: a code, or a backup's JSON.
  async function read(text) {
    const t = String(text || "").trim();
    if (!t) throw new Error("Paste the link or the backup first.");
    const m = t.match(/nihon([01])\.([A-Za-z0-9_-]+)/);
    let data = null;
    if (m) {
      try {
        data = await unpack(m[1], m[2]);
      } catch (e) {
        // A mail app may have broken the link over lines: try it joined up.
        const j = t.replace(/\s+/g, "").match(/nihon([01])\.([A-Za-z0-9_-]+)/);
        try {
          data = j && j[2] !== m[2] ? await unpack(j[1], j[2]) : null;
        } catch (e2) {
          data = null;
        }
        if (!data) throw new Error(e.message && /too old/.test(e.message) ? e.message : BROKEN);
      }
    } else if (t.charAt(0) === "{") {
      try {
        data = JSON.parse(t);
      } catch (e) {
        throw new Error("That backup is cut short. Copy all of it, or choose the file instead.");
      }
    } else throw new Error("That isn't a link or backup from 日本. Paste the whole link you sent yourself.");
    const list = NI.store.unbundle(data);
    if (!list.length) throw new Error("There's no profile in that. Make a new link on the other device and try again.");
    return { sent: data.sent || data.exported || "", list };
  }

  // The address the link opens: this page's, or the site's in an embedded preview.
  function base() {
    const L = root.location;
    return !root.NI_EMBED && /^https?:$/.test(L.protocol) ? L.origin + L.pathname : SITE;
  }

  // ---------------------------------------------------------------------------
  // The page

  const dateOf = (k) => (k ? new Date(k + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
  function sentLine(iso) {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return "";
    return "Sent " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " at " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  // "Level 12 · 4,210 XP · 160 review cards · 2 saved words"
  function numbers(n) {
    if (!n.xp && !n.cards && !n.days) return "Nothing learnt yet";
    return "Level " + NI.game.level(n.xp).n + " · " + n.xp.toLocaleString("en-GB") + " XP · " + U.plural(n.cards, "review card") + (n.saved ? " · " + U.plural(n.saved, "saved word") : "");
  }
  const lastLine = (n) => (n.days ? "Practised on " + U.plural(n.days, "day") + ", last on " + dateOf(n.last) : "");
  const empty = (n) => !n.xp && !n.cards && !n.days;

  // Where each arriving profile goes unless you choose otherwise: over an empty
  // profile here, or over its namesake when the arriving copy is at least as far
  // along; otherwise next to them as a new one.
  function defaults(list) {
    const locals = NI.store.profiles.map((p) => ({ p, n: NI.store.peek(p.id) }));
    const used = new Set();
    return list.map((x) => {
      const n = NI.store.sum(x.state);
      const free = (l) => !used.has(l.p.id);
      let to = locals.find((l) => free(l) && l.p.name === x.name && (empty(l.n) || (n.last >= l.n.last && n.xp >= l.n.xp)));
      if (!to && locals.length === 1 && free(locals[0]) && empty(locals[0].n)) to = locals[0];
      if (!to) return "new";
      used.add(to.p.id);
      return "over:" + to.p.id;
    });
  }

  // A warning for putting a profile over one here that has progress of its own.
  function warning(x, choice) {
    if (!/^over:/.test(choice)) return "";
    const id = choice.slice(5);
    const p = NI.store.profiles.find((q) => q.id === id);
    const here = NI.store.peek(id);
    if (!p || empty(here)) return "";
    const n = NI.store.sum(x.state);
    const newer = here.last > n.last || here.xp > n.xp;
    return (newer ? "<b>The copy on this device looks further along.</b> " : "") + "This replaces " + esc(p.icon + " " + p.name) + " here: " + esc(numbers(here)) + (here.last ? ", last practised on " + esc(dateOf(here.last)) : "") + ".";
  }

  function incomingHtml(got) {
    const choices = defaults(got.list);
    const opts = (i) =>
      '<option value="new"' + (choices[i] === "new" ? " selected" : "") + ">as a new profile</option>" +
      NI.store.profiles.map((p) => '<option value="over:' + esc(p.id) + '"' + (choices[i] === "over:" + p.id ? " selected" : "") + ">over " + esc(p.icon + " " + p.name) + " here" + (empty(NI.store.peek(p.id)) ? " (empty)" : "") + "</option>").join("") +
      (got.list.length > 1 ? '<option value="skip">nowhere: leave it</option>' : "");
    return (
      '<section class="u-sec mv-in" aria-labelledby="mv-in-h"><h2 id="mv-in-h">Bring ' + (got.list.length > 1 ? "them" : "it") + " to this device</h2>" +
      '<p class="small muted">' + esc([sentLine(got.sent), U.plural(got.list.length, "profile")].filter(Boolean).join(" · ")) + "</p>" +
      '<ul class="mv-list">' +
      got.list
        .map((x, i) => {
          const n = NI.store.sum(x.state);
          return (
            '<li class="mv-prof"><span class="prof-ic" aria-hidden="true">' + esc(x.icon) + '</span><div class="prof-tx"><b>' + esc(x.name) + "</b><span>" + esc(numbers(n)) + "</span>" + (n.days ? "<span>" + esc(lastLine(n)) + "</span>" : "") + "</div>" +
            '<label class="mv-to" for="mv-to-' + i + '">Put it <select id="mv-to-' + i + '" data-i="' + i + '">' + opts(i) + "</select></label>" +
            '<p class="small mv-warn" data-warn="' + i + '"' + (warning(x, choices[i]) ? "" : " hidden") + ">" + warning(x, choices[i]) + "</p></li>"
          );
        })
        .join("") +
      "</ul>" +
      '<div class="row wrap"><button class="btn primary" type="button" data-mv-bring>Bring ' + (got.list.length > 1 ? "them" : "it") + ' here</button><button class="btn ghost" type="button" data-mv-cancel>Not now</button></div></section>'
    );
  }

  // Takes the #move=… part out of the address once it's been dealt with.
  function clearHash() {
    if (!/^#move=/.test(root.location.hash)) return;
    try {
      root.history.replaceState(null, "", root.location.pathname + root.location.search + "#move");
    } catch (e) {
      /* not allowed here (embedded); the next navigation replaces it */
    }
  }

  pages.move = {
    title: "Move to another device",
    nav: "options",
    render() {
      const many = NI.store.profiles.length > 1;
      const cur = NI.store.profile;
      const share = !!(root.navigator && root.navigator.share);
      return (
        '<header class="page-head"><p class="crumb"><a href="#options">← Options</a></p><h1>Move to another device <span class="sub">' + ui.jp("{引|ひ}っ{越|こ}し", { tokens: false }) + "</span></h1>" +
        "<p>Your progress is kept in this browser. To carry on on a phone, a tablet or another computer, send it there in a link or a file. It goes from you to you: nothing is uploaded.</p></header>" +
        '<div id="mv-in" aria-live="polite"></div>' +
        '<section class="u-sec mv-step" aria-labelledby="mv-send-h"><h2 id="mv-send-h"><span class="mv-n" aria-hidden="true">1</span>Send it from this device</h2>' +
        (many
          ? '<fieldset><legend>What to send</legend>' +
            '<label class="radio" for="mv-one"><input type="radio" id="mv-one" name="mv-what" value="one" checked><span><b>' + esc(cur.icon + " " + cur.name) + "</b><small>The profile in use</small></span></label>" +
            '<label class="radio" for="mv-all"><input type="radio" id="mv-all" name="mv-what" value="all"><span><b>All ' + NI.store.profiles.length + " profiles</b><small>" + esc(NI.store.profiles.map((p) => p.icon + " " + p.name).join(", ")) + "</small></span></label></fieldset>"
          : '<p class="mv-what">' + esc(cur.icon + " " + cur.name) + ' <span class="small muted">· ' + esc(numbers(NI.store.peek(cur.id))) + "</span></p>") +
        '<div class="row wrap">' +
        (share ? '<button class="btn primary" type="button" data-mv-share>Share the link…</button>' : "") +
        '<button class="btn' + (share ? " ghost" : " primary") + '" type="button" data-mv-copy>Copy the link</button>' +
        (root.NI_EMBED ? "" : '<button class="btn ghost" type="button" data-mv-file>Save as a file</button>') +
        "</div>" +
        '<p class="small muted" id="mv-size">Send the link to yourself: by message or email, AirDrop, or a note that syncs. The file works the same way and makes a good backup.</p></section>' +
        '<section class="u-sec mv-step" aria-labelledby="mv-get-h"><h2 id="mv-get-h"><span class="mv-n" aria-hidden="true">2</span>Open it on the other device</h2>' +
        "<p>Open the link there and 日本 asks where the profile should go. Nothing is changed until you choose.</p>" +
        "<p>Or paste the link (or an old backup) here, or choose the file:</p>" +
        '<div class="mv-drop"><label for="mv-text" class="sr">The link or backup</label><textarea id="mv-text" rows="3" placeholder="Paste the link here" autocomplete="off" spellcheck="false"></textarea>' +
        '<div class="row wrap"><button class="btn small primary" type="button" data-mv-open>Open it</button><label class="btn small ghost mv-pick">Choose a file…<input type="file" accept=".json,application/json,text/plain" hidden></label></div></div>' +
        '<p class="small muted">Using 日本 from your home screen? There it keeps its own progress, apart from the browser, so copy the link and paste it here rather than tapping it.</p></section>'
      );
    },
    mount(el) {
      const box = el.querySelector("#mv-in");
      const text = el.querySelector("#mv-text");
      let got = null;

      // ---- sending
      const what = () => ((el.querySelector('input[name="mv-what"]:checked') || {}).value === "all" ? null : [NI.store.profile.id]);
      const label = () => (what() ? NI.store.profile.icon + " " + NI.store.profile.name : "all your profiles");
      const made = {};
      const linkFor = async () => {
        const k = what() ? "one" : "all";
        if (!made[k]) made[k] = base() + "#move=" + (await pack(NI.store.bundle(what())));
        return made[k];
      };
      const sizeNote = async () => {
        const n = (await linkFor()).length;
        const p = el.querySelector("#mv-size");
        if (p) p.textContent = "The link holds everything: " + n.toLocaleString("en-GB") + " characters. Send it to yourself by message or email, AirDrop, or a note that syncs" + (n > 4000 ? ". If an app cuts it short, send the file instead." : ".");
      };
      sizeNote();
      el.querySelectorAll('input[name="mv-what"]').forEach((r) => r.addEventListener("change", sizeNote));
      const shareBtn = el.querySelector("[data-mv-share]");
      if (shareBtn)
        shareBtn.addEventListener("click", async () => {
          const url = await linkFor();
          try {
            await root.navigator.share({ title: "日本: " + label(), text: "Open this on your other device to bring over " + label() + ".", url });
          } catch (e) {
            if (e && e.name === "AbortError") return;
            NI.copyText(url, "Sharing isn't possible here, so the link is copied instead.");
          }
        });
      el.querySelector("[data-mv-copy]").addEventListener("click", async () => NI.copyText(await linkFor(), "Link copied. Send it to yourself and open it on the other device."));
      const fileBtn = el.querySelector("[data-mv-file]");
      if (fileBtn)
        fileBtn.addEventListener("click", () => {
          const slug = (what() ? NI.store.profile.name : "all profiles").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profile";
          try {
            const blob = new Blob([JSON.stringify(NI.store.bundle(what()))], { type: "application/json" });
            const a = doc.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "nihon-" + slug + "-" + U.dayKey() + ".json";
            doc.body.appendChild(a);
            a.click();
            setTimeout(() => {
              URL.revokeObjectURL(a.href);
              a.remove();
            }, 500);
          } catch (e) {
            ui.toast("Saving a file isn't possible here. Copy the link instead.");
          }
        });

      // ---- receiving
      const show = (g) => {
        got = g;
        box.innerHTML = incomingHtml(g);
        box.querySelectorAll("select[data-i]").forEach((s) =>
          s.addEventListener("change", () => {
            const i = Number(s.getAttribute("data-i"));
            const w = box.querySelector('[data-warn="' + i + '"]');
            w.innerHTML = warning(got.list[i], s.value);
            w.hidden = !w.innerHTML;
          })
        );
        box.querySelector("[data-mv-bring]").addEventListener("click", bring);
        box.querySelector("[data-mv-cancel]").addEventListener("click", () => {
          got = null;
          box.innerHTML = "";
          clearHash();
        });
        box.scrollIntoView({ block: "start" });
        box.querySelector("[data-mv-bring]").focus({ preventScroll: true });
      };
      const fail = (e) => {
        box.innerHTML = '<p class="note mv-err" role="alert">' + esc(e.message || BROKEN) + "</p>";
      };
      const open = (t) => read(t).then(show, fail);
      function bring() {
        const picks = Array.from(box.querySelectorAll("select[data-i]")).map((s) => s.value);
        const over = picks.filter((v) => /^over:/.test(v));
        if (new Set(over).size < over.length) return ui.toast("Two profiles can't go over the same one. Choose another place for one of them.");
        if (picks.every((v) => v === "skip")) return ui.toast("Choose where at least one profile goes.");
        const go = () => {
          clearHash();
          let first = null;
          got.list.forEach((x, i) => {
            if (picks[i] === "skip") return;
            const id = NI.store.bring(x, picks[i] === "new" ? null : picks[i].slice(5));
            if (!first) first = id;
          });
          NI.store.switchProfile(first);
          const p = NI.store.profile;
          const n = picks.filter((v) => v !== "skip").length;
          ui.toast(n > 1 ? U.plural(n, "profile") + " brought here. " + p.icon + " " + p.name + ": おかえり！" : p.icon + " " + p.name + " is on this device now. おかえり！");
          NI.app.go("home");
        };
        const lost = over.map((v) => v.slice(5)).filter((id) => !empty(NI.store.peek(id)));
        if (!lost.length) return go();
        const names = lost.map((id) => NI.store.profiles.find((p) => p.id === id)).map((p) => p.icon + " " + p.name).join(" and ");
        ui.confirm({ title: "Replace " + names + " on this device?", body: "What " + (lost.length > 1 ? "they have" : "it has") + " learnt on this device is replaced by what arrived. To keep both, choose “as a new profile” instead.", ok: "Replace", danger: true }).then((yes) => yes && go());
      }
      el.querySelector("[data-mv-open]").addEventListener("click", () => open(text.value));
      text.addEventListener("paste", () => setTimeout(() => /nihon[01]\./.test(text.value) && open(text.value), 0));
      const readFile = (f) => {
        if (!f) return;
        if (f.size > 5e6) return fail(new Error("That file is too big to be a backup from 日本."));
        const r = new FileReader();
        r.onload = () => open(String(r.result || ""));
        r.onerror = () => fail(new Error("That file couldn't be read."));
        r.readAsText(f);
      };
      el.querySelector(".mv-pick input").addEventListener("change", (e) => readFile(e.target.files[0]));
      const drop = el.querySelector(".mv-drop");
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("over");
      });
      drop.addEventListener("dragleave", () => drop.classList.remove("over"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("over");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
        else open(e.dataTransfer.getData("text"));
      });
      // Opened from a link: what it carries.
      if (/^#move=/.test(root.location.hash)) open(root.location.hash);
    },
  };

  NI.move = { pack, read, base };
})(typeof window !== "undefined" ? window : globalThis);
