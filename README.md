# BMO · Interactive Video Player

A little BMO that plays BMO stuff only. The player itself is BMO — pick a VHS tape from the shelf and it plays official Cartoon Network BMO clips, with CRT static transitions, synthesized chiptune + sound effects (all generated in-browser, no audio files), a blinking BMO face that follows your cursor, and a couple of hidden surprises (try typing `bmo`… or `football`).

## What's inside
- **9 tapes**: Best of BMO compilation, the cowboy LARP run (Me-Mow Returns, Cowboy LARP, Sandwich Showdown), the Football saga (Football Vs. BMO, Are You Ready For Some Football?, AMO Vs. BMO), and Distant Lands previews — all official Cartoon Network clips.
- **Boot sequence**: BMO powers on with a beemo-OS splash and a power-on chime.
- **Tape insert animation**: tapes fly into BMO's screen with a ka-chunk.
- **Real player chrome**: seekable progress bar, time display, volume slider (YouTube IFrame API).
- **Sleepy BMO**: leave him alone for 45 seconds and he dozes off — tap to wake him.
- **Up next** strip, **shuffle**, **music toggle** (generative chiptune), **fullscreen**, keyboard shortcuts (`?`), confetti celebrations, auto-advance.
- Respects `prefers-reduced-motion`; big touch targets for phones.

## Run it
- Easiest: open `index.html` in a browser (needs internet for the YouTube embeds).
- Or enable **GitHub Pages** in this repo's Settings → Pages (deploy from `main`), and it'll be live at `https://s6ggrpgrzf-droid.github.io/BMO/`.

## Files
- `index.html` — structure
- `style.css` — BMO console art, CRT effects, scene
- `player.js` — playlist, YouTube IFrame API, face, effects, easter eggs
- `audio.js` — WebAudio synth SFX + generative music loop

## Credits
Clips courtesy of Cartoon Network's official YouTube channel. Fan-made, not affiliated with Cartoon Network.
