// Neon Orbit Defender — boot, game loop and screen state machine.
// Fixed-timestep simulation (STEP) with requestAnimationFrame rendering;
// the canvas is scaled to fit the window while the arena stays 1280x800.
import { ARENA, STEP } from './config.js';
import { World, EVENT_SHOOT, EVENT_HURT, EVENT_OVER, EVENT_WAVE } from './world.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '7', 10) || 7;

const world = new World(Number.isFinite(seed) ? seed : 7);
const input = new Input(canvas);
const sounds = new SoundBank();

let screen = SCREEN_TITLE;
let best = 0;
let isNewBest = false;
try {
  best = Number.parseInt(window.localStorage.getItem('neon-orbit-defender-best') || '0', 10) || 0;
} catch {
  best = 0;
}
world.state.best = best;

function saveBest() {
  try {
    window.localStorage.setItem('neon-orbit-defender-best', String(best));
  } catch {
    /* storage unavailable: best score just lives for this session */
  }
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}
window.addEventListener('resize', resize);
resize();

function fitCanvas() {
  const scale = Math.min(canvas.width / ARENA.width, canvas.height / ARENA.height);
  const offsetX = (canvas.width - ARENA.width * scale) / 2;
  const offsetY = (canvas.height - ARENA.height * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
}

function draw() {
  fitCanvas();
  render(ctx, world.state, screen, world.multiplier, best, isNewBest);
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function startGame() {
  sounds.ensure();
  sounds.click();
  sounds.musicOn = true;
  world.reset();
  world.state.best = best;
  isNewBest = false;
  screen = SCREEN_PLAY;
  announce('Game started. Wave 1. Good luck, pilot.');
}

function togglePause() {
  if (screen === SCREEN_PLAY) {
    screen = SCREEN_PAUSE;
    sounds.musicOn = false;
    announce('Paused.');
  } else if (screen === SCREEN_PAUSE) {
    screen = SCREEN_PLAY;
    sounds.musicOn = true;
    announce('Resumed.');
  }
}

function playSounds(events) {
  if (events & EVENT_SHOOT) sounds.shoot();
  if (events & EVENT_HURT) sounds.hurt();
  if (events & EVENT_WAVE) sounds.waveHorn();
  if (events & EVENT_OVER) {
    sounds.gameOver();
    sounds.musicOn = false;
  }
  const flags = world.drainSoundFlags();
  if (flags.kill) sounds.explode(false);
  if (flags.pickup) sounds.pickup();
  if (flags.powerup) sounds.powerup();
  if (flags.enemyShoot) sounds.enemyShoot();
}

function handleGameOver() {
  if (world.state.score > best) {
    best = world.state.score;
    isNewBest = true;
    saveBest();
  }
  screen = SCREEN_OVER;
  announce(`Game over. Final score ${world.state.score}. Press R or click to fly again.`);
}

// ---- Screenshot mode: stage one deterministic scene and draw it once. ----
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  if (screen === SCREEN_OVER && world.state.score > best) {
    best = world.state.score;
    isNewBest = true;
  }
  world.state.best = best;
  draw();
  // A screenshot harness may resize the viewport after load (device metrics
  // override); resizing a canvas clears it, so redraw on every resize.
  window.addEventListener('resize', () => {
    resize();
    draw();
  });
  document.title = `Neon Orbit Defender — ${shotName}`;
} else {
  // ---- Normal play: fixed-step loop. ----
  let last = performance.now();
  let accumulator = 0;
  let musicTimer = 0;
  let statusTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (input.consumePressed('KeyM')) {
      sounds.setMuted(!sounds.muted);
      announce(sounds.muted ? 'Sound muted.' : 'Sound on.');
    }

    if (screen === SCREEN_TITLE) {
      if (input.consumePressed('Enter') || input.consumePressed('Space') || input.consumeClick()) {
        startGame();
      }
      // Attract mode: the world drifts behind the title.
      world.step(STEP, { moveX: 0, moveY: 0, aimX: world.state.player.x, aimY: world.state.player.y - 100, firing: false });
    } else if (screen === SCREEN_PLAY) {
      if (input.consumePressed('KeyP') || input.consumePressed('Escape')) togglePause();
      if (screen === SCREEN_PLAY) {
        accumulator += elapsed;
        let guard = 0;
        while (accumulator >= STEP && guard < 5) {
          accumulator -= STEP;
          guard += 1;
          const move = input.moveVector();
          const events = world.step(STEP, {
            moveX: move.x,
            moveY: move.y,
            aimX: input.mouse.x,
            aimY: input.mouse.y,
            firing: input.firing,
          });
          playSounds(events);
          if (world.state.over) {
            handleGameOver();
            break;
          }
        }
        if (guard >= 5) accumulator = 0;
        musicTimer += elapsed;
        if (musicTimer >= 0.45) {
          musicTimer = 0;
          sounds.musicBeat();
        }
        statusTimer += elapsed;
        if (statusTimer >= 2) {
          statusTimer = 0;
          const s = world.state;
          announce(`Score ${s.score}, wave ${s.wave}, ${s.lives} ships left.`);
        }
      }
    } else if (screen === SCREEN_PAUSE) {
      if (input.consumePressed('KeyP') || input.consumePressed('Escape') || input.consumeClick()) togglePause();
    } else if (screen === SCREEN_OVER) {
      if (input.consumePressed('KeyR') || input.consumePressed('Enter') || input.consumeClick()) startGame();
    }
    if (input.consumePressed('KeyR') && screen === SCREEN_PLAY) startGame();

    draw();
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
