/* App shell: hash router, navigation, global click handling and start-up.
   Routes are plain tokens such as #unit-3, #learn-3-w1, #kana-loan. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const doc = root.document;
  const ui = NI.ui;
  let current = null;

  const NAV = [
    { id: "home", label: "Learn", ja: "{学|まな}ぶ" },
    { id: "review", label: "Review", ja: "{復習|ふくしゅう}", badge: true },
    { id: "play", label: "Play", ja: "{遊|あそ}ぶ" },
    { id: "tools", label: "Tools", ja: "{道具|どうぐ}" },
    { id: "kana", label: "Kana", ja: "かな", wide: true },
    { id: "guide", label: "Guide", ja: "ガイド", wide: true },
    { id: "options", label: "Options", icon: "gear", wide: true },
    { id: "more", label: "More", ja: "その{他|た}", narrow: true },
  ];

  function parse(hash) {
    const h = String(hash || "").replace(/^#\/?/, "");
    if (!h) return { name: "home", args: [] };
    // A link from another device carries a profile (#move=nihon1.…) or a sync key (#sync=…).
    if (/^move=/.test(h)) return { name: "move", args: [] };
    if (/^sync=/.test(h)) return { name: "move", args: ["sync"] };
    const parts = h.split("-");
    if (!NI.pages[parts[0]]) return null; // an in-page anchor, not a route
    return { name: parts[0], args: parts.slice(1) };
  }

  function renderNav(active) {
    const act = active || (current && (current.page.nav || current.name)) || "home";
    const due = NI.srs.countDueBy(NI.store.state.srs, Date.now());
    const item = (n, cls) => {
      const on = n.id === act;
      const badge = n.badge && due ? '<span class="badge" aria-label="' + due + ' due">' + (due > 99 ? "99+" : due) + "</span>" : "";
      const inner = n.icon ? ui.ICON[n.icon] + '<span class="sr">' + n.label + "</span>" : "<span>" + n.label + "</span>" + (n.ja ? '<small lang="ja">' + NI.furi.reading(n.ja) + "</small>" : "");
      return '<a class="' + cls + (on ? " on" : "") + (n.icon ? " icon-link" : "") + '" href="#' + n.id + '"' + (on ? ' aria-current="page"' : "") + (n.icon ? ' title="' + n.label + '"' : "") + ">" + inner + badge + "</a>";
    };
    const top = doc.getElementById("topnav");
    const tab = doc.getElementById("tabbar");
    if (top) top.innerHTML = NAV.filter((n) => !n.narrow).map((n) => item(n, "nav-link")).join("");
    if (tab) tab.innerHTML = NAV.filter((n) => !n.wide).map((n) => item(n, "tab-link")).join("");
    NI.book.profileButton();
  }

  // The tab bar steps aside only while a lesson, review or game is running
  // (its top bar with the ✕ is on screen), or a practice box marked
  // data-session is open. Empty and finished screens, like Review with
  // nothing due, keep it.
  function sessionMode() {
    const main = doc.getElementById("main");
    const on = !!(current && current.page && main && ((current.page.session && main.querySelector(".sess-top")) || main.querySelector("[data-session]:not([hidden])")));
    if (doc.body.classList.contains("in-session") !== on) doc.body.classList.toggle("in-session", on);
    if (!on) showUpdate();
  }

  /* A new version: the site's sw.js names the newest release (nihon-v13). An
     app left open, or brought back from the background, finds out and offers
     a reload, never in the middle of a lesson. */
  let newer = false;
  let checkedAt = 0;
  function checkVersion(say) {
    if (!/^https?:$/.test(root.location.protocol) || root.NI_EMBED || !root.fetch) return;
    checkedAt = Date.now();
    root
      .fetch("sw.js", { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => {
        const m = /nihon-v(\d+)/.exec(t);
        newer = !!(m && Number(m[1]) > NI.VERSION);
        if (newer) showUpdate();
        else if (say) ui.toast("You have the newest version (" + NI.VERSION + ").");
      })
      .catch(() => say && ui.toast("Couldn't check: this device seems to be offline."));
  }
  function showUpdate() {
    if (!newer || doc.body.classList.contains("in-session") || doc.getElementById("update-bar")) return;
    const bar = doc.createElement("div");
    bar.id = "update-bar";
    bar.className = "update-bar";
    bar.setAttribute("role", "status");
    bar.innerHTML = '<span>A new version of <span lang="ja">日本</span> is ready.</span><button class="btn small primary" type="button" data-reload>Reload</button><button class="icon-btn" type="button" data-later aria-label="Not now">' + ui.ICON.close + "</button>";
    bar.querySelector("[data-reload]").addEventListener("click", () => {
      NI.store.flush();
      root.location.reload();
    });
    bar.querySelector("[data-later]").addEventListener("click", () => {
      newer = false;
      bar.remove();
    });
    doc.body.appendChild(bar);
  }

  /* Web fonts come after the app has started: on a slow connection the
     scripts get the bandwidth first, and text shows in the device's own
     fonts until these arrive. The address is in index.html's <noscript>. */
  function loadFonts() {
    if (doc.querySelector('link[rel="stylesheet"][href*="fonts.googleapis"]')) return;
    const ns = doc.querySelector("noscript[data-fonts]");
    const m = ns && /href="([^"]+)"/.exec(ns.textContent || ns.innerHTML);
    if (!m) return;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = m[1].replace(/&amp;/g, "&");
    doc.head.appendChild(link);
  }

  // The phone's status bar takes the colour of the top bar, in the theme in use.
  function themeColor() {
    const bar = doc.querySelector(".topbar");
    if (!bar || !root.getComputedStyle) return;
    const c = root.getComputedStyle(bar).backgroundColor;
    doc.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", c));
  }

  let shows = 0; // pages shown so far
  function show(r) {
    shows++;
    if (current && current.page && current.page.unmount) {
      try {
        current.page.unmount();
      } catch (e) {
        console.error(e);
      }
    }
    ui.hidePop();
    const page = NI.pages[r.name];
    const main = doc.getElementById("main");
    current = { name: r.name, args: r.args, page };
    try {
      main.innerHTML = page.render(r.args);
      const title = typeof page.title === "function" ? page.title(r.args) : page.title;
      doc.title = (title && r.name !== "home" ? title + " · " : "") + "日本";
      renderNav(page.nav || r.name);
      if (page.mount) page.mount(main, r.args);
      sessionMode();
    } catch (e) {
      console.error(e);
      main.innerHTML = '<p class="empty">Something went wrong on this page. <a href="#home">Back to the route map</a></p>';
    }
    root.scrollTo(0, 0);
  }

  function render() {
    show(parse(root.location.hash) || (current ? { name: current.name, args: current.args } : { name: "home", args: [] }));
  }

  function go(route) {
    const h = "#" + route;
    if (root.location.hash === h) {
      render();
      return;
    }
    const before = shows;
    root.location.hash = h;
    // Some embedded viewers don't fire hashchange; render directly if so,
    // unless a page has been shown since (this one, or one opened after it).
    setTimeout(() => {
      if (shows !== before) return;
      const r = parse(h);
      if (r) show(r);
    }, 60);
  }

  // An embedding page may set data-theme itself; "system" leaves its choice alone
  // and hands it back after Options overrode it.
  let ownTheme = false;
  let hostTheme = null;
  function applySettings() {
    const s = NI.store.settings;
    const el = doc.documentElement;
    if (s.theme === "light" || s.theme === "dark") {
      if (!ownTheme) hostTheme = el.getAttribute("data-theme");
      el.setAttribute("data-theme", s.theme);
      ownTheme = true;
    } else if (ownTheme) {
      if (hostTheme) el.setAttribute("data-theme", hostTheme);
      else el.removeAttribute("data-theme");
      ownTheme = false;
    }
    doc.body.classList.toggle("furi-hover", s.furigana === "hover");
    doc.body.classList.toggle("show-gloss", !!s.gloss);
    doc.body.classList.toggle("show-romaji", !!s.romaji);
    doc.body.classList.toggle("pcolor", !!s.particles);
    doc.body.classList.toggle("no-hand", s.handFont === false);
    if (s.textSize && s.textSize !== "m") el.setAttribute("data-size", s.textSize);
    else el.removeAttribute("data-size");
    themeColor();
  }

  function onClick(e) {
    // A handler on the page already replaced what was clicked (a form that
    // opened in its place): that click is dealt with.
    if (e.target.nodeType === 1 && !e.target.isConnected) return;
    const say = e.target.closest("[data-say]");
    if (say) {
      e.preventDefault();
      if (!NI.speech.speak(say.getAttribute("data-say"))) ui.toast("Audio isn't available in this browser.");
      say.classList.remove("ping");
      void say.offsetWidth;
      say.classList.add("ping");
      return;
    }
    // The bookmark on any word: save it to the word book, or take it out.
    const mark = e.target.closest("[data-save]");
    if (mark) {
      e.preventDefault();
      NI.book.toggle(mark.getAttribute("data-save"));
      mark.dispatchEvent(new CustomEvent("ni-save", { bubbles: true }));
      return;
    }
    const addWord = e.target.closest("[data-add-word]");
    if (addWord) {
      e.preventDefault();
      NI.book.startAdd(addWord.getAttribute("data-add-word"), addWord.getAttribute("data-r"));
      return;
    }
    const prof = e.target.closest("[data-profiles]");
    if (prof) {
      e.preventDefault();
      if (ui.popAnchor === prof) ui.hidePop();
      else NI.book.profileMenu(prof);
      return;
    }
    const bd = e.target.closest("[data-bd]");
    if (bd) {
      e.preventDefault();
      NI.breakdown.open(bd.getAttribute("data-bd"), bd.getAttribute("data-en"));
      return;
    }
    // Words inside buttons and links belong to them (answer options, station names).
    const tok = e.target.closest(".tok[data-k]");
    if (tok && !tok.parentElement.closest("a, button, label, .opt, .tile, .m-cell")) {
      e.preventDefault();
      if (ui.popAnchor === tok) ui.hidePop();
      else ui.showWord(tok.getAttribute("data-k"), tok, NI.lookup.mode(tok));
      return;
    }
    if (!e.target.closest("#pop, #seltool")) ui.hidePop();
    // Internal links navigate from script, so routing also works in embedded
    // frames whose base URL is the host page's (where "#unit-1" would resolve
    // to the host's address).
    const link = e.target.closest('a[href^="#"]');
    if (link && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      e.preventDefault();
      const href = link.getAttribute("href");
      if (parse(href)) {
        if (root.location.hash !== href) go(href.slice(1));
      } else {
        const t = doc.getElementById(href.slice(1));
        if (t) {
          t.scrollIntoView({ block: "start" });
          t.focus({ preventScroll: true });
        }
      }
      return;
    }
    const jump = e.target.closest("[data-jump]");
    if (jump) {
      const t = doc.getElementById(jump.getAttribute("data-jump"));
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Any other Japanese text: the word under the tap.
    if (NI.lookup.tap(e)) e.preventDefault();
  }

  function registerWorker() {
    if (!("serviceWorker" in navigator) || !/^https:$/.test(root.location.protocol)) return;
    try {
      const had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register("sw.js").catch(() => {});
      // The worker swapped itself for a newer one: the page may be the older version.
      navigator.serviceWorker.addEventListener("controllerchange", () => had && checkVersion());
    } catch (e) {
      /* not available here (e.g. sandboxed preview) */
    }
  }

  function boot() {
    NI.store.load();
    NI.course.init();
    NI.lex.build();
    NI.lex.setMine(NI.store.books.custom);
    applySettings();
    NI.lookup.init();
    NI.store.on((what) => {
      // Your own words are words like any other in look-ups and the Reader.
      if (what === "all" || what === "books") NI.lex.setMine(NI.store.books.custom);
      if (what === "settings") {
        applySettings();
        if (current && current.name !== "options" && !current.page.session) render();
      } else if (what === "srs" || what === "progress") {
        renderNav();
      } else if (what === "all") {
        // Another profile, a restored backup or another tab: settings may differ too.
        applySettings();
        render();
      } else if (what === "profile") {
        renderNav();
        if (current && current.name === "profiles") render();
      }
    });
    NI.speech.onVoices(() => {
      if (current && current.name === "options") render();
    });
    doc.addEventListener("click", onClick);
    if (root.MutationObserver) new root.MutationObserver(sessionMode).observe(doc.getElementById("main"), { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    doc.addEventListener("keydown", (e) => {
      if (e.key === "Escape") ui.hidePop();
    });
    root.addEventListener("hashchange", () => {
      const r = parse(root.location.hash);
      if (r) show(r); // ignore in-page anchors such as the skip link
    });
    root.addEventListener("resize", () => ui.hidePop());
    root.addEventListener("pagehide", () => NI.store.flush());
    root.addEventListener("storage", (e) => {
      if (e.key === NI.store.key && !(current && current.page.session)) NI.store.syncFrom(e.newValue);
      else if (e.key === NI.store.PKEY) NI.store.syncIndex();
    });
    doc.addEventListener("visibilitychange", () => {
      if (doc.visibilityState === "hidden") NI.store.flush();
      else {
        renderNav();
        if (Date.now() - checkedAt > 10 * 60 * 1000) checkVersion();
      }
    });
    root.setInterval(() => doc.visibilityState === "visible" && checkVersion(), 60 * 60 * 1000);
    if (root.matchMedia) {
      const dark = root.matchMedia("(prefers-color-scheme: dark)");
      if (dark.addEventListener) dark.addEventListener("change", themeColor);
    }
    // Back after a missed day or two: rest days keep the streak going.
    const rested = NI.store.useRestDays();
    render();
    if (rested) NI.fx.banner('<span class="rw-icon" aria-hidden="true">🎫</span><span><b>Welcome back!</b> ' + (rested === 1 ? "A rest day" : rested + " rest days") + " kept your " + NI.store.streak() + "-day streak going.</span>", "rw-bonus");
    registerWorker();
    loadFonts();
    if (NI.sync) NI.sync.init();
  }

  NI.app = { render, go, renderNav, parse, applySettings, checkVersion };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
