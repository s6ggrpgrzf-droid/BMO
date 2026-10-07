/* BMO audio: tiny WebAudio synth — UI blips, tape chunk, static hiss,
   happy arpeggio, and a generative chiptune loop. All original. */
const BMOAudio = (() => {
  let ctx = null, master = null, sfxBus = null, musicBus = null;
  let musicOn = false, seqTimer = null, step = 0, nextTime = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
      return true;
    } catch (e) { return false; }
  }
  function unlock() {
    if (!ensure()) return false;
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  function tone({freq = 440, dur = 0.12, type = "square", vol = 0.5, when = 0, slide = 0, bus = null}) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noiseBurst({dur = 0.3, vol = 0.4, when = 0, hp = 800}) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t);
  }

  /* ---------- SFX vocabulary ---------- */
  const sfx = {
    click()  { if (!unlock()) return; tone({freq: 660, dur: .07, type: "square", vol: .25}); },
    back()   { if (!unlock()) return; tone({freq: 440, dur: .07, type: "square", vol: .25}); },
    chunk()  { if (!unlock()) return;           // tape insert ka-chunk
               noiseBurst({dur: .12, vol: .5, hp: 300});
               tone({freq: 140, dur: .16, type: "triangle", vol: .6, when: .05, slide: -60}); },
    static_(){ if (!unlock()) return;
               noiseBurst({dur: .4, vol: .35, hp: 1200}); },
    pop()    { if (!unlock()) return; tone({freq: 520, dur: .09, type: "sine", vol: .4, slide: 320}); },
    fanfare(){ if (!unlock()) return;           // little happy arpeggio
               [523, 659, 784, 1047].forEach((f, i) =>
                 tone({freq: f, dur: .16, type: "square", vol: .28, when: i * .09})); },
    bmo()    { if (!unlock()) return;           // easter-egg jingle
               [392, 523, 659, 784, 659, 784].forEach((f, i) =>
                 tone({freq: f, dur: .12, type: "triangle", vol: .35, when: i * .08})); },
  };

  /* ---------- generative chiptune ---------- */
  // C major pentatonic-ish cheerful loop, 16 steps, lead + soft bass. Original.
  const LEAD = [523, 587, 659, 784, 880, 784, 659, 587, 523, 659, 784, 880, 1047, 880, 784, 659];
  const BASS = [131, 0, 131, 0, 175, 0, 147, 0, 131, 0, 131, 0, 196, 0, 175, 147];
  const STEP_DUR = 0.21;

  function schedule() {
    if (!musicOn || !ctx) return;
    while (nextTime < ctx.currentTime + 0.35) {
      const i = step % 16, when = Math.max(0, nextTime - ctx.currentTime);
      if (LEAD[i]) tone({freq: LEAD[i], dur: .18, type: "square", vol: .16, when, bus: musicBus});
      if (BASS[i]) tone({freq: BASS[i], dur: .2, type: "triangle", vol: .3, when, bus: musicBus});
      if (i % 4 === 2) noiseBurst({dur: .03, vol: .05, when, hp: 5000});
      nextTime += STEP_DUR; step++;
    }
    seqTimer = setTimeout(schedule, 120);
  }
  function setMusic(on) {
    if (on && !unlock()) return false;
    musicOn = on;
    if (on) { step = 0; nextTime = ctx.currentTime + 0.06; schedule(); }
    else if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
    return true;
  }

  return { unlock, sfx, setMusic, isMusicOn: () => musicOn };
})();
