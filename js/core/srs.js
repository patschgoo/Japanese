/* Spaced repetition with expanding intervals (a Leitner-style box system).
   Each correct recall moves an item one stage up, so the gap before the next
   review grows: 4 hours → 1 day → 3 days → 1 week → 2 weeks → 1 month → 3 months → 6 months.
   "Again" drops it two stages and shows it again later in the same session.
   Stages are named after Japanese train types: words start on the local
   train and graduate to the shinkansen. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  const { HOUR, DAY } = NI.util;

  const INTERVALS = [0, 4 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 90 * DAY, 180 * DAY];
  const MAX = INTERVALS.length - 1;

  const TIERS = [
    { id: "local", ja: "各停", kana: "かくてい", en: "Local", stages: [1, 2], parts: [["{各|かく}", "each"], ["{停|てい}", "stop (it stops at each station)"]] },
    { id: "rapid", ja: "快速", kana: "かいそく", en: "Rapid", stages: [3, 4], parts: [["{快|かい}", "brisk"], ["{速|そく}", "speed"]] },
    { id: "express", ja: "急行", kana: "きゅうこう", en: "Express", stages: [5, 6], parts: [["{急|きゅう}", "hurry"], ["{行|こう}", "go"]] },
    { id: "limited", ja: "特急", kana: "とっきゅう", en: "Limited express", stages: [7], parts: [["{特|とく}", "special (とく becomes とっ here)"], ["{急|きゅう}", "hurry"]] },
    { id: "shinkansen", ja: "新幹線", kana: "しんかんせん", en: "Shinkansen", stages: [8], parts: [["{新|しん}", "new"], ["{幹|かん}", "trunk, main"], ["{線|せん}", "line"]] },
  ];

  function tierOf(stage) {
    return TIERS.find((t) => t.stages.indexOf(stage) >= 0) || null;
  }

  function fresh(now) {
    return { st: 1, due: now + INTERVALS[1], n: 0, lapses: 0, last: now };
  }

  // grade: 0 = again, 2 = good, 3 = easy
  function next(state, grade, now) {
    const s = Object.assign({}, state);
    s.n = (s.n || 0) + 1;
    s.last = now;
    if (grade === 0) {
      s.lapses = (s.lapses || 0) + 1;
      s.st = Math.max(1, s.st - 2);
      s.due = now + 10 * 60 * 1000;
    } else {
      s.st = Math.min(MAX, s.st + (grade === 3 ? 2 : 1));
      s.due = now + INTERVALS[s.st];
    }
    return s;
  }

  // What each button would do, for the labels under the grade buttons.
  function preview(state, now) {
    return {
      0: 10 * 60 * 1000,
      2: next(state, 2, now).due - now,
      3: next(state, 3, now).due - now,
    };
  }

  function dueIds(srs, now) {
    return Object.keys(srs)
      .filter((id) => srs[id].due <= now)
      .sort((a, b) => srs[a].due - srs[b].due);
  }

  function nextDue(srs, now) {
    let best = Infinity;
    for (const id in srs) if (srs[id].due > now && srs[id].due < best) best = srs[id].due;
    return best === Infinity ? null : best;
  }

  function countDueBy(srs, until) {
    let n = 0;
    for (const id in srs) if (srs[id].due <= until) n++;
    return n;
  }

  NI.srs = { INTERVALS, MAX, TIERS, tierOf, fresh, next, preview, dueIds, nextDue, countDueBy };
})(typeof window !== "undefined" ? window : globalThis);
