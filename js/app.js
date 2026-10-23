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
  }

  function show(r) {
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
      doc.body.classList.toggle("in-session", !!page.session);
      const title = typeof page.title === "function" ? page.title(r.args) : page.title;
      doc.title = (title && r.name !== "home" ? title + " · " : "") + "Nihongo Ippo";
      renderNav(page.nav || r.name);
      if (page.mount) page.mount(main, r.args);
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
    root.location.hash = h;
    // Some embedded viewers don't fire hashchange; render directly if so.
    setTimeout(() => {
      if (!current || current.name + (current.args.length ? "-" + current.args.join("-") : "") !== route) {
        const r = parse(h);
        if (r) show(r);
      }
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
    doc.body.classList.toggle("pcolor", !!s.particles);
    if (s.textSize && s.textSize !== "m") el.setAttribute("data-size", s.textSize);
    else el.removeAttribute("data-size");
  }

  function onClick(e) {
    const say = e.target.closest("[data-say]");
    if (say) {
      e.preventDefault();
      if (!NI.speech.speak(say.getAttribute("data-say"))) ui.toast("Audio isn't available in this browser.");
      say.classList.remove("ping");
      void say.offsetWidth;
      say.classList.add("ping");
      return;
    }
    const bd = e.target.closest("[data-bd]");
    if (bd) {
      e.preventDefault();
      NI.breakdown.open(bd.getAttribute("data-bd"), bd.getAttribute("data-en"));
      return;
    }
    const tok = e.target.closest(".tok[data-k]");
    if (tok) {
      e.preventDefault();
      if (ui.popAnchor === tok) ui.hidePop();
      else ui.showWord(tok.getAttribute("data-k"), tok);
      return;
    }
    if (!e.target.closest("#pop")) ui.hidePop();
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
    }
  }

  function registerWorker() {
    if (!("serviceWorker" in navigator) || !/^https:$/.test(root.location.protocol)) return;
    try {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    } catch (e) {
      /* not available here (e.g. sandboxed preview) */
    }
  }

  function boot() {
    NI.store.load();
    NI.course.init();
    NI.lex.build();
    applySettings();
    NI.store.on((what) => {
      if (what === "settings") {
        applySettings();
        if (current && current.name !== "options" && !current.page.session) render();
      } else if (what === "srs" || what === "progress") {
        renderNav();
      } else if (what === "all") {
        render();
      }
    });
    NI.speech.onVoices(() => {
      if (current && current.name === "options") render();
    });
    doc.addEventListener("click", onClick);
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
      if (e.key === NI.store.KEY && !(current && current.page.session)) NI.store.syncFrom(e.newValue);
    });
    doc.addEventListener("visibilitychange", () => {
      if (doc.visibilityState === "hidden") NI.store.flush();
      else renderNav();
    });
    render();
    registerWorker();
  }

  NI.app = { render, go, renderNav, parse, applySettings };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
