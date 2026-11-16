[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/tiars837/neon-orbit-defender/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/tiars837/neon-orbit-defender/reward.svg)](https://make.fun/bounty/best-game-01)

# Neon Orbit Defender

An original neon arena shooter for the make.fun **"Make the best game"**
(`best-game-01`) bounty. Hold the orbit: blast waves of enemy ships, chain
kills into combo multipliers, grab pickups, and survive as long as you can.
Three ships, endless waves, one high score to beat.

## How to play

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Fly the ship |
| Mouse | Aim |
| Click (hold) / Space | Fire |
| P or Esc | Pause / resume |
| M | Mute / unmute |
| R | Restart (from play or game over) |
| Enter / click | Start, and restart from game over |

**Rules:** enemies spawn at the edges in waves — drifters, darters, weavers,
splitters (which break into two drifters) and shooters that fire back.
Kills build a combo (up to x5) while you keep killing within 3 seconds.
Pickups: gold shards (+25 score, magnetised toward you), blue **S** shield
(absorbs hits), pink **R** rapid fire (8 s). Clearing a wave pays a bonus of
100 × wave. Lose all 3 ships and it's game over — your best score is kept
in `localStorage`.

**Sound:** everything is synthesised live with WebAudio (laser zaps,
explosions, pickup chimes, a quiet bass line). No audio files, no network.

## Run it

```sh
node serve.ts          # serves game/ at http://localhost:8080
```

Or open `game/index.html` directly — the game is plain static files with no
build step and no network request; every script lives under `game/`.

## Screenshots

`screenshots/` holds 4 real renders of the game's own code, taken in
headless Chromium at 1280×800 from the deterministic scenes in
`game/src/shots.js` (same seed every time):

1. `1-start.jpg` — title screen (`?shot=start&seed=7`)
2. `2-play.jpg` — wave 1 in progress, HUD + combo (`?shot=play&seed=7`)
3. `3-wave.jpg` — later wave, higher score (`?shot=wave&seed=7`)
4. `4-end.jpg` — game-over screen with final score and restart prompt (`?shot=end&seed=7`)

The scenes play the real simulation forward with a simple autopilot — no
mocked or hand-drawn frames.

## Structure

- `main.ts` — entry program (Node 22, stdlib only): copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json` via
  `vendor/makefun-game.ts` (the kit's file, unchanged).
- `game/index.html` — the page; canvas + one module script.
- `game/src/config.js` — tuning numbers and palette.
- `game/src/random.js` — seeded RNG (mulberry32).
- `game/src/input.js` — keyboard + mouse, mapped to arena coordinates.
- `game/src/audio.js` — synthesised WebAudio sounds and music.
- `game/src/world.js` — the whole simulation: player, 5 enemy types,
  bullets, pickups, particles, waves, score/combo.
- `game/src/render.js` — all canvas drawing: arena, ships, HUD, screens.
- `game/src/shots.js` — deterministic screenshot scenes + autopilot.
- `game/src/main.js` — boot, fixed-step loop, screen state machine.
- `serve.ts` — local static server for play-testing (not part of grading).
- `shots.json` — the four screenshot scenes and their URLs.

## Originality

All art is drawn in code (canvas shapes, gradients, particles), all sound is
synthesised, all names are original. No assets, libraries, or code are copied
from any commercial game. `vendor/makefun-game.ts` is the make.fun kit file,
copied unchanged as the rules require.

## Entry status (local only)

This folder is a **local build only**: no GitHub repository has been created,
nothing has been pushed, and nothing has been submitted to make.fun. To enter,
create a public repo for `tiars837` after the competition opened, push this,
bundle the agent transcripts with the kit CLI, and submit before the deadline
(19 Nov 2026 01:00 WIB). See `make.fun/r/wfjv7kgb` (referral invite from
@tidy-owl-11) for the competition page.

## License

MIT — see `LICENSE`.
