/* BMO player: tape shelf, YouTube IFrame API, BMO face, CRT static,
   confetti, speech bubble, easter eggs. */
(() => {
"use strict";

/* Verified official Cartoon Network / Adventure Time clips (2026-10-07). */
const TAPES = [
  { id: "UqRvCEnCKXo", short: "BEST OF BMO",    title: "Best of BMO 🤖🔥",        blurb: "The ultimate BMO compilation" },
  { id: "jbJkwOVm9K4", short: "ME-MOW RETURNS", title: "Me-Mow Returns",          blurb: "BMO's cowboy role-play" },
  { id: "3HvRYLWrHxE", short: "COWBOY LARP",    title: "BMO's Cowboy LARP",       blurb: "Live-action western time" },
  { id: "6kmxzrjqQc8", short: "SANDWICH SHOWDOWN", title: "Jake vs the Sentient Sandwiches", blurb: "Dead Goat Gulch showdown" },
  { id: "SpS2lc8GjKM", short: "LASSO LUNCH",    title: "BMO Lassos Lunch",        blurb: "Distant Lands preview" },
  { id: "XTuUoeNNrB8", short: "DISTANT LANDS",  title: "Distant Lands: BMO",      blurb: "BMO in space preview" },
  { id: "mWPkk8gvj3c", short: "FOOTBALL VS BMO", title: "Football Vs. BMO",       blurb: "Mirror alter-ego showdown" },
  { id: "rqWK3JDwD8g", short: "READY FOR FOOTBALL", title: "Are You Ready For Some Football?", blurb: "Football's big moment" },
  { id: "AI7Gi9UOiII", short: "AMO VS BMO",      title: "AMO Vs. BMO",             blurb: "Evil sibling AMO attacks" },
];
const QUOTES = [
  "Who wants to play video games?!",
  "I am a little living boy.",
  "BMO is a hero!",
  "Mathematical!",
  "Oh, Football…",
  "Time to play a tape!",
  "Be more!",
  "Let's play a game!",
  "Ooooh, shiny!",
];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id) => document.getElementById(id);
const screen = $("screen"), face = $("face"), shelf = $("shelf"),
      speech = $("speech"), speechText = $("speechText"),
      nowPlaying = $("nowPlaying"), bmo = $("bmo"),
      staticCv = $("static"), confettiLayer = $("confetti"),
      bootEl = $("boot"), transport = $("transport"),
      pbar = $("pbar"), pfill = $("pfill"), tCur = $("tCur"), tDur = $("tDur"),
      vol = $("vol"), upnextList = $("upnextList"), help = $("help");

let order = TAPES.map((_, i) => i);   // play order (shuffled or sequential)
let pos = -1;                          // position inside order
let yt = null, ytReady = false, fallbackMode = false, pendingTape = null;
let started = false, playing = false, shuffleOn = false;

/* ---------------- speech bubble ---------------- */
let quoteIdx = 0;
function say(text) {
  speechText.textContent = text;
  speech.classList.remove("pop"); void speech.offsetWidth;
  speech.classList.add("pop");
}
function sayQuote() {
  say("BMO says: “" + QUOTES[quoteIdx % QUOTES.length] + "”");
  quoteIdx++;
  BMOAudio.sfx.pop();
}

/* ---------------- tape shelf ---------------- */
const ACCENTS = ["#ffd75e","#ff8fb2","#7bc96f","#4a90d9","#c39bff","#ff9a5e","#5fd4c4","#f75f6e","#9fe8d2"];
function buildShelf() {
  TAPES.forEach((t, i) => {
    const b = document.createElement("div");
    b.className = "tape"; b.dataset.i = i;
    b.tabIndex = 0; b.setAttribute("role", "button");
    b.setAttribute("aria-label", "Play tape: " + t.title);
    b.style.setProperty("--accent", ACCENTS[i % ACCENTS.length]);
    b.innerHTML =
      '<span class="spine-tab">BMO·0' + (i + 1) + '</span>' +
      '<span class="label"><b>' + t.short + '</b><small>' + t.blurb + '</small><span class="stripes"></span></span>' +
      '<span class="window"><span class="tape-line"></span>' +
      '<span class="reel left"></span><span class="reel right"></span>' +
      '<span class="screws"><i></i><i></i><i></i><i></i></span></span>' +
      '<a class="watch-link" href="https://www.youtube.com/watch?v=' + t.id +
      '" target="_blank" rel="noopener">watch on YouTube ↗</a>';
    const play = () => { BMOAudio.unlock(); flyTape(b, i); };
    b.addEventListener("click", (e) => {
      if (e.target.closest(".watch-link")) return; // let the link work
      play();
    });
    b.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); }
    });
    shelf.appendChild(b);
  });
}
/* ---------------- tape fly-to-BMO ---------------- */
function flyTape(el, i) {
  wakeBMO();
  if (reduceMotion) { insertTape(i); return; }
  const r = el.getBoundingClientRect(), s = screen.getBoundingClientRect();
  const ghost = el.cloneNode(true);
  ghost.className = "tape tape-fly";
  Object.assign(ghost.style, {
    left: r.left + "px", top: r.top + "px",
    width: r.width + "px", height: r.height + "px",
  });
  document.body.appendChild(ghost);
  const dx = s.left + s.width / 2 - (r.left + r.width / 2);
  const dy = s.top + s.height / 2 - (r.top + r.height / 2);
  ghost.animate([
    { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
    { transform: `translate(${dx * 0.7}px,${dy * 0.7}px) scale(.6) rotate(-8deg)`, opacity: .9, offset: .7 },
    { transform: `translate(${dx}px,${dy}px) scale(.15) rotate(8deg)`, opacity: 0 },
  ], { duration: 480, easing: "cubic-bezier(.3,.7,.3,1)" }).onfinish = () => ghost.remove();
  setTimeout(() => insertTape(i), 380);
}
function markActive() {
  [...shelf.children].forEach((el) => {
    const active = pos >= 0 && order[pos] === +el.dataset.i;
    el.classList.toggle("active", active);
    el.classList.toggle("playing", active && playing);
  });
  renderUpNext();
}
function renderUpNext() {
  const items = [];
  for (let k = 1; k <= 3; k++) {
    const idx = order[(pos + k) % order.length];
    if (idx !== undefined && TAPES[idx]) items.push(TAPES[idx].short);
  }
  upnextList.textContent = items.length ? items.join("  ·  ") : "—";
}

/* ---------------- CRT static transition ---------------- */
const sctx = staticCv.getContext("2d");
let staticTimer = null;
function staticBurst(ms = 420) {
  staticCv.width = 160; staticCv.height = 90;
  staticCv.classList.add("on");
  clearInterval(staticTimer);
  staticTimer = setInterval(() => {
    const img = sctx.createImageData(160, 90), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255;
    }
    sctx.putImageData(img, 0, 0);
  }, 50);
  BMOAudio.sfx.static_();
  setTimeout(() => { clearInterval(staticTimer); staticCv.classList.remove("on"); }, ms);
}

/* ---------------- loading tapes ---------------- */
function insertTape(i) {
  const tape = TAPES[i];
  pos = order.indexOf(i); if (pos < 0) { order.push(i); pos = order.length - 1; }
  BMOAudio.sfx.chunk();
  setTimeout(() => staticBurst(), 120);
  setTimeout(() => {
    if (ytReady && yt) yt.loadVideoById(tape.id);
    else if (fallbackMode) mountFallback(tape.id);
    else pendingTape = tape.id;   // API still loading — onReady picks it up
    face.classList.add("hidden");
    screen.classList.add("playing");
    started = true; playing = true;
    if (!fallbackMode) transport.classList.remove("dim");
    pfill.style.width = "0%"; tCur.textContent = "0:00"; tDur.textContent = "0:00";
    say("Now playing: " + tape.title);
    nowPlaying.querySelector("span").textContent = "▶ " + tape.title;
    nowPlaying.classList.add("show");
    setTimeout(() => nowPlaying.classList.remove("show"), 4200);
    updatePlayBtn(); markActive();
  }, 320);
}
function mountFallback(id) {
  $("ytmount").innerHTML =
    '<iframe src="https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0" ' +
    'allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
}

/* ---------------- transport ---------------- */
function nextTape(auto) {
  if (!order.length) return;
  const n = (pos + 1 + order.length) % order.length;
  if (auto) say("Tape finished! Loading the next one…");
  insertTape(order[n < 0 ? 0 : n]);
}
function prevTape() {
  if (!started) { insertTape(order[0]); return; }
  insertTape(order[(pos - 1 + order.length) % order.length]);
}
function togglePlay() {
  BMOAudio.unlock();
  if (!started) { insertTape(order[0]); return; }
  if (fallbackMode) { say("Use the video controls to pause."); return; }
  if (!yt) return;
  if (playing) { yt.pauseVideo(); BMOAudio.sfx.back(); }
  else { yt.playVideo(); BMOAudio.sfx.click(); }
}
function updatePlayBtn() {
  $("btnPlay").textContent = playing ? "⏸" : "▶";
}
function toggleShuffle() {
  shuffleOn = !shuffleOn;
  const cur = pos >= 0 ? order[pos] : 0;
  if (shuffleOn) {
    order = TAPES.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    // keep current tape first so nothing jumps
    const k = order.indexOf(cur); [order[0], order[k]] = [order[k], order[0]];
  } else {
    order = TAPES.map((_, i) => i);
  }
  pos = order.indexOf(cur);
  $("btnShuffle").classList.toggle("on", shuffleOn);
  say(shuffleOn ? "Shuffle on! Chaos mode!" : "Shuffle off. Nice and tidy.");
  BMOAudio.sfx.click();
}

/* ---------------- YouTube IFrame API ---------------- */
window.onYouTubeIframeAPIReady = () => {
  yt = new YT.Player("ytmount", {
    width: "100%", height: "100%",
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
    events: {
      onReady: () => {
        ytReady = true;
        if (pendingTape) { yt.loadVideoById(pendingTape); pendingTape = null; }
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) {
          playing = true; screen.classList.add("playing");
          face.classList.add("hidden"); updatePlayBtn(); markActive();
        } else if (e.data === YT.PlayerState.PAUSED) {
          playing = false; updatePlayBtn(); markActive();
        } else if (e.data === YT.PlayerState.ENDED) {
          playing = false; updatePlayBtn(); markActive();
          celebrate();
          setTimeout(() => nextTape(true), 1800);
        }
      },
    },
  });
};
// If the API never loads (offline etc.), fall back to plain embeds.
setTimeout(() => {
  if (!ytReady) {
    fallbackMode = true;
    if (pendingTape) { mountFallback(pendingTape); pendingTape = null; }
  }
}, 7000);

/* ---------------- celebration ---------------- */
function celebrate() {
  BMOAudio.sfx.fanfare();
  say("Tape finished! That was great!");
  bmo.classList.remove("celebrate"); void bmo.offsetWidth;
  bmo.classList.add("celebrate");
  if (reduceMotion) return;
  const colors = ["#5fc3ae", "#ffd75e", "#ff8fb2", "#9fe8d2", "#fffdf4"];
  for (let i = 0; i < 46; i++) {
    const bit = document.createElement("div");
    bit.className = "confetti-bit";
    bit.style.background = colors[i % colors.length];
    bit.style.left = (35 + Math.random() * 30) + "vw";
    bit.style.top = "38vh";
    confettiLayer.appendChild(bit);
    const dx = (Math.random() - 0.5) * 560, dy = 200 + Math.random() * 420;
    bit.animate(
      [{ transform: "translate(0,0) rotate(0)", opacity: 1 },
       { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 }],
      { duration: 1100 + Math.random() * 900, easing: "cubic-bezier(.2,.7,.3,1)" }
    ).onfinish = () => bit.remove();
  }
}

/* ---------------- BMO face: blinking + look-at-cursor ---------------- */
function blinkLoop() {
  (function blink() {
    setTimeout(() => {
      if (!face.classList.contains("hidden")) {
        face.classList.add("blink");
        setTimeout(() => face.classList.remove("blink"), 160);
      }
      blink();
    }, 2400 + Math.random() * 3200);
  })();
}
if (!reduceMotion) {
  addEventListener("pointermove", (e) => {
    if (face.classList.contains("hidden")) return;
    const r = face.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    face.querySelectorAll(".eye").forEach((el) => {
      el.style.transform = `translate(${(dx * 8).toFixed(1)}px, ${(dy * 6).toFixed(1)}px)`;
    });
  }, { passive: true });
}

/* ---------------- fireflies ---------------- */
function fireflies() {
  if (reduceMotion) return;
  const cv = $("fireflies"), cx = cv.getContext("2d");
  let W, H, flies = [];
  function size() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    flies = Array.from({ length: 42 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 1 + Math.random() * 2.2, p: Math.random() * 6.28,
      s: 0.3 + Math.random() * 0.7,
    }));
  }
  size(); addEventListener("resize", size);
  (function tick(t) {
    cx.clearRect(0, 0, W, H);
    for (const f of flies) {
      f.p += 0.02 * f.s;
      const x = f.x + Math.sin(f.p * 0.7) * 30, y = f.y + Math.cos(f.p * 0.5) * 24;
      const a = 0.25 + 0.55 * Math.abs(Math.sin(f.p * 2));
      cx.beginPath(); cx.arc(x, y, f.r, 0, 6.29);
      cx.fillStyle = `rgba(190,255,220,${a.toFixed(2)})`; cx.fill();
    }
    requestAnimationFrame(tick);
  })();
}

/* ---------------- keyboard ---------------- */
let keys = "";
addEventListener("keydown", (e) => {
  if (e.target instanceof Element && e.target.matches("input,textarea")) return;
  const interactive = e.target instanceof Element &&
    !!e.target.closest("button, input, a, [role='button'], [role='slider']");
  if (e.key === "Escape" && !help.hidden) { toggleHelp(false); return; }
  if (e.code === "Space" && !interactive) { e.preventDefault(); togglePlay(); }
  else if (e.key === "ArrowRight" && !interactive) nextTape(false);
  else if (e.key === "ArrowLeft" && !interactive) prevTape();
  else if ((e.key === "m" || e.key === "M") && !interactive) toggleMusic();
  else if ((e.key === "f" || e.key === "F") && !interactive) toggleFull();
  else if (e.key === "?") toggleHelp();
  keys = (keys + e.key.toLowerCase()).slice(-8);
  if (keys.endsWith("bmo")) {
    BMOAudio.sfx.bmo();
    bmo.classList.remove("celebrate"); void bmo.offsetWidth;
    bmo.classList.add("celebrate");
    say("Mathematical!");
    keys = "";
  }
  if (keys.endsWith("football")) {
    face.querySelector(".mouth").classList.add("football");
    face.querySelector(".face-prompt").textContent = "BWO";
    face.classList.remove("hidden"); screen.classList.remove("playing");
    say("Oh, Football… I love you so much.");
    setTimeout(() => {
      face.querySelector(".mouth").classList.remove("football");
      face.querySelector(".face-prompt").textContent = "tap a tape below";
      if (started) face.classList.add("hidden");
    }, 6000);
    keys = "";
  }
});

/* ---------------- progress + seek + volume ---------------- */
function fmtTime(s) {
  s = Math.max(0, Math.floor(s || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
setInterval(() => {
  if (!ytReady || !yt || !started || fallbackMode) return;
  try {
    const cur = yt.getCurrentTime() || 0, dur = yt.getDuration() || 0;
    if (dur > 0) {
      const pct = (cur / dur) * 100;
      pfill.style.width = pct + "%";
      pbar.setAttribute("aria-valuenow", String(Math.round(pct)));
      tCur.textContent = fmtTime(cur); tDur.textContent = fmtTime(dur);
    }
  } catch (err) { /* player not ready yet */ }
}, 500);
function seekFromPoint(clientX) {
  if (!ytReady || !yt || fallbackMode || !started) return;
  const r = pbar.getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  try {
    yt.seekTo(frac * (yt.getDuration() || 0), true);
    BMOAudio.sfx.seek();
  } catch (err) {}
}
let volBlipT = 0;

/* ---------------- sleepy BMO ---------------- */
let lastActive = Date.now(), sleepy = false;
["pointerdown", "keydown", "touchstart"].forEach((ev) =>
  addEventListener(ev, () => {
    lastActive = Date.now();
    if (sleepy) wakeBMO();
  }, { passive: true }));
function wakeBMO() {
  if (!sleepy) return;
  sleepy = false;
  face.classList.remove("sleepy");
  BMOAudio.sfx.wake();
  say("I'm awake! Pick a tape!");
}
setInterval(() => {
  if (sleepy || started || face.classList.contains("hidden")) return;
  if (Date.now() - lastActive > 45000) {
    sleepy = true;
    face.classList.add("sleepy");
    if (!face.querySelector(".zzz")) {
      face.insertAdjacentHTML("beforeend",
        '<span class="zzz">z</span><span class="zzz z2">z</span><span class="zzz z3">z</span>');
    }
    BMOAudio.sfx.yawn();
    say("BMO is getting sleepy… tap to wake!");
  }
}, 5000);

/* ---------------- help ---------------- */
function toggleHelp(force) {
  const show = force !== undefined ? force : help.hidden;
  help.hidden = !show;
  if (show) BMOAudio.sfx.click();
}

/* ---------------- boot ---------------- */
function boot() {
  transport.classList.add("dim");
  renderUpNext();
  setTimeout(() => {
    bootEl.classList.add("done");
    say("Pick a tape! BMO plays BMO stuff only.");
    setTimeout(() => bootEl.remove(), 700);
  }, reduceMotion ? 300 : 1700);
}
// first tap anywhere = power-on chime (AudioContext needs a gesture)
addEventListener("pointerdown", function firstBoot() {
  removeEventListener("pointerdown", firstBoot);
  BMOAudio.sfx.boot();
}, { passive: true });

/* ---------------- buttons ---------------- */
function toggleMusic() {
  const on = BMOAudio.setMusic(!BMOAudio.isMusicOn());
  $("btnMusic").classList.toggle("on", BMOAudio.isMusicOn());
  $("btnMusic").setAttribute("aria-pressed", String(BMOAudio.isMusicOn()));
  say(BMOAudio.isMusicOn() ? "Music on! Beep boop!" : "Music off.");
  if (!on) BMOAudio.sfx.click();
}
function toggleFull() {
  BMOAudio.sfx.click();
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
function bind() {
  $("btnPrev").onclick = () => { BMOAudio.unlock(); prevTape(); };
  $("btnNext").onclick = () => { BMOAudio.unlock(); nextTape(false); };
  $("btnPlay").onclick = togglePlay;
  $("btnShuffle").onclick = toggleShuffle;
  $("btnMusic").onclick = toggleMusic;
  $("btnFull").onclick = toggleFull;
  $("btnQuote").onclick = sayQuote;
  $("btnHelp").onclick = () => toggleHelp();
  $("btnHelpClose").onclick = () => toggleHelp(false);
  help.addEventListener("click", (e) => { if (e.target === help) toggleHelp(false); });
  pbar.addEventListener("pointerdown", (e) => seekFromPoint(e.clientX));
  pbar.addEventListener("keydown", (e) => {
    if (!ytReady || !yt || fallbackMode || !started) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault(); e.stopPropagation();
      try {
        yt.seekTo((yt.getCurrentTime() || 0) + (e.key === "ArrowRight" ? 10 : -10), true);
        BMOAudio.sfx.seek();
      } catch (err) {}
    }
  });
  vol.addEventListener("input", () => {
    if (ytReady && yt && !fallbackMode) { try { yt.setVolume(+vol.value); } catch (err) {} }
    const now = Date.now();
    if (now - volBlipT > 140) { volBlipT = now; BMOAudio.sfx.volBlip(); }
  });
}

/* ---------------- go ---------------- */
buildShelf(); bind(); blinkLoop(); fireflies(); boot();
})();
