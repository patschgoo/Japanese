/* Audio through the browser's built-in speech synthesis (no recordings, no
   network). Picks a Japanese voice when the device has one. */
(function (root) {
  "use strict";
  const NI = (root.NI = root.NI || {});
  const synth = root.speechSynthesis;
  const PREFERRED = [/google.*日本語/i, /nanami/i, /kyoko/i, /o-ren/i, /otoya/i, /haruka/i, /ayumi/i, /keita/i, /ichiro/i, /japan/i];
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

  function pickVoice() {
    const want = NI.store && NI.store.settings.voice;
    if (want) {
      const v = voices.find((x) => x.voiceURI === want);
      if (v) return v;
    }
    for (const re of PREFERRED) {
      const v = voices.find((x) => re.test(x.name));
      if (v) return v;
    }
    return voices[0] || null;
  }

  const speech = {
    supported: !!(synth && root.SpeechSynthesisUtterance),
    get voices() {
      return voices;
    },
    get hasVoice() {
      return voices.length > 0;
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
      try {
        synth.cancel();
        const u = new root.SpeechSynthesisUtterance(text);
        u.lang = "ja-JP";
        const v = pickVoice();
        if (v) u.voice = v;
        u.rate = o.rate || (NI.store ? NI.store.settings.rate : 0.9) || 0.9;
        u.pitch = o.pitch || 1;
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
    stop() {
      if (this.supported) synth.cancel();
    },
  };

  NI.speech = speech;
})(typeof window !== "undefined" ? window : globalThis);
