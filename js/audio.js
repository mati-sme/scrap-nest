/* Scrap Nest — WebAudio only */
'use strict';

const SFX = (() => {
  let ctx = null;
  let muted = false;
  let musicOn = true;
  let musicNodes = null;
  let musicTimer = null;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, when) {
    if (muted) return;
    const c = ac();
    const t0 = (when || 0) + c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.06, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain) {
    if (muted) return;
    const c = ac();
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1200;
    g.gain.value = gain || 0.08;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start();
  }

  return {
    unlock() { ac(); },
    setMute(m) { muted = !!m; if (muted) this.stopMusic(); else if (musicOn) this.startMusic(); },
    setMusic(on) { musicOn = !!on; if (!musicOn) this.stopMusic(); else if (!muted) this.startMusic(); },
    shred() { noise(0.05, 0.05); tone(180 + Math.random() * 80, 0.04, 'sawtooth', 0.03); },
    pop() { tone(520, 0.07, 'triangle', 0.07); tone(780, 0.05, 'square', 0.04, 0.04); },
    buy() { tone(440, 0.08, 'triangle', 0.07); tone(660, 0.1, 'triangle', 0.06, 0.07); },
    deny() { tone(120, 0.12, 'sawtooth', 0.05); },
    pet() { tone(600, 0.1, 'sine', 0.05); tone(900, 0.12, 'sine', 0.04, 0.08); },
    powerLow() { tone(200, 0.15, 'triangle', 0.05); },
    returnNest() { tone(330, 0.1, 'sine', 0.06); tone(440, 0.12, 'sine', 0.05, 0.1); tone(550, 0.15, 'sine', 0.04, 0.2); },
    prestige() {
      for (let i = 0; i < 5; i++) tone(300 + i * 80, 0.15, 'triangle', 0.05, i * 0.08);
    },
    startMusic() {
      if (muted || !musicOn) return;
      this.stopMusic();
      const c = ac();
      const master = c.createGain();
      master.gain.value = 0.028;
      master.connect(c.destination);
      const notes = [196, 233, 262, 294, 262, 233, 220, 196];
      let i = 0;
      const tick = () => {
        if (muted || !musicOn) return;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = notes[i % notes.length];
        g.gain.setValueAtTime(0.0001, c.currentTime);
        g.gain.linearRampToValueAtTime(1, c.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.55);
        o.connect(g); g.connect(master);
        o.start(); o.stop(c.currentTime + 0.6);
        i++;
        musicTimer = setTimeout(tick, 520);
      };
      musicNodes = master;
      tick();
    },
    stopMusic() {
      if (musicTimer) clearTimeout(musicTimer);
      musicTimer = null;
      musicNodes = null;
    },
  };
})();
