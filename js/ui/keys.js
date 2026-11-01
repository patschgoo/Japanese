/* On-screen romaji keys for phones and tablets. The phone's own keyboard
   covers half the screen; these keys take far less room and type straight
   into an answer box: the letters romaji needs, in English (QWERTY) or
   German (QWERTZ) order, with ー, ' and Enter where answers are typed in
   kana. The phone's keyboard is a tap away. Both choices belong to the
   learning profile and hold everywhere (intro.krKeys, intro.krLayout: Kana
   Rain had them first). With a mouse, nothing changes. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const doc = root.document;

  const LAYOUTS = {
    en: { short: "EN", name: "English keyboard (QWERTY)", rows: ["wertyuiop", "asdfghjk", "zcbnm"] },
    de: { short: "DE", name: "German keyboard (QWERTZ)", rows: ["wertzuiop", "asdfghjk", "ycbnm"] },
  };

  const touch = () => !!(root.matchMedia && root.matchMedia("(pointer: coarse)").matches);
  const intro = () => NI.store.state.intro;
  const wanted = () => intro().krKeys !== false;

  // The layout to use: the one chosen before, or the browser's language.
  function layout() {
    if (LAYOUTS[intro().krLayout]) return intro().krLayout;
    const langs = (root.navigator && (root.navigator.languages || [root.navigator.language])) || [];
    return /^de\b/i.test(langs[0] || "") ? "de" : "en";
  }

  const key = (k, label, cls, aria) => '<button class="kb-key' + (cls ? " " + cls : "") + '" type="button" data-k="' + k + '"' + (aria ? ' aria-label="' + aria + '"' : "") + ">" + label + "</button>";

  function keysHtml(id, o) {
    const rows = LAYOUTS[id].rows.map((r, i) => '<div class="kb-row">' + r.split("").map((c) => key(c, c)).join("") + (i === 2 ? key("del", "⌫", "wide", "Delete") : "") + "</div>");
    if (o.kana || o.enter)
      rows.push(
        '<div class="kb-row">' +
          (o.kana ? key("-", "ー", "", "Long vowel mark") + key("'", "'", "", "Apostrophe, for n before a vowel") : "") +
          (o.enter ? key("enter", o.enter, "enter") : "") +
          "</div>"
      );
    return rows.join("");
  }

  /* Puts the keys under an answer box, on touch screens only.
     o.after: the element they follow (else the box's .answer-row)
     o.host: an element that gets .kb-on while the keys are in use
     o.kana: ー and ' keys, for answers typed in romaji that turn into kana
     o.enter: a label for an Enter key (it sends Enter to the box)
     o.global: a real keyboard types into the box even when it isn't focused
     o.placeholder: what the empty box says while the keys are on
     Returns null when there's no touch screen. */
  function attach(input, o) {
    o = o || {};
    if (!touch() || !input) return null;
    let on = wanted();
    let lay = layout();
    const wrap = doc.createElement("div");
    wrap.className = "kb";
    wrap.innerHTML =
      '<div class="kb-keys" role="group" aria-label="Romaji keys"></div>' +
      '<div class="kb-switch"><div class="seg small" role="group" aria-label="Keyboard layout">' +
      Object.keys(LAYOUTS).map((id) => '<button class="seg-b" type="button" data-kb-layout="' + id + '" aria-label="' + LAYOUTS[id].name + '" title="' + LAYOUTS[id].name + '">' + LAYOUTS[id].short + "</button>").join("") +
      '</div><button class="btn small ghost" type="button" data-kb-switch></button></div>';
    (o.after || input.closest(".answer-row") || input).after(wrap);
    const keysEl = wrap.querySelector(".kb-keys");
    const seg = wrap.querySelector(".seg");
    const switchBtn = wrap.querySelector("[data-kb-switch]");
    const placeholder = input.getAttribute("placeholder") || "";

    function useLayout(id) {
      lay = id;
      keysEl.innerHTML = keysHtml(id, o);
      wrap.querySelectorAll("[data-kb-layout]").forEach((b) => {
        const here = b.getAttribute("data-kb-layout") === id;
        b.classList.toggle("on", here);
        b.setAttribute("aria-pressed", String(here));
      });
    }
    // With the keys on, the box is read-only, so it never opens the phone's keyboard.
    function useKeys(v) {
      on = v;
      keysEl.hidden = seg.hidden = !v;
      input.readOnly = v;
      input.setAttribute("inputmode", v ? "none" : "text");
      input.placeholder = v ? o.placeholder || "tap the keys below" : placeholder;
      if (o.host) o.host.classList.toggle("kb-on", v);
      switchBtn.textContent = v ? "Use the phone’s keyboard" : "Use the on-screen keys";
    }
    useLayout(lay);
    useKeys(on);

    wrap.querySelectorAll("[data-kb-layout]").forEach((b) =>
      b.addEventListener("click", () => {
        useLayout(b.getAttribute("data-kb-layout"));
        NI.store.setIntro("krLayout", lay);
      })
    );
    switchBtn.addEventListener("click", () => {
      useKeys(!on);
      NI.store.setIntro("krKeys", on);
      if (on) input.blur();
      else if (!input.disabled) input.focus();
    });

    function press(k) {
      if (!on || input.disabled || !k) return;
      if (k === "enter") {
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        return;
      }
      input.value = k === "del" ? input.value.slice(0, -1) : input.value + k;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // A key answers as the finger touches it; the click after a tap is skipped,
    // but a click with no tap before it (keyboard, switch access) still counts.
    let tapAt = 0;
    keysEl.addEventListener("pointerdown", (e) => {
      const b = e.target.closest("[data-k]");
      if (!b) return;
      e.preventDefault();
      tapAt = Date.now();
      b.classList.add("down");
      setTimeout(() => b.classList.remove("down"), 120);
      press(b.getAttribute("data-k"));
    });
    keysEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]");
      if (b && Date.now() - tapAt > 800) press(b.getAttribute("data-k"));
    });
    // A real keyboard (a tablet's, say) still types while the box is read-only.
    function onKey(e) {
      if (!input.isConnected) return doc.removeEventListener("keydown", onKey);
      if (!on || input.disabled || e.altKey || e.ctrlKey || e.metaKey) return;
      if (!o.global && doc.activeElement !== input) return;
      const k = /^[a-z]$/i.test(e.key) ? e.key.toLowerCase() : e.key === "Backspace" ? "del" : o.kana && (e.key === "-" || e.key === "'") ? e.key : null;
      if (!k) return;
      e.preventDefault();
      press(k);
    }
    doc.addEventListener("keydown", onKey);

    return {
      get on() {
        return on;
      },
      destroy() {
        doc.removeEventListener("keydown", onKey);
        wrap.remove();
      },
    };
  }

  NI.keys = { attach, LAYOUTS, touch };
})(typeof window !== "undefined" ? window : globalThis);
