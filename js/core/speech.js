/* Audio through the browser's built-in speech synthesis (no recordings).
   Picks the best-sounding Japanese voice the device has: natural, enhanced
   and premium voices first, then online ones (good, but only with a
   connection), then the rest; offline, or when an online voice fails, an
   on-device one speaks instead. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  const synth = root.speechSynthesis;
  let voices = [];
  const listeners = [];

  function refresh() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^ja(-|_|$)/i.test(v.lang));
    for (const fn of listeners) fn(voices);
  }

  if (synth) {
    refresh();
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", refresh);
    else synth.onvoiceschanged = refresh;
  }

  // How good a voice is likely to sound, from what its name and kind say.
  function quality(v) {
    let q = 0;
    if (/natural|neural|premium|enhanced|wavenet|studio/i.test(v.name)) q += 100;
    if (v.localService === false) q += 30;
    if (/nanami|keita|o-?ren|kyoko|otoya|hattori|google/i.test(v.name)) q += 20;
    if (/compact|eloquence|espeak|novelty/i.test(v.name)) q -= 60;
    if (/^ja[-_]jp$/i.test(v.lang)) q += 5;
    return q;
  }
  const kind = (v) => (quality(v) >= 100 ? "natural" : v.localService === false ? "online" : "basic");
  const ranked = () => voices.slice().sort((a, b) => quality(b) - quality(a));
  // Online voices need a connection.
  const usable = (v) => v.localService !== false || !root.navigator || root.navigator.onLine !== false;

  function pickVoice() {
    const want = NI.store && NI.store.settings.voice;
    if (want) {
      const v = voices.find((x) => x.voiceURI === want);
      if (v && usable(v)) return v;
    }
    return ranked().find(usable) || voices[0] || null;
  }

  const speech = {
    supported: !!(synth && root.SpeechSynthesisUtterance),
    get voices() {
      return voices;
    },
    get hasVoice() {
      return voices.length > 0;
    },
    // Japanese voices, best first, each with what kind it is.
    get ranked() {
      return ranked().map((v) => ({ v, kind: kind(v) }));
    },
    // The voice "Automatic" uses on this device.
    get best() {
      const v = ranked().find(usable) || null;
      return v && { v, kind: kind(v) };
    },
    // Listening exercises need a real Japanese voice, not just any voice.
    get canListen() {
      return this.supported && voices.length > 0;
    },
    onVoices(fn) {
      listeners.push(fn);
    },
    /* Speaks Japanese text. opts.rate overrides the learner's speed setting;
       opts.pitch is used to give dialogue speakers different voices. */
    speak(text, opts) {
      if (!this.supported || !text) return false;
      const o = opts || {};
      const say = (v, retry) => {
        const u = new root.SpeechSynthesisUtterance(text);
        u.lang = "ja-JP";
        if (v) u.voice = v;
        u.rate = o.rate || (NI.store ? NI.store.settings.rate : 0.9) || 0.9;
        u.pitch = o.pitch || 1;
        if (o.onend) u.onend = o.onend;
        u.onerror = (e) => {
          // An online voice that fails (no connection, service down): an on-device voice instead.
          const local = retry && v && v.localService === false && !/interrupted|canceled/.test((e && e.error) || "") && ranked().find((x) => x.localService !== false);
          if (local) say(local, false);
          else if (o.onend) o.onend();
        };
        synth.speak(u);
      };
      try {
        synth.cancel();
        say(pickVoice(), true);
        return true;
      } catch (e) {
        return false;
      }
    },
    stop() {
      if (this.supported) synth.cancel();
    },
    // English, for hands-free listening (meaning after the Japanese).
    speakEn(text, opts) {
      if (!this.supported || !text) return false;
      const o = opts || {};
      try {
        synth.cancel();
        const u = new root.SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        const en = synth.getVoices().find((v) => /^en(-|_|$)/i.test(v.lang));
        if (en) u.voice = en;
        u.rate = 1;
        if (o.onend) {
          u.onend = o.onend;
          u.onerror = o.onend;
        }
        synth.speak(u);
        return true;
      } catch (e) {
        return false;
      }
    },
    /* Speech recognition (Chrome, Edge, Safari): listens once in Japanese and
       calls back with the possible transcripts, or with an error code.
       Browsers may send the audio to their speech service to transcribe it. */
    get canRecognize() {
      return !!(root.SpeechRecognition || root.webkitSpeechRecognition);
    },
    recognize(cb) {
      const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
      if (!SR) return cb({ error: "unsupported" }) || null;
      let done = false;
      const finish = (res) => {
        if (done) return;
        done = true;
        cb(res);
      };
      try {
        this.stop();
        const rec = new SR();
        rec.lang = "ja-JP";
        rec.interimResults = false;
        rec.maxAlternatives = 5;
        rec.onresult = (e) => {
          const r = e.results[0];
          const texts = [];
          for (let i = 0; i < r.length; i++) texts.push(r[i].transcript);
          finish({ texts });
        };
        rec.onerror = (e) => finish({ error: e.error || "error" });
        rec.onend = () => finish({ texts: [] });
        rec.start();
        return { stop: () => rec.stop() };
      } catch (e) {
        finish({ error: "error" });
        return null;
      }
    },
  };

  NI.speech = speech;
})(typeof window !== "undefined" ? window : globalThis);
