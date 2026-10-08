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
  { id: "6ogv_bhO738", short: "BMO NOIRE",       title: "BMO Noire 🕵️",          blurb: "BMO: sock detective" },
  { id: "yKI0itG8bCo", short: "BMO LOST",        title: "BMO Lost 🌲",            blurb: "BMO & Bubble's forest adventure" },
  { id: "hbgMScA70AI", short: "KETCHUP",         title: "Ketchup 🍅",             blurb: "BMO tells Marceline a story" },
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

/* ---------------- tiny storage ---------------- */
function storeGet(key, fb) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; }
  catch (e) { return fb; }
}
function storeSet(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
}
/* per-tape resume positions: { youtubeId: seconds } */
let progress = storeGet("bmo-progress-v1", {});
/* watched tapes: [youtubeId, ...] */
let watched = storeGet("bmo-watched-v1", []);
let lastProgSave = 0, pendingResume = 0, playStreakStart = 0;
/* BMO voice lines on/off */
let voiceOn = storeGet("bmo-voice-v1", true);
let voiceUnlocked = false;
addEventListener("pointerdown", () => {
  voiceUnlocked = true;
  try { speechSynthesis.getVoices(); } catch (e) {}
}, { passive: true, once: true });
function speak(text) {
  if (!voiceOn || !voiceUnlocked) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 1.6; u.rate = 1.05; u.volume = 0.9;
    const vs = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.startsWith("en"));
    if (vs.length) u.voice = vs.find((v) => /female|samantha|zira|google us english/i.test(v.name)) || vs[0];
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}

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
const ACCENTS = ["#ffd75e","#ff8fb2","#7bc96f","#4a90d9","#c39bff","#ff9a5e","#5fd4c4","#f75f6e","#9fe8d2","#8fd6ff","#ffb3c7","#d9f99d"];
function buildShelf() {
  TAPES.forEach((t, i) => {
    const b = document.createElement("div");
    b.className = "tape"; b.dataset.i = i;
    b.tabIndex = 0; b.setAttribute("role", "button");
    b.setAttribute("aria-label", "Play tape: " + t.title);
    b.style.setProperty("--accent", ACCENTS[i % ACCENTS.length]);
    b.innerHTML =
      '<span class="spine-tab">BMO·' + String(i + 1).padStart(2, "0") + '</span>' +
      '<span class="label"><b>' + t.short + '</b><small>' + t.blurb + '</small><span class="stripes"></span></span>' +
      '<span class="window"><span class="tape-line"></span>' +
      '<span class="reel left"></span><span class="reel right"></span>' +
      '<span class="screws"><i></i><i></i><i></i><i></i></span></span>' +
      '<a class="watch-link" href="https://www.youtube.com/watch?v=' + t.id +
      '" target="_blank" rel="noopener">watch on YouTube ↗</a>';
    const play = () => { BMOAudio.unlock(); carCenter(i); flyTape(b, i); };
    b.addEventListener("click", (e) => {
      if (e.target.closest(".watch-link")) return; // let the link work
      play();
    });
    b.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); }
    });
    const cell = document.createElement("div");
    cell.className = "car-cell";
    cell.appendChild(b);
    shelf.appendChild(cell);
  });
}

/* ---------------- tape carousel (cover flow) ---------------- */
const viewport = $("carViewport"), track = $("shelf"), dotsBox = $("carDots");
let carIndex = 0;
function cellW() {
  const cell = track.querySelector(".car-cell");
  // offsetWidth: layout width, unaffected by the scale/tilt transforms.
  // (getBoundingClientRect would measure the transformed width, which changes
  // with carIndex and made later tapes drift off-center.)
  return cell ? cell.offsetWidth + 16 : 212;
}
function layoutCarousel(animate = true) {
  const n = TAPES.length, cw = cellW(), vw = viewport.clientWidth;
  const x = vw / 2 - (carIndex * cw + cw / 2);
  if (!animate) track.classList.add("no-anim");
  track.style.transform = `translateX(${x}px)`;
  if (!animate) { void track.offsetWidth; track.classList.remove("no-anim"); }
  [...track.children].forEach((cell, i) => {
    const a = Math.min(Math.abs(i - carIndex), 2);
    cell.style.transform = `scale(${1 - a * 0.14})`;
    cell.style.opacity = `${1 - a * 0.28}`;
    cell.style.filter = `brightness(${1 - a * 0.18})`;
    cell.style.zIndex = `${10 - a}`;
  });
  [...dotsBox.children].forEach((d, i) => d.classList.toggle("on", i === carIndex));
}
function carCenter(i) { carIndex = ((i % TAPES.length) + TAPES.length) % TAPES.length; layoutCarousel(); }
function carGo(d) {
  carCenter(carIndex + d);
  BMOAudio.sfx.click();
}
function buildDots() {
  TAPES.forEach((t, i) => {
    const d = document.createElement("button");
    d.setAttribute("aria-label", "Go to tape " + (i + 1) + ": " + t.title);
    d.onclick = () => carGo(i - carIndex);
    dotsBox.appendChild(d);
  });
}
/* drag / swipe */
let dragX = null, dragBase = 0, dragMoved = false;
function trackX() {
  const m = /translateX\((-?\d+\.?\d*)px\)/.exec(track.style.transform || "");
  return m ? +m[1] : 0;
}
function bindCarousel() {
  $("carPrev").onclick = () => carGo(-1);
  $("carNext").onclick = () => carGo(1);
  viewport.addEventListener("pointerdown", (e) => {
    dragX = e.clientX; dragBase = trackX(); dragMoved = false;
    track.classList.add("dragging");
  });
  viewport.addEventListener("pointermove", (e) => {
    if (dragX === null) return;
    const dx = e.clientX - dragX;
    if (Math.abs(dx) > 10) dragMoved = true;
    track.style.transform = `translateX(${dragBase + dx}px)`;
  });
  const endDrag = (e) => {
    if (dragX === null) return;
    const dx = e.clientX - dragX;
    track.classList.remove("dragging");
    carCenter(carIndex - Math.round(dx / cellW()));
    dragX = null;
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  // a drag that becomes a swipe must not also trigger the tape's click
  viewport.addEventListener("click", (e) => {
    if (dragMoved) { e.stopPropagation(); e.preventDefault(); dragMoved = false; }
  }, true);
  addEventListener("resize", () => layoutCarousel(false));
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
  shelf.querySelectorAll(".tape").forEach((el) => {
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

/* ---------------- resume where you left off ---------------- */
const resumeBox = $("resume"), resumeList = $("resumeList");
function saveProgress(force) {
  if (!ytReady || !yt || fallbackMode || !started || !playing || pos < 0) return;
  const now = Date.now();
  if (!force && now - lastProgSave < 5000) return;
  lastProgSave = now;
  try {
    const cur = yt.getCurrentTime() || 0, dur = yt.getDuration() || 0;
    const tape = TAPES[order[pos]];
    if (tape && dur > 0 && cur > 8 && cur < dur - 12) {
      progress[tape.id] = Math.floor(cur);
      storeSet("bmo-progress-v1", progress);
    }
  } catch (e) {}
}
function clearProgress(id) {
  if (progress[id] !== undefined) { delete progress[id]; storeSet("bmo-progress-v1", progress); }
  renderResume();
}
function renderResume() {
  const items = Object.keys(progress)
    .map((id) => ({ tape: TAPES.find((t) => t.id === id), sec: progress[id] }))
    .filter((x) => x.tape && x.sec > 8);
  resumeBox.hidden = items.length === 0;
  resumeList.innerHTML = "";
  items.slice(0, 4).forEach(({ tape, sec }) => {
    const b = document.createElement("button");
    b.className = "resume-chip";
    b.innerHTML = "▶ <b>" + tape.short + "</b> · " + fmtTime(sec);
    b.setAttribute("aria-label", "Resume " + tape.title + " from " + fmtTime(sec));
    b.onclick = () => {
      BMOAudio.unlock();
      const i = TAPES.indexOf(tape);
      carCenter(i); flyTape(shelf.querySelector('.tape[data-i="' + i + '"]') || document.body, i);
    };
    resumeList.appendChild(b);
  });
}

/* ---------------- tape collection ---------------- */
const collGrid = $("collGrid"), collCount = $("collCount");
function markWatched(id) {
  if (!watched.includes(id)) {
    watched.push(id);
    storeSet("bmo-watched-v1", watched);
    renderCollection();
    const n = watched.length;
    if (n === TAPES.length) { say("Collection complete! You watched every tape!"); speak("Collection complete!"); }
    else say("Tape collected! " + n + " of " + TAPES.length + ".");
  }
}
function renderCollection() {
  collCount.textContent = watched.length + " / " + TAPES.length;
  collGrid.innerHTML = "";
  TAPES.forEach((t, i) => {
    const got = watched.includes(t.id);
    const c = document.createElement("div");
    c.className = "coll-cell" + (got ? " got" : "");
    c.style.setProperty("--accent", ACCENTS[i % ACCENTS.length]);
    c.innerHTML = got
      ? '<span class="coll-tab">BMO·' + String(i + 1).padStart(2, "0") + '</span><b>' + t.short + '</b>'
      : '<span class="coll-tab">???</span><b>???</b>';
    c.title = got ? t.title : "Watch a tape to unlock it";
    if (got) c.addEventListener("click", () => {
      BMOAudio.unlock(); carCenter(i);
      flyTape(shelf.querySelector('.tape[data-i="' + i + '"]') || document.body, i);
    });
    collGrid.appendChild(c);
  });
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
  lastInsert = Date.now();
  pendingResume = (!fallbackMode && progress[tape.id] > 8) ? progress[tape.id] : 0;
  setTimeout(() => staticBurst(), 120);
  setTimeout(() => {
    if (ytReady && yt) yt.loadVideoById(tape.id);
    else if (fallbackMode) mountFallback(tape.id);
    else pendingTape = tape.id;   // API still loading — onReady picks it up
    face.classList.add("hidden");
    face.classList.remove("sleepy");
    screen.classList.add("playing");
    started = true; playing = true;
    playStreakStart = Date.now();
    if (musReady && mus) { try { mus.pauseVideo(); } catch (err) {} } // no mixtape under a tape
    if (!fallbackMode) transport.classList.remove("dim");
    pfill.style.width = "0%"; tCur.textContent = "0:00"; tDur.textContent = "0:00";
    say(pendingResume ? "Resuming " + tape.title + " from " + fmtTime(pendingResume) + "…" : "Now playing: " + tape.title);
    speak("Ooooh! " + tape.short.toLowerCase() + "!");
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
  $("btnPlay").classList.toggle("is-pause", playing);
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
const MIXTAPE_ID = "I80gKfqy52Y"; // BMO's Mixtape — official WaterTower Music upload, real Niki Yang BMO vocals
let mus = null, musReady = false, musPlaying = false;
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
          if (!playStreakStart) playStreakStart = Date.now();
        } else if (e.data === YT.PlayerState.PAUSED) {
          playing = false; updatePlayBtn(); markActive();
          saveProgress(true);
          if (started && pos >= 0 && !document.hidden) {
            showReaction("happy", "Hmm?", null);
          }
        } else if (e.data === YT.PlayerState.ENDED) {
          playing = false; updatePlayBtn(); markActive();
          if (pos >= 0) {
            const tape = TAPES[order[pos]];
            if (tape) { clearProgress(tape.id); markWatched(tape.id); }
          }
          celebrate();
          speak("Yay!");
          setTimeout(() => nextTape(true), 1800);
        }
      },
    },
  });
  // hidden music channel: the real BMO mixtape
  mus = new YT.Player("musmount", {
    width: "2", height: "2", videoId: MIXTAPE_ID,
    playerVars: { rel: 0, playsinline: 1 },
    events: {
      onReady: () => {
        musReady = true;
        try { mus.setVolume(70); } catch (err) {}
      },
      onStateChange: (e) => {
        musPlaying = (e.data === YT.PlayerState.PLAYING);
        const on = musPlaying || BMOAudio.isMusicOn();
        $("btnMusic").classList.toggle("on", on);
        $("btnMusic").setAttribute("aria-pressed", String(on));
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

/* ---------------- BMO reacts to the video ---------------- */
const reactPop = $("reactPop");
const REACTIONS = [
  { face: "happy", text: "Hee hee!", sfx: "giggle" },
  { face: "gasp",  text: "Whoa!", sfx: "pop" },
  { face: "love",  text: "Ohh…", sfx: "pop" },
  { face: "happy", text: "Mathematical!", sfx: "giggle" },
  { face: "happy", text: "So shiny…", sfx: null },
  { face: "gasp",  text: "Did you see that?!", sfx: "pop" },
  { face: "love",  text: "BMO loves this part!", sfx: "giggle" },
];
let lastReact = 0, lastInsert = 0, reactTimer = null;
function showReaction(face, text, sfxName) {
  if (reduceMotion) { say(text); return; }
  reactPop.innerHTML =
    '<div class="rface ' + face + '"><span class="reye l"></span>' +
    '<span class="reye r"></span><span class="rmouth"></span></div>' +
    '<span class="rtext">' + text + "</span>";
  reactPop.classList.remove("show"); void reactPop.offsetWidth;
  reactPop.classList.add("show");
  if (sfxName && BMOAudio.sfx[sfxName]) BMOAudio.sfx[sfxName]();
  clearTimeout(reactTimer);
  reactTimer = setTimeout(() => reactPop.classList.remove("show"), 2600);
  lastReact = Date.now();
}
setInterval(() => {
  if (!playing || !started || document.hidden || fallbackMode) return;
  const now = Date.now();
  if (now - lastReact < 45000 || now - lastInsert < 25000) return;
  if (Math.random() < 0.55) {
    const r = REACTIONS[(Math.random() * REACTIONS.length) | 0];
    showReaction(r.face, r.text, r.sfx);
  } else lastReact = now;
}, 15000);

/* ---------------- tap-to-react: heart burst ---------------- */
function burstHearts() {
  BMOAudio.unlock();
  showReaction("love", "Hee hee!", "giggle");
  if (reduceMotion) return;
  const bits = ["♥", "★", "♥", "✦", "♥", "★"];
  for (let i = 0; i < 12; i++) {
    const bit = document.createElement("div");
    bit.className = "heart-bit";
    bit.textContent = bits[i % bits.length];
    bit.style.left = (42 + Math.random() * 16) + "%";
    bit.style.top = (38 + Math.random() * 14) + "%";
    bit.style.color = ["#ff8fb2", "#ffd75e", "#ff5d7e"][i % 3];
    confettiLayer.appendChild(bit);
    const dx = (Math.random() - 0.5) * 320, dy = -(120 + Math.random() * 260);
    bit.animate(
      [{ transform: "translate(0,0) scale(.6)", opacity: 0 },
       { transform: `translate(${dx * 0.4}px,${dy * 0.5}px) scale(1.3)`, opacity: 1, offset: 0.35 },
       { transform: `translate(${dx}px,${dy}px) scale(1)`, opacity: 0 }],
      { duration: 1100 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.3,1)" }
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

/* ---------------- living sky: mini-BMO floaties + shooting stars ---------------- */
function floaties() {
  if (reduceMotion) return;
  const box = $("floaties");
  for (let i = 0; i < 14; i++) {
    const f = document.createElement("div");
    f.className = "floatie";
    const s = 0.45 + Math.random() * 0.85;
    f.style.left = (Math.random() * 100) + "vw";
    f.style.width = Math.round(44 * s) + "px";
    f.style.height = Math.round(58 * s) + "px";
    f.style.opacity = (0.22 + Math.random() * 0.45).toFixed(2);
    f.style.animationDuration = (16 + Math.random() * 18).toFixed(1) + "s";
    f.style.animationDelay = (-Math.random() * 30).toFixed(1) + "s";
    box.appendChild(f);
  }
  (function shoot() {
    setTimeout(() => {
      if (!document.hidden) {
        const st = document.createElement("div");
        st.className = "shoot";
        st.style.top = (Math.random() * 32) + "vh";
        st.style.right = "-40px";
        box.appendChild(st);
        setTimeout(() => st.remove(), 1500);
      }
      shoot();
    }, 4500 + Math.random() * 6500);
  })();
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

/* ---------------- sleep timer ---------------- */
const SLEEP_STEPS = [0, 15, 30, 60];
let sleepIdx = 0, sleepEnd = 0;
const btnSleep = $("btnSleep"), sleepBadge = $("sleepBadge");
function cycleSleep() {
  sleepIdx = (sleepIdx + 1) % SLEEP_STEPS.length;
  const mins = SLEEP_STEPS[sleepIdx];
  sleepEnd = mins ? Date.now() + mins * 60000 : 0;
  btnSleep.classList.toggle("on", !!mins);
  sleepBadge.textContent = mins ? mins : "";
  btnSleep.setAttribute("aria-label", mins ? "Sleep timer: " + mins + " minutes" : "Sleep timer off");
  BMOAudio.sfx.click();
  say(mins ? "Sleep timer set: " + mins + " minutes. BMO will doze off." : "Sleep timer off.");
}
setInterval(() => {
  if (!sleepEnd) return;
  const left = Math.max(0, Math.round((sleepEnd - Date.now()) / 60000));
  sleepBadge.textContent = String(left || "<1");
  if (Date.now() >= sleepEnd) {
    sleepEnd = 0; sleepIdx = 0;
    btnSleep.classList.remove("on"); sleepBadge.textContent = "";
    if (ytReady && yt && !fallbackMode && playing) { try { yt.pauseVideo(); } catch (e) {} }
    face.classList.remove("hidden", "blink"); face.classList.add("sleepy");
    if (!face.querySelector(".zzz")) {
      face.insertAdjacentHTML("beforeend",
        '<span class="zzz">z</span><span class="zzz z2">z</span><span class="zzz z3">z</span>');
    }
    BMOAudio.sfx.yawn();
    say("Goodnight! 💤");
    speak("Goodnight!");
  }
}, 10000);

/* ---------------- VHS rewind / fast-forward FX ---------------- */
const rewindFx = $("rewindFx"), rewindLabel = $("rewindLabel");
let rewindTimer = null;
function vhsSeekFx(forward) {
  rewindLabel.textContent = forward ? "▶▶ FF" : "◀◀ REW";
  rewindFx.classList.remove("on"); void rewindFx.offsetWidth;
  rewindFx.classList.add("on");
  staticBurst(260);
  if (forward) BMOAudio.sfx.ff(); else BMOAudio.sfx.rew();
  clearTimeout(rewindTimer);
  rewindTimer = setTimeout(() => rewindFx.classList.remove("on"), 900);
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
  else if ((e.key === "v" || e.key === "V") && !interactive) toggleVoice();
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
      // pending resume: seek once the duration is known
      if (pendingResume && cur < pendingResume - 2) {
        yt.seekTo(pendingResume, true);
        pendingResume = 0;
      } else if (pendingResume) pendingResume = 0;
      // watched: 60 continuous seconds counts too
      if (playing && playStreakStart && Date.now() - playStreakStart > 60000 && pos >= 0) {
        const tape = TAPES[order[pos]];
        if (tape) markWatched(tape.id);
        playStreakStart = 0;
      }
    }
    saveProgress(false);
  } catch (err) { /* player not ready yet */ }
}, 500);
function seekFromPoint(clientX) {
  if (!ytReady || !yt || fallbackMode || !started) return;
  const r = pbar.getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  try {
    const cur = yt.getCurrentTime() || 0;
    const target = frac * (yt.getDuration() || 0);
    yt.seekTo(target, true);
    vhsSeekFx(target > cur);
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
  BMOAudio.unlock();
  if (musReady && mus) {
    // the real BMO: official WaterTower mixtape, streamed from their upload
    try {
      if (musPlaying) { mus.pauseVideo(); say("Mixtape paused."); }
      else { mus.playVideo(); say("BMO's Mixtape — the real BMO!"); }
    } catch (err) {}
  } else {
    // offline fallback: the synth loop
    BMOAudio.setMusic(!BMOAudio.isMusicOn());
    $("btnMusic").classList.toggle("on", BMOAudio.isMusicOn());
    $("btnMusic").setAttribute("aria-pressed", String(BMOAudio.isMusicOn()));
    say(BMOAudio.isMusicOn() ? "Music on! Beep boop!" : "Music off.");
  }
}
function toggleVoice() {
  voiceOn = !voiceOn;
  storeSet("bmo-voice-v1", voiceOn);
  $("btnVoice").classList.toggle("on", voiceOn);
  $("btnVoice").setAttribute("aria-pressed", String(voiceOn));
  BMOAudio.sfx.click();
  say(voiceOn ? "BMO voice on!" : "BMO voice off.");
  if (voiceOn) { voiceUnlocked = true; speak("Beep boop!"); }
  else { try { speechSynthesis.cancel(); } catch (e) {} }
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
  $("btnVoice").onclick = toggleVoice;
  $("btnSleep").onclick = cycleSleep;
  $("btnReact").onclick = burstHearts;
  $("btnVoice").classList.toggle("on", voiceOn);
  $("btnVoice").setAttribute("aria-pressed", String(voiceOn));
  help.addEventListener("click", (e) => { if (e.target === help) toggleHelp(false); });
  pbar.addEventListener("pointerdown", (e) => seekFromPoint(e.clientX));
  pbar.addEventListener("keydown", (e) => {
    if (!ytReady || !yt || fallbackMode || !started) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault(); e.stopPropagation();
      try {
        yt.seekTo((yt.getCurrentTime() || 0) + (e.key === "ArrowRight" ? 10 : -10), true);
        vhsSeekFx(e.key === "ArrowRight");
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
buildShelf(); buildDots(); bind(); bindCarousel(); blinkLoop(); fireflies(); floaties(); boot();
layoutCarousel(false);
renderResume(); renderCollection();
})();
