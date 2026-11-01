/* Stories: short graded reads (extensive reading) that use only words taught
   up to their unit, with audio, shadowing, reading aids and a few questions. */
(function (root) {
  "use strict";
  const NI = root.NI;
  const ui = NI.ui;
  const esc = ui.esc;
  const U = NI.util;
  const pages = (NI.pages = NI.pages || {});

  const reached = () => {
    const step = NI.nextStep();
    return step ? step.u.n : 999;
  };

  pages.stories = {
    title: "Stories",
    nav: "tools",
    render() {
      const r = reached();
      const read = NI.store.state.stories;
      let html =
        '<header class="page-head"><p class="crumb"><a href="#more">More</a></p><h1>Stories<span class="sub">' + ui.jp("{物語|ものがたり}", { tokens: false }) + "</span></h1></header>" +
        '<p class="page-intro">Short graded stories with audio, written only with words you know. Reading lots of easy text builds fluency: don’t look everything up, just enjoy the story.</p>';
      if (!NI.course.stories.length) return html + '<p class="empty">No stories yet.</p>';
      html += '<ul class="story-list">';
      for (const st of NI.course.stories) {
        const line = NI.course.lines.find((l) => l.id === st.line);
        const open = st.unit <= r || st.unit <= Math.max(5, r);
        const away = st.unit - r;
        const first = (NI.furi.base(st.title).match(/[\u4e00-\u9faf]/) || [NI.furi.base(st.title).charAt(0)])[0];
        const chip = read[st.id]
          ? '<span class="pill ok">Read ✓ · shadow it again</span>'
          : open ? '<span class="pill now">New · ' + st.lines.length + " lines</span>"
          : away <= 5 ? '<span class="pill now">Unlocks at ' + esc(NI.course.code(st.unit)) + " · " + U.plural(away, "station") + " away</span>"
          : '<span class="pill">Unlocks at ' + esc(NI.course.code(st.unit)) + "</span>";
        html +=
          '<li class="story-item line-' + (line ? line.color : "h") + (read[st.id] ? " read" : "") + (open ? "" : " ahead") + '"><a href="#story-' + esc(st.id) + '">' +
          '<span class="st-cover" aria-hidden="true"><b lang="ja">' + esc(first) + "</b><small>" + esc(NI.course.code(st.unit)) + "</small></span>" +
          '<span class="st-text"><b>' + ui.jp(st.title, { tokens: false }) + "</b><span>" + esc(st.en) + "</span>" + chip + "</span>" +
          (read[st.id] ? '<span class="st-play" aria-hidden="true">' + ui.ICON.play + "</span>" : "") + "</a></li>";
      }
      return html + "</ul>";
    },
  };

  pages.story = {
    title(args) {
      const st = NI.course.story(args[0]);
      return st ? st.en : "Story";
    },
    nav: "tools",
    render(args) {
      const st = NI.course.story(args[0]);
      if (!st) return '<p class="empty">That story doesn’t exist. <a href="#stories">All stories</a></p>';
      const line = NI.course.lines.find((l) => l.id === st.line);
      const ahead = st.unit > reached();
      return (
        '<header class="page-head story-head line-' + (line ? line.color : "h") + '"><p class="eyebrow"><span class="line-badge" aria-hidden="true">' + esc(st.line) + "</span> Story · after " + esc(NI.course.code(st.unit)) + "</p>" +
        "<h1>" + ui.jp(st.title) + "</h1><p>" + esc(st.en) + "</p>" +
        (ahead ? '<p class="note">This story uses words up to ' + esc(NI.course.code(st.unit)) + ", which you haven’t reached yet. Turn on word meanings to read it now.</p>" : "") +
        "</header>" +
        NI.views.aids() +
        '<div class="dialogue story">' +
        '<div class="dlg-head"><div class="row wrap">' + NI.views.playerButtons() + '<button class="btn small ghost" type="button" data-dlg-en aria-pressed="true">Hide English</button></div></div>' +
        '<ol class="story-lines">' +
        st.lines.map((l, i) => '<li class="st-line" data-line="' + i + '"><div class="s-jp">' + ui.jp(l.jp) + '<span class="s-tools">' + ui.say(ui.sentenceAudio(l.jp)) + ui.breakdownBtn(l.jp, l.en) + '</span></div><p class="en">' + esc(l.en) + "</p></li>").join("") +
        "</ol></div>" +
        (st.q && st.q.length
          ? '<section class="u-sec story-q"><h2>Did you follow it?</h2>' +
            st.q
              .map((q, qi) => {
                const opts = NI.util.shuffle([q.a].concat(q.o), NI.util.rng(NI.util.hash(st.id + qi)));
                return '<div class="sq" data-q="' + qi + '"><p><b>' + esc(q.q) + '</b></p><div class="opts">' + opts.map((o) => '<button class="opt" type="button" data-ok="' + (o === q.a ? 1 : 0) + '"><span class="opt-body">' + (/[぀-ヿ一-鿿]/.test(o) ? ui.jp(o, { tokens: false }) : esc(o)) + "</span></button>").join("") + "</div></div>";
              })
              .join("") +
            "</section>"
          : "") +
        '<div class="row center wrap story-done"><button class="btn primary" type="button" data-done>I’ve read it</button><a class="btn ghost" href="#stories">All stories</a></div>'
      );
    },
    mount(el, args) {
      const st = NI.course.story(args[0]);
      if (!st) return;
      NI.views.bindAids(el);
      const box = el.querySelector(".story");
      NI.views.bindPlayer(box, () => st.lines.map((l, i) => ({ el: box.querySelector('[data-line="' + i + '"]'), text: ui.sentenceAudio(l.jp) })), NI.views.shadowDone);
      let right = 0;
      el.querySelectorAll(".sq").forEach((q) => {
        const btns = q.querySelectorAll(".opt");
        btns.forEach((b) =>
          b.addEventListener("click", () => {
            if (q.dataset.answered) return;
            q.dataset.answered = "1";
            const ok = b.getAttribute("data-ok") === "1";
            btns.forEach((x) => {
              x.disabled = true;
              if (x.getAttribute("data-ok") === "1") x.classList.add("right");
            });
            if (!ok) b.classList.add("wrong");
            if (ok) right++;
            NI.fx.play(ok ? "right" : "wrong");
          })
        );
      });
      el.querySelector("[data-done]").addEventListener("click", (e) => {
        const first = NI.store.markStory(st.id);
        const xp = (first ? NI.game.XP.story : 5) + right * 5;
        NI.fx.gain(xp);
        NI.fx.play("chime");
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = "Read ✓ +" + xp + " XP";
      });
    },
    unmount() {
      NI.views.stopPlayer();
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
