/* Stroke order: animated diagrams of how each kana is written, and a writing
   pad that checks every stroke as it is drawn: its shape, its direction and
   its place in the order. Strokes come from KanjiVG, on a 109 × 109 grid
   (js/data/strokes.js). */
(function (root) {
  "use strict";
  const NI = root.NI;
  const SVGNS = "http://www.w3.org/2000/svg";
  const N = 32; // points compared along each stroke

  const paths = (ch) => (NI.data.strokes && NI.data.strokes[ch]) || [];
  const has = (ch) => paths(ch).length > 0;
  const reduced = () => !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // ---------------------------------------------------------------------------
  // Geometry

  // Evenly spaced points along a stroke, measured by the browser's own path geometry.
  let probe = null;
  const cache = new Map();
  function sample(d) {
    if (cache.has(d)) return cache.get(d);
    if (!probe) {
      const svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden";
      probe = document.createElementNS(SVGNS, "path");
      svg.appendChild(probe);
      document.body.appendChild(svg);
    }
    probe.setAttribute("d", d);
    const len = probe.getTotalLength();
    const pts = [];
    for (let i = 0; i < N; i++) {
      const p = probe.getPointAtLength((len * i) / (N - 1));
      pts.push([p.x, p.y]);
    }
    const out = { pts, len };
    cache.set(d, out);
    return out;
  }

  // The same for a drawn line: N points spaced evenly along it.
  function resample(raw) {
    const cum = [0];
    for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    const len = cum[cum.length - 1];
    const pts = [];
    let j = 0;
    for (let i = 0; i < N; i++) {
      const at = (len * i) / (N - 1);
      while (j < raw.length - 2 && cum[j + 1] < at) j++;
      const seg = cum[j + 1] - cum[j] || 1;
      const t = raw.length > 1 ? Math.min(1, Math.max(0, (at - cum[j]) / seg)) : 0;
      const a = raw[j];
      const b = raw[Math.min(j + 1, raw.length - 1)];
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return { pts, len };
  }

  function apart(a, b, reverse) {
    let s = 0;
    for (let i = 0; i < N; i++) {
      const q = b[reverse ? N - 1 - i : i];
      s += Math.hypot(a[i][0] - q[0], a[i][1] - q[1]);
    }
    return s / N;
  }

  /* Checks a drawn line against stroke k of ch. Without a guide to trace,
     some drift in size and position is allowed. Returns { ok } or
     { ok: false, why: "direction" | "order" | "shape", later }. */
  function judge(ch, k, raw, loose) {
    const all = paths(ch);
    const user = resample(raw);
    const want = sample(all[k]);
    const tol = loose ? 17 : 13;
    const d = apart(user.pts, want.pts);
    const back = apart(user.pts, want.pts, true);
    // On short strokes the shape alone can't tell the direction; the ends can.
    const gap = (rev) => {
      const [s, e] = rev ? [want.pts[N - 1], want.pts[0]] : [want.pts[0], want.pts[N - 1]];
      return Math.hypot(user.pts[0][0] - s[0], user.pts[0][1] - s[1]) + Math.hypot(user.pts[N - 1][0] - e[0], user.pts[N - 1][1] - e[1]);
    };
    const flipped = want.len > 12 && user.len > 6 && gap(true) < gap(false) * 0.5;
    if (!flipped && (d <= tol * 0.6 || (d <= tol && user.len >= want.len * 0.4))) return { ok: true, d };
    if (flipped && Math.min(d, back) <= tol) return { ok: false, why: "direction", d };
    for (let j = k + 1; j < all.length; j++) if (apart(user.pts, sample(all[j]).pts) <= tol * 0.8) return { ok: false, why: "order", later: j, d };
    if (back <= tol) return { ok: false, why: "direction", d };
    return { ok: false, why: "shape", d };
  }

  // ---------------------------------------------------------------------------
  // Drawing

  function el(name, attrs, parent) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Draws a path in over ms milliseconds; resolves when it's done.
  function drawIn(p, ms) {
    if (!ms || reduced() || !p.animate) return Promise.resolve();
    const len = p.getTotalLength();
    p.style.strokeDasharray = len + " " + len;
    const a = p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, easing: "ease-in-out", fill: "both" });
    return a.finished.then(
      () => {
        p.style.strokeDasharray = "";
        a.cancel();
      },
      () => {}
    );
  }
  const strokeMs = (d) => Math.min(900, 260 + sample(d).len * 6);

  // A short arrow showing where a stroke starts and which way it goes.
  function arrowPath(d) {
    const { pts } = sample(d);
    const [x0, y0] = pts[0];
    let i = 1;
    while (i < N - 1 && Math.hypot(pts[i][0] - x0, pts[i][1] - y0) < 12) i++;
    const [x1, y1] = pts[i];
    const a = Math.atan2(y1 - y0, x1 - x0);
    const h = (s) => [x1 - 5 * Math.cos(a + s), y1 - 5 * Math.sin(a + s)].map((v) => v.toFixed(1)).join(",");
    return "M" + x0.toFixed(1) + "," + y0.toFixed(1) + "L" + x1.toFixed(1) + "," + y1.toFixed(1) + "M" + h(0.5) + "L" + x1.toFixed(1) + "," + y1.toFixed(1) + "L" + h(-0.5);
  }

  const CROSS = '<path class="s-cross" d="M54.5 6v97M6 54.5h97"/>';

  /* A stroke-order diagram for one character, as markup: the strokes and
     their numbers. animate() then writes it out stroke by stroke. */
  function diagram(ch, label) {
    const nums = (NI.data.strokeNums && NI.data.strokeNums[ch]) || [];
    return (
      '<svg class="s-diagram" viewBox="0 0 109 109" role="img" aria-label="' + NI.ui.esc(label || "How to write " + ch + ": " + paths(ch).length + " strokes") + '">' +
      CROSS +
      '<g class="s-ghost">' + paths(ch).map((d) => '<path d="' + d + '"/>').join("") + "</g>" +
      '<g class="s-ink">' + paths(ch).map((d, i) => '<path data-i="' + i + '" d="' + d + '"/>').join("") + "</g>" +
      '<g class="s-num">' + paths(ch).map((d, i) => '<text data-i="' + i + '" x="' + (nums[i * 2] || 0) + '" y="' + (nums[i * 2 + 1] || 0) + '">' + (i + 1) + "</text>").join("") + "</g>" +
      "</svg>"
    );
  }

  // Writes out every diagram inside host, one stroke after another.
  function animate(host) {
    let run = 0;
    const go = async () => {
      const my = ++run;
      const svgs = Array.from(host.querySelectorAll(".s-diagram"));
      const ink = svgs.flatMap((s) => Array.from(s.querySelectorAll(".s-ink path")));
      const nums = svgs.flatMap((s) => Array.from(s.querySelectorAll(".s-num text")));
      if (reduced()) return;
      ink.forEach((p) => (p.style.opacity = "0"));
      nums.forEach((t) => (t.style.opacity = "0"));
      for (let i = 0; i < ink.length; i++) {
        await new Promise((r) => setTimeout(r, i ? 140 : 250));
        if (my !== run || !ink[i].isConnected) return;
        ink[i].style.opacity = "";
        nums[i].style.opacity = "";
        await drawIn(ink[i], strokeMs(ink[i].getAttribute("d")));
      }
    };
    go();
    return { replay: go, stop: () => run++ };
  }

  /* A writing pad for one character, checking each stroke as it's drawn.
     opts: guide (show the character to trace), arrows (show where each
     stroke starts), loose (more drift allowed, for writing from memory),
     onStroke({ ok, why, k }), onDone({ mistakes }). */
  function pad(host, ch, opts) {
    const o = opts || {};
    const all = paths(ch);
    host.innerHTML =
      '<div class="sp" data-k="' + NI.ui.esc(ch) + '">' +
      '<div class="sp-bars" aria-hidden="true">' + all.map(() => "<span></span>").join("") + "</div>" +
      '<div class="sp-box"><svg class="sp-svg" viewBox="0 0 109 109" role="img" aria-label="Writing area: write the character here, stroke by stroke">' +
      CROSS + '<g class="sp-guide"></g><g class="sp-done"></g><g class="sp-hint"></g><g class="sp-live"></g></svg></div>' +
      '<p class="sp-msg small" aria-live="polite"></p></div>';
    const svg = host.querySelector(".sp-svg");
    const guide = svg.querySelector(".sp-guide");
    const done = svg.querySelector(".sp-done");
    const hintG = svg.querySelector(".sp-hint");
    const live = svg.querySelector(".sp-live");
    const bars = host.querySelectorAll(".sp-bars span");
    const msg = host.querySelector(".sp-msg");
    const state = { k: 0, mistakes: 0, tries: 0, finished: false };
    if (o.guide) all.forEach((d) => el("path", { d }, guide));

    const say = (t) => (msg.textContent = t || "");
    function mark() {
      bars.forEach((b, i) => {
        b.className = i < state.k ? "on" : i === state.k && !state.finished ? "now" : "";
      });
      hintG.innerHTML = "";
      if (o.arrows && state.k < all.length) {
        el("circle", { class: "sp-start", cx: sample(all[state.k]).pts[0][0], cy: sample(all[state.k]).pts[0][1], r: 3.2 }, hintG);
        el("path", { class: "sp-arrow", d: arrowPath(all[state.k]) }, hintG);
      }
    }

    function accept(animated) {
      const p = el("path", { d: all[state.k] }, done);
      drawIn(p, animated ? 380 : 0);
      state.k++;
      state.tries = 0;
      if (state.k >= all.length) {
        state.finished = true;
        mark();
        say(state.mistakes ? "Done." : "Perfect.");
        if (o.onDone) o.onDone({ mistakes: state.mistakes });
        return;
      }
      mark();
    }

    // Shows the next stroke being written, then lets it fade.
    function hint(count) {
      if (state.finished) return;
      if (count) state.mistakes++;
      hintG.innerHTML = "";
      const p = el("path", { class: "sp-show", d: all[state.k] }, hintG);
      el("circle", { class: "sp-start", cx: sample(all[state.k]).pts[0][0], cy: sample(all[state.k]).pts[0][1], r: 3.2 }, hintG);
      const k = state.k;
      drawIn(p, strokeMs(all[k]) + 200).then(() =>
        setTimeout(() => {
          if (state.k === k && !state.finished) mark();
        }, o.guide ? 900 : 1300)
      );
    }

    // Pointer input, in grid units.
    let pts = null;
    let line = null;
    let rect = null;
    let pid = null;
    const at = (e) => [((e.clientX - rect.left) * 109) / rect.width, ((e.clientY - rect.top) * 109) / rect.height];
    svg.addEventListener("pointerdown", (e) => {
      if (state.finished || pid !== null) return;
      e.preventDefault();
      pid = e.pointerId;
      try {
        svg.setPointerCapture(pid);
      } catch (err) {
        /* capture isn't essential */
      }
      rect = svg.getBoundingClientRect();
      pts = [at(e)];
      line = el("polyline", { points: pts[0].join(",") }, live);
    });
    svg.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pid || !pts) return;
      const p = at(e);
      const last = pts[pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.8) return;
      pts.push(p);
      line.setAttribute("points", pts.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" "));
    });
    const up = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      const raw = pts;
      const drawn = line;
      pts = null;
      line = null;
      if (!raw || state.finished) return drawn && drawn.remove();
      const res = judge(ch, state.k, raw, o.loose);
      if (res.ok) {
        drawn.remove();
        say("");
        const k = state.k;
        accept(false);
        if (o.onStroke) o.onStroke({ ok: true, k });
        return;
      }
      drawn.classList.add("bad");
      setTimeout(() => drawn.remove(), 650);
      state.mistakes++;
      state.tries++;
      if (o.onStroke) o.onStroke({ ok: false, why: res.why, k: state.k });
      if (state.tries >= 3) {
        say("Here’s how that stroke goes. On to the next one.");
        return accept(true);
      }
      say(
        res.why === "direction"
          ? "Right line, other way round: start at the dot."
          : res.why === "order"
            ? "That’s stroke " + (res.later + 1) + ". Stroke " + (state.k + 1) + " comes first."
            : "Not quite. Watch stroke " + (state.k + 1) + ", then try again."
      );
      if (o.guide || state.tries >= 2 || res.why !== "shape") hint(false);
    };
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);

    mark();
    return {
      get mistakes() {
        return state.mistakes;
      },
      get finished() {
        return state.finished;
      },
      hint: () => hint(true),
      reset() {
        state.k = 0;
        state.mistakes = 0;
        state.tries = 0;
        state.finished = false;
        done.innerHTML = "";
        live.innerHTML = "";
        say("");
        mark();
      },
    };
  }

  NI.strokes = { has, count: (ch) => paths(ch).length, judge, sample, diagram, animate, pad };
})(typeof window !== "undefined" ? window : globalThis);
